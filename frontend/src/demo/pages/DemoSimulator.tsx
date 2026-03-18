import { useLayoutEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Play,
  GitCompare,
  AlertCircle,
  Sparkles,
  X,
  ListOrdered,
  RotateCcw,
  ChevronDown,
  Settings2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getDemoProjectBaseline,
  runDemoSimulationRequest,
  runDemoSimulationCompare,
  demoProjectsApi,
  demoQueryKeys,
} from '@/demo/demoApi';
import { SimulationResultPanel } from '@/components/ui/SimulationResultPanel';
import { BranchComparePanel, BranchEditor } from '@/components/ui/BranchComparePanel';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePageLayout } from '@/contexts/PageLayoutContext';
import { useDemo } from '@/demo/DemoProvider';
import type {
  SimulationAssumptions,
  SimulationResponse,
  SimulationCompareResponse,
  SimulationRecommendationsResponse,
  BranchScenarioRequest,
} from '@/types';

const DEFAULT_ASSUMPTIONS: SimulationAssumptions = {
  customer_delay_days: 1,
  internal_delay_days: 0.5,
};

const DEFAULT_BRANCHES: BranchScenarioRequest[] = [
  { name: 'Slow customer (3 day delay)', assumptions_override: { customer_delay_days: 3 }, task_overrides: [] },
];

const BRANCH_PRESETS: { label: string; branch: BranchScenarioRequest }[] = [
  { label: 'Slow customer', branch: { name: 'Slow customer (3 day delay)', assumptions_override: { customer_delay_days: 3 }, task_overrides: [] } },
  { label: 'Fast customer', branch: { name: 'Fast customer (0.5 day delay)', assumptions_override: { customer_delay_days: 0.5 }, task_overrides: [] } },
  { label: 'Delayed internal', branch: { name: 'Delayed internal (2 day slip)', assumptions_override: { internal_delay_days: 2 }, task_overrides: [] } },
];

function AssumptionControls({
  assumptions,
  onChange,
}: {
  assumptions: SimulationAssumptions;
  onChange: (a: SimulationAssumptions) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="demo-cust-delay">Customer delay (days)</Label>
        <Input
          id="demo-cust-delay"
          type="number"
          step={0.5}
          min={0}
          value={assumptions.customer_delay_days ?? 1}
          onChange={(e) =>
            onChange({ ...assumptions, customer_delay_days: Number(e.target.value) })
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="demo-int-delay">Internal delay (days)</Label>
        <Input
          id="demo-int-delay"
          type="number"
          step={0.5}
          min={0}
          value={assumptions.internal_delay_days ?? 0.5}
          onChange={(e) =>
            onChange({ ...assumptions, internal_delay_days: Number(e.target.value) })
          }
        />
      </div>
    </div>
  );
}

function SimError({ message }: { message: string }) {
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="flex items-start gap-2 pt-4">
        <AlertCircle className="size-4 shrink-0 mt-0.5 text-destructive" />
        <span className="text-sm text-destructive">{message}</span>
      </CardContent>
    </Card>
  );
}

type Tab = 'simulate' | 'compare';

