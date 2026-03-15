import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Play,
  GitCompare,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  FlaskConical,
} from 'lucide-react';
import { simulationsApi } from '../api/simulations';
import { SimulationTaskEditor } from '../components/ui/SimulationTaskEditor';
import { SimulationResultPanel } from '../components/ui/SimulationResultPanel';
import { InboxPreview } from '../components/ui/InboxPreview';
import { BranchEditor, BranchComparePanel } from '../components/ui/BranchComparePanel';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Topbar } from '../components/layout/Topbar';
import type {
  SimulationTaskInput,
  SimulationAssumptions,
  BranchScenarioRequest,
  SimulationResponse,
  SimulationCompareResponse,
} from '../types';
import { ApiError } from '../api/client';

// ─── Pre-loaded demo scenario ─────────────────────────────────────────────────

const DEMO_TASKS: SimulationTaskInput[] = [
  {
    title: 'Intro Email',
    stage: 'kickoff',
    due_offset_days: 0,
    is_customer_required: false,
    requires_setup_data: false,
    criticality: 1,
    estimated_duration_days: 1,
    dependency_count: 0,
    integration_required: false,
    approval_layers: 0,
    delay_days: 0,
  },
  {
    title: 'Request Documents',
    stage: 'kickoff',
    due_offset_days: 3,
    is_customer_required: true,
    requires_setup_data: false,
    criticality: 4,
    estimated_duration_days: 1,
    dependency_count: 1,
    integration_required: false,
    approval_layers: 0,
    delay_days: 0,
  },
  {
    title: 'First Sales Pitch Meeting',
    stage: 'kickoff',
    due_offset_days: 5,
    is_customer_required: false,
    requires_setup_data: true,
    criticality: 4,
    estimated_duration_days: 1,
    dependency_count: 2,
    integration_required: false,
    approval_layers: 1,
    delay_days: 0,
  },
];

const DEMO_ASSUMPTIONS: SimulationAssumptions = {
  customer_delay_days: 1,
  internal_delay_days: 0.5,
};

// ─── Section accordion wrapper ────────────────────────────────────────────────

function Section({
  title,
  subtitle,
  defaultOpen = true,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="card overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-5 py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="text-left">
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-slate-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
        )}
      </button>
      {open && <div className="px-5 py-5">{children}</div>}
    </section>
  );
}

// ─── Assumption knobs ─────────────────────────────────────────────────────────

function AssumptionControls({
  assumptions,
  onChange,
}: {
  assumptions: SimulationAssumptions;
  onChange: (a: SimulationAssumptions) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
      <div>
        <label htmlFor="cust-delay" className="label">
          Customer delay (days)
        </label>
        <input
          id="cust-delay"
          className="input"
          type="number"
          step={0.5}
          min={0}
          value={assumptions.customer_delay_days ?? 1}
          onChange={(e) =>
            onChange({ ...assumptions, customer_delay_days: Number(e.target.value) })
          }
        />
        <p className="text-xs text-slate-500 mt-1">
          Expected days a customer-required task will slip past its deadline.
        </p>
      </div>
      <div>
        <label htmlFor="int-delay" className="label">
          Internal delay (days)
        </label>
        <input
          id="int-delay"
          className="input"
          type="number"
          step={0.5}
          min={0}
          value={assumptions.internal_delay_days ?? 0.5}
          onChange={(e) =>
            onChange({ ...assumptions, internal_delay_days: Number(e.target.value) })
          }
        />
        <p className="text-xs text-slate-500 mt-1">
          Expected slip for internal tasks.
        </p>
      </div>
    </div>
  );
}

// ─── Error display ────────────────────────────────────────────────────────────

