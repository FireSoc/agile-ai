import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Play, FlaskConical, AlertCircle } from 'lucide-react';
import { simulationsApi } from '../api/simulations';
import { SimulationTaskEditor } from '../components/ui/SimulationTaskEditor';
import { TimelineView } from '../components/ui/TimelineView';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Topbar } from '../components/layout/Topbar';
import { ApiError } from '../api/client';
import type {
  SimulationTaskInput,
  SimulationAssumptions,
  SimulationResponse,
  BranchScenarioRequest,
} from '../types';

// ─── Demo pre-fill ────────────────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export function Timeline() {
  const [tasks, setTasks] = useState<SimulationTaskInput[]>(DEMO_TASKS);
  const [customerDelay, setCustomerDelay] = useState(1);
  const [internalDelay, setInternalDelay] = useState(0.5);

  // Branch overlay
  const [branchDelay, setBranchDelay] = useState(3);
  const [showBranch, setShowBranch] = useState(false);

  const [baselineResult, setBaselineResult] = useState<SimulationResponse | null>(null);
  const [branchResult, setBranchResult] = useState<SimulationResponse | null>(null);

  const assumptions: SimulationAssumptions = {
    customer_delay_days: customerDelay,
    internal_delay_days: internalDelay,
  };

  const branchAssumptions: SimulationAssumptions = {
    customer_delay_days: branchDelay,
    internal_delay_days: internalDelay,
  };

  const compareMutation = useMutation({
    mutationFn: async () => {
      const branches: BranchScenarioRequest[] = showBranch
        ? [{ name: `slow-customer (${branchDelay}d)`, assumptions_override: branchAssumptions }]
        : [];

      if (branches.length === 0) {
        return simulationsApi.run({ customer_type: 'smb', tasks, assumptions });
      }

      return simulationsApi.compare({
        customer_type: 'smb',
        baseline_tasks: tasks,
        baseline_assumptions: assumptions,
        branches,
      });
    },
    onSuccess: (data) => {
      if ('baseline' in data) {
        setBaselineResult(data.baseline);
        setBranchResult(data.branches[0]?.result ?? null);
      } else {
        setBaselineResult(data);
        setBranchResult(null);
      }
    },
  });

  const errorMsg = compareMutation.isError
    ? compareMutation.error instanceof ApiError
      ? compareMutation.error.message
      : 'Simulation failed. Make sure the backend is running.'
    : null;

  return (
    <div>
      <Topbar
        action={
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={() => {
              setTasks(DEMO_TASKS);
              setCustomerDelay(1);
              setBaselineResult(null);
              setBranchResult(null);
            }}
          >
            <FlaskConical className="h-3.5 w-3.5" />
            Load Demo
          </button>
        }
      />

      <div className="px-6 py-6 space-y-5 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Deadline Timeline</h1>
          <p className="text-sm text-slate-500 mt-1">
            Visual risk-tagged milestone view for your workflow. Optionally overlay a branch
            scenario to see how deadline changes affect each task's risk.
          </p>
        </div>

        {/* Task editor */}
        <section className="card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">Workflow Tasks</h2>
          </div>
          <div className="px-5 py-5">
            <SimulationTaskEditor tasks={tasks} onChange={setTasks} />
          </div>
        </section>

        {/* Assumption + branch controls */}
        <section className="card px-5 py-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Assumptions</h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label htmlFor="tl-cust-delay" className="label text-xs">
                Customer delay (days)
              </label>
              <input
                id="tl-cust-delay"
                className="input text-sm"
                type="number"
                step={0.5}
                min={0}
                value={customerDelay}
                onChange={(e) => setCustomerDelay(Number(e.target.value))}
              />
            </div>
            <div>
              <label htmlFor="tl-int-delay" className="label text-xs">
                Internal delay (days)
              </label>
              <input
                id="tl-int-delay"
                className="input text-sm"
                type="number"
                step={0.5}
                min={0}
                value={internalDelay}
                onChange={(e) => setInternalDelay(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Branch overlay toggle */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                checked={showBranch}
                onChange={(e) => setShowBranch(e.target.checked)}
              />
              <span className="text-sm text-slate-700">Show branch overlay</span>
            </label>
            {showBranch && (
              <div className="flex items-center gap-2">
                <label htmlFor="branch-delay" className="text-xs text-slate-500 whitespace-nowrap">
                  Branch customer delay (days)
                </label>
                <input
                  id="branch-delay"
                  className="input text-xs py-1 w-16"
                  type="number"
                  step={0.5}
                  min={0}
                  value={branchDelay}
                  onChange={(e) => setBranchDelay(Number(e.target.value))}
                />
              </div>
            )}
          </div>
        </section>

        {/* Run button */}
        <button
          type="button"
          className="btn-primary"
          onClick={() => compareMutation.mutate()}
          disabled={compareMutation.isPending || tasks.length === 0}
        >
          {compareMutation.isPending ? (
            <LoadingSpinner size="sm" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Build Timeline
        </button>

        {/* Error */}
        {errorMsg && (
          <div
            className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Timeline output */}
        {baselineResult && (
          <section className="card px-5 py-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-4">
              Task Milestones
              {branchResult && showBranch && (
                <span className="ml-2 text-xs font-normal text-purple-600">
                  + branch overlay: slow-customer ({branchDelay}d)
                </span>
              )}
            </h2>
            <TimelineView
              baseline={baselineResult}
              branch={branchResult && showBranch ? { name: `slow-customer (${branchDelay}d)`, result: branchResult } : null}
            />
          </section>
        )}
      </div>
    </div>
  );
}
