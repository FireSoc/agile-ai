import { useEffect, useLayoutEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Clock,
  ChevronLeft,
  ListTodo,
  Star,
  ShieldAlert,
  Building2,
  Activity,
  Target,
  Lightbulb,
  ArrowRightCircle,
  Sparkles,
  FlaskConical,
} from 'lucide-react';
import { projectsApi } from '../api/projects';
import { aiApi } from '../api/ai';
import { customersApi } from '../api/customers';
import {
  ProjectStatusBadge,
  StageBadge,
  CustomerTypeBadge,
} from '../components/ui/StatusBadge';
import { StageProgress } from '../components/ui/StageProgress';
import { EventFeed } from '../components/ui/EventFeed';
import { PageLoading, LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { PageContainer } from '@/components/layout/PageContainer';
import { usePageLayout } from '@/contexts/PageLayoutContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge as ShadcnBadge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { RiskGauge, RiskScoreBadge } from '@/components/ui/RiskScoreBadge';

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const projectId = Number(id);
  const queryClient = useQueryClient();
  const { setPageLayout } = usePageLayout();

  const [actionMsg, setActionMsg] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  const { data: project, isPending, isError, refetch } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId),
    enabled: !isNaN(projectId),
  });

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: customersApi.list,
  });

  const customer = customers?.find((c) => c.id === project?.customer_id);

  const projectsForCompany = project
    ? (projects ?? []).filter((p) => p.customer_id === project.customer_id).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    : [];

  function handleCompanyChange(customerId: number) {
    const thatCompanyProjects = (projects ?? [])
      .filter((p) => p.customer_id === customerId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const targetId = thatCompanyProjects[0]?.id;
    if (targetId != null) navigate(`/projects/${targetId}`);
  }

  function handleProjectChange(projectId: number) {
    navigate(`/projects/${projectId}`);
  }

  function showMsg(text: string, type: 'success' | 'info' = 'success') {
    setActionMsg({ text, type });
    setTimeout(() => setActionMsg(null), 5000);
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    queryClient.invalidateQueries({ queryKey: ['projects'] });
  }

  const checkOverdueMutation = useMutation({
    mutationFn: () => projectsApi.checkOverdue(projectId),
    onSuccess: (data) => {
      invalidate();
      showMsg(data.message, 'info');
    },
  });

  const checkRiskMutation = useMutation({
    mutationFn: () => projectsApi.checkRisk(projectId),
    onSuccess: (data) => {
      invalidate();
      showMsg(data.message, data.risk_flag ? 'info' : 'success');
    },
  });

  const recalculateRiskMutation = useMutation({
    mutationFn: () => projectsApi.recalculateRisk(projectId),
    onSuccess: () => invalidate(),
  });

  const advanceStageMutation = useMutation({
    mutationFn: () => projectsApi.advanceStage(projectId),
    onSuccess: (data) => {
      invalidate();
      showMsg(data.message);
    },
  });

  const { data: risk } = useQuery({
    queryKey: ['project-risk', projectId],
    queryFn: () => projectsApi.getRisk(projectId),
    enabled: !!project && !isNaN(projectId),
  });

  const riskSummaryMutation = useMutation({
    mutationFn: () => aiApi.getRiskSummary(projectId),
  });

  const projectName = project?.name ?? customer?.company_name ?? `Project #${projectId}`;

  useEffect(() => {
    if (!isNaN(projectId) && projectId > 0) riskSummaryMutation.mutate();
  }, [projectId]);

  useLayoutEffect(() => {
    if (!project) return;
    setPageLayout({
      title: projectName,
      action: (
        <Link
          to={`/simulator?projectId=${project.id}&tab=compare`}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
        >
          <FlaskConical className="size-4" />
          Compare with current
        </Link>
      ),
    });
    // Depend on id/name only so we don't re-run when project object reference changes
  }, [setPageLayout, projectName, project?.id]);

  if (isPending) return <PageLoading />;

  if (isError || !project) {
    return (
      <div className="p-6">
        <ErrorAlert message="Could not load project." onRetry={() => refetch()} />
      </div>
    );
  }

  const tasks = project.tasks ?? [];
  const events = project.events ?? [];
  const riskSignals = project.risk_signals ?? [];
  const recommendations = project.recommendations ?? [];
  const blockedTasks = tasks.filter((t) => t.blocker_flag);

  const completedTaskCount = tasks.filter((t) => t.status === 'completed').length;
  const overdueTaskCount = tasks.filter((t) => t.status === 'overdue').length;
  const customerMap = new Map(customers?.map((c) => [c.id, c]) ?? []);

  return (
    <PageContainer className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4 overflow-visible">
        <div className="flex items-center gap-2">
          <Label htmlFor="project-detail-company" className="text-sm font-medium">
            Company
          </Label>
          <Select
            value={String(project.customer_id)}
            onValueChange={(v) => handleCompanyChange(Number(v))}
          >
            <SelectTrigger
              id="project-detail-company"
              size="sm"
              className="w-48 overflow-visible"
              aria-label="Switch company"
            >
              <SelectValue placeholder="Select company">
                {customer?.company_name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(customers ?? []).map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.company_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="project-detail-project" className="text-sm font-medium">
            Project
          </Label>
          <Select
            value={String(project.id)}
            onValueChange={(v) => handleProjectChange(Number(v))}
          >
            <SelectTrigger
              id="project-detail-project"
              size="sm"
              className="w-56 overflow-visible"
              aria-label="Switch project"
              disabled={projectsForCompany.length === 0}
            >
              <SelectValue placeholder="Select project">
                {project.name ?? (customer ? `${customer.company_name} — #${project.id}` : `Project #${project.id}`)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {projectsForCompany.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.name ?? `${customerMap.get(p.customer_id)?.company_name ?? `Customer #${p.customer_id}`} — #${p.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Link to="/projects/list" className="text-sm font-medium text-muted-foreground underline-offset-4 hover:underline inline-flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" />
          All onboarding projects
        </Link>
      </div>

      {actionMsg && (
        <Card className={cn(actionMsg.type === 'success' ? 'border-emerald-200 bg-emerald-50/50' : 'border-primary/30 bg-primary/5')}>
          <CardContent className="py-3">
            <p className={cn('text-sm font-medium', actionMsg.type === 'success' ? 'text-emerald-700' : 'text-primary')} role="status">
              {actionMsg.text}
            </p>
          </CardContent>
        </Card>
      )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main column */}
          <div className="space-y-6 lg:col-span-2">
            <section aria-labelledby="tasks-cta-heading">
              <Card className="border-primary/20">
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <div>
                    <CardTitle id="tasks-cta-heading" className="text-lg flex items-center gap-2">
                      <ListTodo className="h-5 w-5 text-primary" />
                      View & manage tasks
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      <span className="font-medium text-foreground">{completedTaskCount}/{tasks.length}</span>
                      {' '}completed
                      {overdueTaskCount > 0 && (
                        <span className="ml-2 inline-flex items-center gap-1 text-destructive font-medium">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {overdueTaskCount} overdue
                        </span>
                      )}
                      {' · '}
                      <Star className="h-3 w-3 text-amber-500 fill-amber-400 inline mr-0.5" />
                      Required for stage gate
                    </p>
                  </div>
                  <Link
                    to={`/projects/${project.id}/tasks`}
                    className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'gap-1.5 shrink-0 inline-flex items-center')}
                  >
                    Open task list
                  </Link>
                </CardHeader>
              </Card>
            </section>

            <section aria-labelledby="project-glance-heading">
              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
                  <CardTitle id="project-glance-heading" className="text-base">
                    {project.name ?? customer?.company_name ?? `Project #${project.id}`}
                    {project.risk_flag && (
                      <AlertTriangle className="ml-1.5 inline h-4 w-4 text-destructive" aria-label="At risk" />
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-2 shrink-0">
                    <StageBadge stage={project.current_stage} />
                    <ProjectStatusBadge status={project.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <StageProgress currentStage={project.current_stage} status={project.status} />
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground border-t border-border pt-3">
                    {customer && (
                      <span className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" />
                        {customer.company_name}
                        <CustomerTypeBadge type={customer.customer_type} />
                      </span>
                    )}
                    {(project.target_go_live_date || project.projected_go_live_date) && (
                      <span className="flex items-center gap-1.5">
                        <Target className="h-3.5 w-3.5" />
                        Go-live: {project.projected_go_live_date
                          ? new Date(project.projected_go_live_date).toLocaleDateString('en-US')
                          : project.target_go_live_date
                            ? new Date(project.target_go_live_date).toLocaleDateString('en-US')
                            : '—'}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      Created {new Date(project.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  {project.notes && (
                    <p className="text-sm text-muted-foreground italic border-t border-border pt-3">{project.notes}</p>
                  )}
                </CardContent>
              </Card>
            </section>

            <section aria-labelledby="ai-risk-summary-heading">
              <Card aria-labelledby="ai-risk-summary-heading">
                <CardHeader className="pb-2">
                  <CardTitle id="ai-risk-summary-heading" className="text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    AI risk summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-full justify-center gap-1.5 sm:w-auto"
                    onClick={() => riskSummaryMutation.mutate()}
                    disabled={riskSummaryMutation.isPending}
                  >
                    {riskSummaryMutation.isPending ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    Generate
                  </Button>
                  {riskSummaryMutation.isError && (
                    <p className="text-sm text-destructive">Could not load.</p>
                  )}
                  {riskSummaryMutation.data?.risk_summary && (
                    <p className="text-sm text-foreground whitespace-normal">{riskSummaryMutation.data.risk_summary}</p>
                  )}
                </CardContent>
              </Card>
            </section>
          </div>

          <div className="space-y-6">
            {(project.risk_flag || risk != null || (riskSignals?.length ?? 0) > 0) && (
              <Card className="border-primary/20" aria-labelledby="risk-heading">
                <CardHeader className="pb-2">
                  <CardTitle id="risk-heading" className="text-sm flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-destructive" />
                    Risk {risk?.risk_level && `(${risk.risk_level})`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <RiskGauge
                      score={risk?.risk_score ?? project.risk_score ?? null}
                      className="max-w-[6rem] flex-1"
                    />
                    <RiskScoreBadge
                      score={risk?.risk_score ?? project.risk_score ?? null}
                      level={risk?.risk_level ?? project.risk_level ?? undefined}
                      showScore={true}
                    />
                  </div>
                  {((risk?.explanations?.length ?? 0) > 0 || (riskSignals?.length ?? 0) > 0) && (
                    <ul className="text-xs text-foreground list-disc list-inside space-y-0.5">
                      {(risk?.explanations ?? riskSignals.map((s) => s.description)).slice(0, 3).map((text, i) => (
                        <li key={i}>{text}</li>
                      ))}
                      {((risk?.explanations?.length ?? 0) + (riskSignals?.length ?? 0)) > 3 && (
                        <li className="text-muted-foreground">…</li>
                      )}
                    </ul>
                  )}
                </CardContent>
              </Card>
            )}

            {blockedTasks.length > 0 && (
              <Card className="border-amber-200 bg-amber-50/30" aria-labelledby="blockers-heading">
                <CardHeader className="pb-2">
                  <CardTitle id="blockers-heading" className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Blockers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-xs text-foreground space-y-1">
                    {blockedTasks.map((t) => (
                      <li key={t.id}>
                        <span className="font-medium">{t.title}</span>
                        {t.blocker_reason && ` — ${t.blocker_reason}`}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {(project.next_best_action || recommendations.length > 0) && (
              <Card aria-labelledby="next-heading">
                <CardHeader className="pb-2">
                  <CardTitle id="next-heading" className="text-sm flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    Next best action
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {project.next_best_action && (
                    <p className="text-xs text-foreground">{project.next_best_action}</p>
                  )}
                  {recommendations.length > 0 && (
                    <ul className="mt-1 text-xs text-muted-foreground space-y-0.5">
                      {recommendations.map((r) => (
                        <li key={r.id}>{r.label ?? r.action_type}</li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            )}

            <Card aria-labelledby="sidebar-actions">
              <CardHeader className="pb-2">
                <CardTitle id="sidebar-actions" className="text-sm">Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => checkOverdueMutation.mutate()} disabled={checkOverdueMutation.isPending}>
                  {checkOverdueMutation.isPending ? <LoadingSpinner size="sm" /> : <Clock className="h-4 w-4" />}
                  Check Overdue
                </Button>
                <Button
                  variant={project.risk_flag ? 'destructive' : 'secondary'}
                  size="sm"
                  onClick={() => checkRiskMutation.mutate()}
                  disabled={checkRiskMutation.isPending}
                >
                  {checkRiskMutation.isPending ? <LoadingSpinner size="sm" /> : <ShieldAlert className="h-4 w-4" />}
                  Check Risk
                </Button>
                <Button variant="secondary" size="sm" onClick={() => recalculateRiskMutation.mutate()} disabled={recalculateRiskMutation.isPending}>
                  {recalculateRiskMutation.isPending ? <LoadingSpinner size="sm" /> : <ShieldAlert className="h-4 w-4" />}
                  Recalculate
                </Button>
                {project.status !== 'completed' && (
                  <Button size="sm" onClick={() => advanceStageMutation.mutate()} disabled={advanceStageMutation.isPending}>
                    {advanceStageMutation.isPending ? <LoadingSpinner size="sm" /> : <ArrowRightCircle className="h-4 w-4" />}
                    Advance Stage
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card aria-labelledby="events-heading">
              <CardHeader className="flex flex-row items-center gap-2 border-b pb-2">
                <Activity className="h-4 w-4 text-muted-foreground" aria-hidden />
                <CardTitle id="events-heading" className="text-sm">
                  Activity
                </CardTitle>
                {events.length > 0 && (
                  <ShadcnBadge variant="secondary" className="ml-auto font-normal text-xs">
                    {events.length}
                  </ShadcnBadge>
                )}
              </CardHeader>
              <CardContent className="max-h-[280px] overflow-y-auto pt-3">
                <EventFeed events={events} maxItems={15} />
              </CardContent>
            </Card>

          </div>
        </div>
    </PageContainer>
  );
}