export function DemoSimulator() {
  const { setPageLayout } = usePageLayout();
  const { markStepComplete } = useDemo();
  const [projectId, setProjectId] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>('simulate');
  const [assumptions, setAssumptions] = useState<SimulationAssumptions>(DEFAULT_ASSUMPTIONS);
  const [branches, setBranches] = useState<BranchScenarioRequest[]>(DEFAULT_BRANCHES);
  const [singleResult, setSingleResult] = useState<SimulationResponse | null>(null);
  const [compareResult, setCompareResult] = useState<SimulationCompareResponse | null>(null);
  const [lastRunAssumptions, setLastRunAssumptions] = useState<SimulationAssumptions | null>(null);
  const [compareTipDismissed, setCompareTipDismissed] = useState(false);

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: [...demoQueryKeys.projects],
    queryFn: () => demoProjectsApi.list(),
  });

  const { data: projectBaseline, isLoading: baselineLoading } = useQuery({
    queryKey: ['demo', 'project-baseline', projectId],
    queryFn: () => getDemoProjectBaseline(projectId!),
    enabled: tab === 'compare' && projectId != null,
  });

  const singleMutation = useMutation({
    mutationFn: async (pid: number) => {
      const baseline = await getDemoProjectBaseline(pid);
      return runDemoSimulationRequest({
        customer_type: baseline.customer_type,
        tasks: baseline.tasks,
        assumptions,
      });
    },
    onSuccess: (data) => {
      setSingleResult(data);
      setCompareResult(null);
      setLastRunAssumptions({ ...assumptions });
      // Double rAF so results DOM is committed before overlay switches to simulatorOutput and looks for simulator-results
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          markStepComplete('simulator');
        });
      });
    },
  });

  const compareMutation = useMutation({
    mutationFn: async (pid: number) => {
      const baseline = await getDemoProjectBaseline(pid);
      return runDemoSimulationCompare({
        customer_type: baseline.customer_type,
        baseline_tasks: baseline.tasks,
        baseline_assumptions: assumptions,
        branches: branches.length > 0 ? branches : DEFAULT_BRANCHES,
      });
    },
    onSuccess: (data) => {
      setCompareResult(data);
      setSingleResult(null);
      setLastRunAssumptions({ ...assumptions });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          markStepComplete('simulator');
        });
      });
    },
  });

  const isPending = singleMutation.isPending || compareMutation.isPending;
  const errorMsg =
    singleMutation.isError || compareMutation.isError
      ? (singleMutation.error instanceof Error ? singleMutation.error.message : compareMutation.error instanceof Error ? compareMutation.error.message : 'Simulation failed. Is the backend running?')
      : null;

  const selectedProject = projects.find((p) => p.id === projectId);
  const canRun = projectId != null && selectedProject != null;
  const hasResult = singleResult != null || compareResult != null;

  function handleProjectChange(newId: number | null) {
    setProjectId(newId);
    setSingleResult(null);
    setCompareResult(null);
    setLastRunAssumptions(null);
  }

  function handleTabChange(newTab: Tab) {
    setTab(newTab);
    if (newTab === 'compare' && branches.length === 0) setBranches(DEFAULT_BRANCHES);
  }

  function runSimulation() {
    if (tab === 'simulate' && projectId != null) singleMutation.mutate(projectId);
    if (tab === 'compare' && projectId != null) compareMutation.mutate(projectId);
  }

  function applyPreset(branch: BranchScenarioRequest) {
    setBranches((prev) => [...prev, { ...branch }]);
  }

  const seededRecommendations: SimulationRecommendationsResponse | null =
    singleResult != null
      ? { summary: singleResult.summary, recommendations: singleResult.recommendations ?? [] }
      : compareResult != null
        ? { summary: compareResult.overall_recommendation, recommendations: [] }
        : null;

  useLayoutEffect(() => {
    setPageLayout({
      title: 'Simulator',
      subtitle: 'Demo — run the full simulation lifecycle with demo projects (no login).',
      action: (
        <Button
          onClick={runSimulation}
          disabled={isPending || !canRun}
          className="gap-1.5"
          data-demo-target="simulator-run"
        >
          {isPending ? (
            <LoadingSpinner size="sm" />
          ) : tab === 'compare' ? (
            <GitCompare className="size-4" />
          ) : (
            <Play className="size-4" />
          )}
          {tab === 'compare' ? 'Run compare' : 'Run simulation'}
        </Button>
      ),
    });
  }, [setPageLayout, tab, canRun, isPending]);

  return (
    <PageContainer className="flex flex-col gap-6">
      <PageHeader
        title="Simulator"
        subtitle="Demo — run the full simulation lifecycle with demo projects (no login)."
        action={
          <Button
            onClick={runSimulation}
            disabled={isPending || !canRun}
            className="gap-1.5"
            data-demo-target="simulator-run"
          >
            {isPending ? (
              <LoadingSpinner size="sm" />
            ) : tab === 'compare' ? (
              <GitCompare className="size-4" />
            ) : (
              <Play className="size-4" />
            )}
            {tab === 'compare' ? 'Run compare' : 'Run simulation'}
          </Button>
        }
      />

      {hasResult && selectedProject && lastRunAssumptions && (
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
          <span className="font-medium text-foreground">
            Project: {selectedProject.name ?? `#${selectedProject.id}`}
          </span>
          <span className="text-muted-foreground">
            {tab === 'simulate' ? 'Single run' : 'Comparison'}
          </span>
          <span className="text-xs text-muted-foreground ml-auto">
            Assumptions: customer delay {lastRunAssumptions.customer_delay_days ?? 1}d · internal {lastRunAssumptions.internal_delay_days ?? 0.5}d
          </span>
        </div>
      )}

      <Card className="border-border">
        <CardContent className="py-3 px-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Label htmlFor="demo-sim-project" className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                Project
              </Label>
              {projectsLoading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Select
                  value={projectId != null ? String(projectId) : ''}
                  onValueChange={(v) => handleProjectChange(v === '' ? null : Number(v))}
                >
                  <SelectTrigger id="demo-sim-project" size="sm" className="min-w-[140px] max-w-[200px] w-full">
                    <SelectValue placeholder="— Select —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— Select —</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name ?? `#${p.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm" className="gap-1.5 h-8">
                    <Settings2 className="h-3.5 w-3.5" />
                    Assumptions ({assumptions.customer_delay_days ?? 1}d / {(assumptions.internal_delay_days ?? 0.5)}d)
                    <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                  </Button>
                }
              />
              <DropdownMenuContent align="start" className="w-72 p-4">
                <p className="text-xs font-medium text-muted-foreground mb-3">Delay assumptions</p>
                <AssumptionControls assumptions={assumptions} onChange={setAssumptions} />
              </DropdownMenuContent>
            </DropdownMenu>

            <Tabs value={tab} onValueChange={(v) => handleTabChange(v as Tab)}>
              <TabsList className="h-8 grid grid-cols-2">
                <TabsTrigger value="simulate" className="text-xs">Simulate</TabsTrigger>
                <TabsTrigger value="compare" className="text-xs">Compare</TabsTrigger>
              </TabsList>
            </Tabs>

            <Button
              size="sm"
              className="gap-1.5 h-8"
              onClick={runSimulation}
              disabled={isPending || !canRun || (tab === 'compare' && branches.length === 0)}
              data-demo-target="simulator-run"
            >
              {isPending ? (
                <LoadingSpinner size="sm" />
              ) : tab === 'compare' ? (
                <GitCompare className="size-4" />
              ) : (
                <Play className="size-4" />
              )}
              {tab === 'compare' ? 'Run compare' : 'Run simulation'}
            </Button>
          </div>

          {tab === 'compare' && (
            <div className="mt-4 pt-4 border-t border-border space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Branches ({branches.length})</span>
                <div className="flex flex-wrap gap-1.5">
                  {BRANCH_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => applyPreset(preset.branch)}
                      className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      + {preset.label}
                    </button>
                  ))}
                </div>
              </div>
              {baselineLoading && projectId != null ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <LoadingSpinner size="sm" />
                  Loading baseline…
                </div>
              ) : (
                <BranchEditor
                  branches={branches}
                  baselineTasks={projectBaseline?.tasks ?? []}
                  onChange={setBranches}
                />
              )}
              {branches.length === 0 && (
                <p className="text-xs text-amber-500">Add at least one branch to run a comparison.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="min-w-0 space-y-6">
        {!canRun && (
          <div className="rounded-lg border border-border bg-muted/20 px-4 py-5 space-y-2">
            <p className="text-sm font-medium text-foreground">Pick a demo project</p>
            <p className="text-sm text-muted-foreground">
              Select a project above to simulate its workflow with different delay assumptions.
              Use <strong className="text-foreground font-medium">Compare</strong> to test scenarios side-by-side.
            </p>
          </div>
        )}

        {errorMsg && <SimError message={errorMsg} />}

        {tab === 'simulate' && singleResult && !compareTipDismissed && (
          <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
            <ListOrdered className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-foreground flex-1">
              <strong>Tip:</strong> Switch to the{' '}
              <button
                type="button"
                onClick={() => handleTabChange('compare')}
                className="text-primary underline underline-offset-2 hover:no-underline font-medium"
              >
                Compare tab
              </button>{' '}
              to test different delay scenarios side-by-side.
            </p>
            <button
              type="button"
              onClick={() => setCompareTipDismissed(true)}
              className="text-muted-foreground hover:text-foreground shrink-0"
              aria-label="Dismiss tip"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {hasResult && canRun && (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={runSimulation} disabled={isPending} className="gap-1.5">
              {isPending ? <LoadingSpinner size="sm" /> : <RotateCcw className="h-3.5 w-3.5" />}
              Run again
            </Button>
          </div>
        )}

        {hasResult && (
          <div data-demo-target="simulator-results" className="space-y-6">
            {tab === 'simulate' && singleResult && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card className="xl:col-span-2">
                  <CardContent className="pt-3 px-0">
                    <div className="px-4">
                      <SectionHeader title="Results" description="Risk, timeline, and task breakdown from the simulation." />
                      <div className="mt-4">
                        <SimulationResultPanel result={singleResult} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-3 px-0">
                    <div className="px-4">
                      <SectionHeader
                        title="Recommendations"
                        description="Insights from the simulation."
                        action={<Sparkles className="size-4 text-primary" />}
                      />
                      <div className="mt-4 space-y-3">
                        {seededRecommendations?.recommendations?.length ? (
                          <ul className="space-y-2">
                            {seededRecommendations.recommendations.map((rec, i) => (
                              <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
                                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground">{seededRecommendations?.summary ?? singleResult.summary}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {tab === 'compare' && compareResult && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card className="xl:col-span-2">
                  <CardContent className="pt-3 px-0">
                    <div className="px-4">
                      <SectionHeader title="Scenario comparison" description="Baseline vs. your configured branches." />
                      <div className="mt-4">
                        <BranchComparePanel compareResult={compareResult} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-3 px-0">
                    <div className="px-4">
                      <SectionHeader title="Recommendation" description="Overall guidance from the comparison." />
                      <p className="mt-4 text-sm text-foreground">{compareResult.overall_recommendation}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-3 px-0">
                    <div className="px-4">
                      <SectionHeader title="Baseline results" description="Full simulation for baseline assumptions." />
                      <div className="mt-4">
                        <SimulationResultPanel result={compareResult.baseline} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