function SimError({ message }: { message: string }) {
  return (
    <div
      className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      role="alert"
    >
      <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = 'single' | 'compare';

function Tabs({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
      {(['single', 'compare'] as Tab[]).map((t) => (
        <button
          key={t}
          type="button"
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 ${
            active === t
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => onChange(t)}
        >
          {t === 'single' ? 'Single Run' : 'Branch Compare'}
        </button>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function Simulator() {
  const [tab, setTab] = useState<Tab>('single');

  // Shared task/assumption state
  const [tasks, setTasks] = useState<SimulationTaskInput[]>(DEMO_TASKS);
  const [assumptions, setAssumptions] = useState<SimulationAssumptions>(DEMO_ASSUMPTIONS);

  // Branch compare state
  const [branches, setBranches] = useState<BranchScenarioRequest[]>([
    {
      name: 'slow-customer',
      assumptions_override: { customer_delay_days: 3 },
      task_overrides: [],
    },
  ]);

  // Results
  const [singleResult, setSingleResult] = useState<SimulationResponse | null>(null);
  const [compareResult, setCompareResult] = useState<SimulationCompareResponse | null>(null);
  const [activeInboxResult, setActiveInboxResult] = useState<SimulationResponse | null>(null);

  const singleMutation = useMutation({
    mutationFn: () =>
      simulationsApi.run({ customer_type: 'smb', tasks, assumptions }),
    onSuccess: (data) => {
      setSingleResult(data);
      setActiveInboxResult(data);
      setCompareResult(null);
    },
  });

  const compareMutation = useMutation({
    mutationFn: () =>
      simulationsApi.compare({
        customer_type: 'smb',
        baseline_tasks: tasks,
        baseline_assumptions: assumptions,
        branches,
      }),
    onSuccess: (data) => {
      setCompareResult(data);
      setActiveInboxResult(data.baseline);
      setSingleResult(null);
    },
  });

  const isPending = singleMutation.isPending || compareMutation.isPending;
  const errorMsg =
    singleMutation.isError || compareMutation.isError
      ? (singleMutation.error instanceof ApiError
          ? singleMutation.error.message
          : compareMutation.error instanceof ApiError
          ? compareMutation.error.message
          : 'Simulation failed. Make sure the backend is running.')
      : null;

  function loadDemo() {
    setTasks(DEMO_TASKS);
    setAssumptions(DEMO_ASSUMPTIONS);
    setSingleResult(null);
    setCompareResult(null);
    setActiveInboxResult(null);
  }

  return (
    <div>
      <Topbar
        action={
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={loadDemo}
          >
            <FlaskConical className="h-3.5 w-3.5" />
            Load Demo Scenario
          </button>
        }
      />

      <div className="px-6 py-6 space-y-5 max-w-7xl">

        {/* Intro */}
        <div className="card px-5 py-4 bg-slate-900 text-white">
          <h1 className="text-base font-semibold">Decision Sandbox</h1>
          <p className="text-sm text-slate-300 mt-1">
            Define your workflow tasks, set delay assumptions, and run a risk simulation — all
            without touching live customer data. Switch to <strong>Branch Compare</strong> to test
            what-if scenarios side by side.
          </p>
        </div>

        {/* Tasks section */}
        <Section
          title="Workflow Tasks"
          subtitle="Define the tasks in your workflow. Each task is scored independently."
        >
          <SimulationTaskEditor tasks={tasks} onChange={setTasks} />
        </Section>

        {/* Assumptions section */}
        <Section
          title="Scenario Assumptions"
          subtitle="Global delay parameters applied uniformly to all tasks."
          defaultOpen={false}
        >
          <AssumptionControls assumptions={assumptions} onChange={setAssumptions} />
        </Section>

        {/* Mode tabs + run button */}
        <div className="flex items-center gap-4 flex-wrap">
          <Tabs active={tab} onChange={setTab} />

          {tab === 'single' ? (
            <button
              type="button"
              className="btn-primary"
              onClick={() => singleMutation.mutate()}
              disabled={isPending || tasks.length === 0}
            >
              {singleMutation.isPending ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Run Simulation
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary"
              onClick={() => compareMutation.mutate()}
              disabled={isPending || tasks.length === 0 || branches.length === 0}
            >
              {compareMutation.isPending ? (
                <LoadingSpinner size="sm" />
              ) : (
                <GitCompare className="h-4 w-4" />
              )}
              Run Compare
            </button>
          )}

          {tasks.length === 0 && (
            <p className="text-xs text-amber-600">Add at least one task to run a simulation.</p>
          )}
        </div>

        {/* Error */}
        {errorMsg && <SimError message={errorMsg} />}

        {/* Branch editor (compare mode only) */}
        {tab === 'compare' && (
          <Section
            title="Scenario Branches"
            subtitle="Each branch overrides assumptions or task deadlines. All branches use the tasks defined above as baseline."
          >
            <BranchEditor
              branches={branches}
              baselineTasks={tasks}
              onChange={setBranches}
            />
          </Section>
        )}

        {/* Single run results */}
        {tab === 'single' && singleResult && (
          <>
            <Section title="Simulation Results" defaultOpen>
              <SimulationResultPanel result={singleResult} />
            </Section>
            {singleResult.inbox_preview && (
              <Section title="Virtual Inbox Preview" defaultOpen>
                <InboxPreview inbox={singleResult.inbox_preview} />
              </Section>
            )}
          </>
        )}

        {/* Compare results */}
        {tab === 'compare' && compareResult && (
          <>
            <Section title="Branch Comparison" defaultOpen>
              <BranchComparePanel compareResult={compareResult} />
            </Section>

            <Section
              title="Baseline Results"
              subtitle="Full simulation results for your baseline scenario."
              defaultOpen={false}
            >
              <SimulationResultPanel result={compareResult.baseline} />
            </Section>

            {compareResult.baseline.inbox_preview && (
              <Section title="Baseline Virtual Inbox" defaultOpen={false}>
                <InboxPreview inbox={compareResult.baseline.inbox_preview} />
              </Section>
            )}

            {compareResult.branches.map((branch) => (
              <Section
                key={branch.name}
                title={`Branch: ${branch.name} — Results`}
                defaultOpen={false}
              >
                <SimulationResultPanel result={branch.result} />
              </Section>
            ))}
          </>
        )}

        {/* Shared inbox when result available in either mode */}
        {!singleResult && !compareResult && activeInboxResult?.inbox_preview && (
          <Section title="Virtual Inbox Preview">
            <InboxPreview inbox={activeInboxResult.inbox_preview} />
          </Section>
        )}
      </div>
    </div>
  );
}
