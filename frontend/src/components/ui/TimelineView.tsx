import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Info,
  Circle,
} from 'lucide-react';
import type { SimulationResponse, TaskAssessment, RiskBand } from '../../types';

const BAND_CONFIG: Record<
  RiskBand,
  { dot: string; line: string; text: string; icon: React.ReactNode; label: string }
> = {
  Low: {
    dot: 'border-emerald-400 bg-emerald-50',
    line: 'bg-emerald-200',
    text: 'text-emerald-700',
    icon: <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />,
    label: 'Low',
  },
  Guarded: {
    dot: 'border-blue-400 bg-blue-50',
    line: 'bg-blue-200',
    text: 'text-blue-700',
    icon: <Info className="h-3.5 w-3.5 text-blue-600" />,
    label: 'Guarded',
  },
  Elevated: {
    dot: 'border-amber-400 bg-amber-50',
    line: 'bg-amber-200',
    text: 'text-amber-700',
    icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />,
    label: 'Elevated',
  },
  Critical: {
    dot: 'border-red-400 bg-red-50',
    line: 'bg-red-200',
    text: 'text-red-700',
    icon: <ShieldAlert className="h-3.5 w-3.5 text-red-600" />,
    label: 'Critical',
  },
};

interface TimelineItem {
  day: number;
  title: string;
  stage: string;
  assessment: TaskAssessment | null;
  branchDay?: number;      // comparison day from branch result
  branchName?: string;
}

interface Props {
  baseline: SimulationResponse;
  branch?: { name: string; result: SimulationResponse } | null;
}

function buildItems(
  baseline: SimulationResponse,
  branch?: { name: string; result: SimulationResponse } | null,
): TimelineItem[] {
  const branchAssessmentMap = new Map(
    (branch?.result.task_assessments ?? []).map((a) => [a.task_title, a]),
  );

  const baselineMap = new Map(
    baseline.task_assessments.map((a) => [a.task_title, a]),
  );

  // Merge tasks from baseline; use task_assessments as source of truth for ordering
  const items: TimelineItem[] = [];

  // We need due_offset_days which is on the request not the response — we derive
  // relative ordering from action_priority_score ordering and use projected_duration_days
  // as a proxy timeline. Sort by action_priority_score (urgent items first).
  const sorted = [...baseline.task_assessments].sort(
    (a, b) => a.urgency_score - b.urgency_score, // soonest first
  );

  sorted.forEach((a, idx) => {
    const branchA = branchAssessmentMap.get(a.task_title);
    items.push({
      day: idx + 1,   // ordinal position (1-based)
      title: a.task_title,
      stage: a.stage,
      assessment: baselineMap.get(a.task_title) ?? null,
      branchDay: branchA ? idx + 1 : undefined,
      branchName: branch?.name,
    });
  });

  return items;
}

function RiskChip({ band }: { band: RiskBand }) {
  const cfg = BAND_CONFIG[band];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border ${cfg.dot} ${cfg.text}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

export function TimelineView({ baseline, branch }: Props) {
  const items = buildItems(baseline, branch);

  if (items.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-8">
        Run a simulation to see the timeline.
      </p>
    );
  }

  return (
    <div>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-6 text-xs text-slate-500">
        {(Object.keys(BAND_CONFIG) as RiskBand[]).map((band) => (
          <span key={band} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full border-2 ${BAND_CONFIG[band].dot}`} />
            {band}
          </span>
        ))}
        {branch && (
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-5 rounded-full bg-purple-300 border border-purple-400" />
            {branch.name} (branch)
          </span>
        )}
      </div>

      {/* Timeline entries */}
      <ol className="relative" aria-label="Deadline timeline">
        {items.map((item, i) => {
          const cfg = item.assessment ? BAND_CONFIG[item.assessment.risk_band] : BAND_CONFIG.Low;
          const branchAssessment = branch?.result.task_assessments.find(
            (a) => a.task_title === item.title,
          );

          return (
            <li key={item.title} className="relative flex gap-4 pb-6 last:pb-0">
              {/* Vertical connector line */}
              {i < items.length - 1 && (
                <span
                  className={`absolute left-[11px] top-6 bottom-0 w-0.5 ${cfg.line}`}
                  aria-hidden
                />
              )}

              {/* Dot */}
              <span
                className={`flex-shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center z-10 ${cfg.dot}`}
                aria-hidden
              >
                <Circle className={`h-2 w-2 fill-current ${cfg.text}`} />
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{item.title}</p>
                    <p className="text-xs text-slate-400 capitalize mt-0.5">
                      {item.stage.replace('_', ' ')} stage
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {item.assessment && <RiskChip band={item.assessment.risk_band} />}
                    {branchAssessment && branchAssessment.risk_band !== item.assessment?.risk_band && (
                      <span className="text-xs text-purple-600 font-medium flex items-center gap-1">
                        → {branchAssessment.risk_band} in {item.branchName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Score summary */}
                {item.assessment && (
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>Risk: <strong className={cfg.text}>{item.assessment.risk_score.toFixed(0)}/100</strong></span>
                    <span>Urgency: <strong>{item.assessment.urgency_score.toFixed(0)}</strong></span>
                    <span>Priority: <strong>{item.assessment.action_priority_score.toFixed(0)}</strong></span>
                    {branchAssessment && (
                      <span className="text-purple-600">
                        {item.branchName} risk: <strong>{branchAssessment.risk_score.toFixed(0)}</strong>
                        {branchAssessment.risk_score < item.assessment.risk_score
                          ? ' ↓'
                          : branchAssessment.risk_score > item.assessment.risk_score
                          ? ' ↑'
                          : ''}
                      </span>
                    )}
                  </div>
                )}

                {/* Top reason */}
                {item.assessment?.top_reasons[0] && (
                  <p className="mt-1 text-xs text-slate-500 italic line-clamp-1">
                    {item.assessment.top_reasons[0]}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
