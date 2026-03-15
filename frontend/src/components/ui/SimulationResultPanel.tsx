import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Info,
  Lightbulb,
  ArrowRight,
} from 'lucide-react';
import type { SimulationResponse, TaskAssessment, RiskBand } from '../../types';

// ─── Risk band styling ────────────────────────────────────────────────────────

const BAND_CONFIG: Record<
  RiskBand,
  { border: string; bg: string; text: string; badge: string; icon: React.ReactNode }
> = {
  Low: {
    border: 'border-emerald-200',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
    icon: <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden />,
  },
  Guarded: {
    border: 'border-blue-200',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-700 ring-1 ring-blue-200',
    icon: <Info className="h-4 w-4 text-blue-600" aria-hidden />,
  },
  Elevated: {
    border: 'border-amber-200',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
    icon: <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden />,
  },
  Critical: {
    border: 'border-red-200',
    bg: 'bg-red-50',
    text: 'text-red-700',
    badge: 'bg-red-100 text-red-700 ring-1 ring-red-200',
    icon: <ShieldAlert className="h-4 w-4 text-red-600" aria-hidden />,
  },
};

function RiskBadge({ band }: { band: RiskBand }) {
  const { badge, icon } = BAND_CONFIG[band];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${badge}`}>
      {icon}
      {band}
    </span>
  );
}

function ScoreBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
      <div
        className={`h-full rounded-full ${color} transition-all duration-500`}
        style={{ width: `${pct}%` }}
        role="presentation"
      />
    </div>
  );
}

// ─── Per-task assessment card ─────────────────────────────────────────────────

function TaskAssessmentCard({ assessment }: { assessment: TaskAssessment }) {
  const cfg = BAND_CONFIG[assessment.risk_band];

  return (
    <article
      className={`rounded-lg border p-4 ${cfg.border} ${cfg.bg} space-y-3`}
      aria-label={`${assessment.task_title} risk assessment`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{assessment.task_title}</p>
          <p className="text-xs text-slate-500 capitalize mt-0.5">
            {assessment.stage.replace('_', ' ')} stage
          </p>
        </div>
        <RiskBadge band={assessment.risk_band} />
      </div>

      {/* Score bars */}
      <div className="space-y-1.5">
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-0.5">
            <span>Risk</span>
            <span className={`font-semibold ${cfg.text}`}>{assessment.risk_score.toFixed(0)}/100</span>
          </div>
          <ScoreBar
            value={assessment.risk_score}
            color={
              assessment.risk_band === 'Critical'
                ? 'bg-red-500'
                : assessment.risk_band === 'Elevated'
                ? 'bg-amber-500'
                : assessment.risk_band === 'Guarded'
                ? 'bg-blue-500'
                : 'bg-emerald-500'
            }
          />
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-0.5">
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-0.5">
              <span>Urgency</span>
              <span>{assessment.urgency_score.toFixed(0)}</span>
            </div>
            <ScoreBar value={assessment.urgency_score} color="bg-purple-400" />
          </div>
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-0.5">
              <span>Criticality</span>
              <span>{assessment.criticality_score.toFixed(0)}</span>
            </div>
            <ScoreBar value={assessment.criticality_score} color="bg-indigo-400" />
          </div>
        </div>
        <div className="text-xs text-slate-400 flex items-center justify-between pt-0.5">
          <span>Action priority</span>
          <span className="font-medium text-slate-600">{assessment.action_priority_score.toFixed(0)}/100</span>
        </div>
      </div>

      {/* Top reasons */}
      {assessment.top_reasons.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Why this score</p>
          <ul className="space-y-1">
            {assessment.top_reasons.map((r, i) => (
              <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                <ArrowRight className="h-3 w-3 text-slate-400 flex-shrink-0 mt-0.5" aria-hidden />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Fallback */}
      <div className={`rounded-md px-3 py-2 text-xs border ${cfg.border}`}>
        <div className="flex items-center gap-1.5 mb-1">
          <Lightbulb className="h-3.5 w-3.5 text-amber-500" aria-hidden />
          <span className="font-semibold text-slate-700">Recommended action</span>
        </div>
        <p className="text-slate-600">{assessment.recommended_fallback}</p>
      </div>
    </article>
  );
}

// ─── Summary stat strip ───────────────────────────────────────────────────────

function SummaryStrip({ result }: { result: SimulationResponse }) {
  const bands: Record<RiskBand, number> = { Low: 0, Guarded: 0, Elevated: 0, Critical: 0 };
  result.task_assessments.forEach((a) => bands[a.risk_band]++);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {(['Critical', 'Elevated', 'Guarded', 'Low'] as RiskBand[]).map((band) => {
        const cfg = BAND_CONFIG[band];
        return (
          <div key={band} className={`rounded-lg border ${cfg.border} ${cfg.bg} px-4 py-3 text-center`}>
            <p className={`text-2xl font-bold ${cfg.text}`}>{bands[band]}</p>
            <p className={`text-xs font-medium mt-0.5 ${cfg.text}`}>{band}</p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Recommendations panel ────────────────────────────────────────────────────

function RecommendationsPanel({ recommendations }: { recommendations: string[] }) {
  if (recommendations.length === 0) return null;
  return (
    <section aria-labelledby="recs-heading">
      <h3 id="recs-heading" className="text-sm font-semibold text-slate-800 mb-2">
        Recommendations
      </h3>
      <ul className="space-y-2">
        {recommendations.map((rec, i) => (
          <li
            key={i}
            className="text-sm text-slate-700 flex items-start gap-2 bg-white rounded-lg border border-slate-200 px-4 py-3"
          >
            <span className="mt-0.5 flex-shrink-0 h-5 w-5 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center font-semibold">
              {i + 1}
            </span>
            {rec}
          </li>
        ))}
      </ul>
    </section>
  );
}

// ─── Main result panel ────────────────────────────────────────────────────────

interface Props {
  result: SimulationResponse;
}

export function SimulationResultPanel({ result }: Props) {
  return (
    <div className="space-y-6">
      {/* Summary banner */}
      <div
        className={`rounded-lg border px-4 py-3 text-sm font-medium ${
          result.at_risk
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}
        role="status"
      >
        <div className="flex items-start gap-2">
          {result.at_risk ? (
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden />
          ) : (
            <ShieldCheck className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden />
          )}
          <span>{result.summary}</span>
        </div>
      </div>

      {/* Timeline stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card px-4 py-3 text-center">
          <p className="text-2xl font-bold text-slate-900">{result.total_tasks}</p>
          <p className="text-xs text-slate-500 mt-0.5">Tasks</p>
        </div>
        <div className="card px-4 py-3 text-center">
          <p className="text-2xl font-bold text-slate-900">{result.projected_ttfv_days.toFixed(1)}</p>
          <p className="text-xs text-slate-500 mt-0.5">TTFV days</p>
        </div>
        <div className="card px-4 py-3 text-center">
          <p className="text-2xl font-bold text-slate-900">{result.projected_total_days.toFixed(1)}</p>
          <p className="text-xs text-slate-500 mt-0.5">Total days</p>
        </div>
        <div className="card px-4 py-3 text-center">
          <p className="text-2xl font-bold text-slate-900">{result.risk_signals.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">Risk signals</p>
        </div>
      </div>

      {/* Risk band breakdown */}
      {result.task_assessments.length > 0 && (
        <>
          <SummaryStrip result={result} />

          <section aria-labelledby="task-risk-heading">
            <h3 id="task-risk-heading" className="text-sm font-semibold text-slate-800 mb-3">
              Per-task risk assessments
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {result.task_assessments
                .slice()
                .sort((a, b) => b.action_priority_score - a.action_priority_score)
                .map((assessment) => (
                  <TaskAssessmentCard key={assessment.task_title} assessment={assessment} />
                ))}
            </div>
          </section>
        </>
      )}

      {/* Recommendations */}
      <RecommendationsPanel recommendations={result.recommendations} />
    </div>
  );
}
