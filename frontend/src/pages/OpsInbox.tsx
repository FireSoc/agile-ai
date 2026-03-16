import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  AlertCircle,
  Clock,
  FileWarning,
  ExternalLink,
  XCircle,
  FlaskConical,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { KpiCard } from '@/components/ui/KpiCard';
import { FilterBar } from '@/components/ui/FilterBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import { ProjectStatusBadge, StageBadge, CustomerTypeBadge } from '@/components/ui/StatusBadge';
import { projectsApi } from '../api/projects';
import { customersApi } from '../api/customers';
import { opsInboxApi } from '../api/opsInbox';
import { usePageLayout } from '@/contexts/PageLayoutContext';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { OpsInboxItemFromApi, OpsInboxItemType } from '../types';

function itemTypeLabel(t: OpsInboxItemType): string {
  switch (t) {
    case 'blocked_task':
      return 'Blocked';
    case 'overdue_task':
      return 'Overdue';
    case 'recommendation':
      return 'Recommendation';
    case 'project_alert':
      return 'At risk';
    default:
      return t;
  }
}

const selectClass = cn(
  'flex h-8 rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
);

const STAGES: Array<{ value: string; label: string }> = [
  { value: 'kickoff', label: 'Kickoff' },
  { value: 'setup', label: 'Setup' },
  { value: 'integration', label: 'Integration' },
  { value: 'training', label: 'Training' },
  { value: 'go_live', label: 'Go-Live' },
];

export function OpsInbox() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const typeFilter = searchParams.get('type') ?? '';
  const stageFilter = searchParams.get('stage') ?? '';
  const customerIdParam = searchParams.get('customer');
  const customerIdFilter = customerIdParam ? parseInt(customerIdParam, 10) : null;

  const { setPageLayout } = usePageLayout();

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: customersApi.list,
  });

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: [
      'ops-inbox',
      typeFilter || null,
      stageFilter || null,
      customerIdFilter ?? null,
    ],
    queryFn: () =>
      opsInboxApi.getInbox({
        type: (typeFilter as OpsInboxItemType) || undefined,
        stage: stageFilter || undefined,
        customer_id: customerIdFilter ?? undefined,
        limit: 500,
      }),
  });

  const dismissRecMutation = useMutation({
    mutationFn: ({ projectId, recommendationId }: { projectId: number; recommendationId: number }) =>
      projectsApi.dismissRecommendation(projectId, recommendationId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['ops-inbox'] });
    },
  });

  const totals = data?.totals ?? {
    blocked: 0,
    overdue: 0,
    recommendations: 0,
    at_risk_project_alerts: 0,
    at_risk_projects: 0,
    needs_attention_now: 0,
  };
  const filteredItems: OpsInboxItemFromApi[] = data?.items ?? [];
  const urgentItems = filteredItems.filter(
    (i) =>
      i.item_type === 'overdue_task' ||
      i.item_type === 'blocked_task' ||
      (i.item_type === 'project_alert' && totals.needs_attention_now > 0)
  ).slice(0, 5);

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  }

  useEffect(() => {
    setPageLayout({
      title: 'Ops Inbox',
      subtitle: 'Action queue: blocked tasks, overdue work, recommendations, and at-risk projects.',
      action: (
        <Link to="/simulator" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}>
          <FlaskConical className="size-4" />
          Simulator
        </Link>
      ),
    });
  }, [setPageLayout]);

  return (
    <PageContainer className="flex flex-col gap-6">
      <PageHeader
        title="Ops Inbox"
        subtitle="Action queue: blocked tasks, overdue work, recommendations, and at-risk projects. Triage and open projects to act."
        action={
          <Link to="/simulator" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}>
            <FlaskConical className="size-4" />
            Open Simulator
          </Link>
        }
      />

      {isError && (
        <ErrorAlert
          message="Could not load ops inbox. Is the backend running?"
          onRetry={() => refetch()}
        />
      )}

      {!isError && isPending && <PageLoading />}

      {!isError && !isPending && (
        <>
          <section aria-labelledby="inbox-kpi-heading" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <h2 id="inbox-kpi-heading" className="sr-only">
              Inbox summary
            </h2>
            <KpiCard
              label="Needs attention now"
              value={totals.needs_attention_now}
              icon={<AlertTriangle className="size-5 text-destructive" />}
              iconClassName="bg-destructive/10"
            />
            <KpiCard
              label="Blocked"
              value={totals.blocked}
              icon={<AlertCircle className="size-5 text-muted-foreground" />}
            />
            <KpiCard
              label="Overdue"
              value={totals.overdue}
              icon={<Clock className="size-5 text-muted-foreground" />}
            />
            <KpiCard
              label="Recommendations"
              value={totals.recommendations}
              icon={<FileWarning className="size-5 text-muted-foreground" />}
            />
            <KpiCard
              label="At-risk projects"
              value={totals.at_risk_projects}
              icon={<AlertTriangle className="size-5 text-destructive" />}
              iconClassName="bg-destructive/10"
            />
          </section>

          <FilterBar>
            <select
              aria-label="Filter by type"
              value={typeFilter}
              onChange={(e) => setFilter('type', e.target.value)}
              className={selectClass}
            >
              <option value="">All types</option>
              <option value="blocked_task">Blocked</option>
              <option value="overdue_task">Overdue</option>
              <option value="recommendation">Recommendation</option>
              <option value="project_alert">At risk</option>
            </select>
            <select
              aria-label="Filter by stage"
              value={stageFilter}
              onChange={(e) => setFilter('stage', e.target.value)}
              className={selectClass}
            >
              <option value="">All stages</option>
              {STAGES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by customer"
              value={customerIdFilter ?? ''}
              onChange={(e) => setFilter('customer', e.target.value)}
              className={selectClass}
            >
              <option value="">All customers</option>
              {(customers ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name}
                </option>
              ))}
            </select>
          </FilterBar>

          {urgentItems.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Priority</CardTitle>
                <p className="text-xs text-muted-foreground">Items that may need immediate action</p>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2">
                  {urgentItems.map((item) => {
                    const projectName =
                      item.project.name ?? item.customer?.company_name ?? `Project #${item.project.id}`;
                    return (
                      <li
                        key={`${item.item_type}-${item.project.id}-${item.task?.id ?? item.recommendation?.id ?? 'alert'}`}
                        className="flex items-center justify-between gap-4 text-sm"
                      >
                        <span className="font-medium">{itemTypeLabel(item.item_type)}</span>
                        <span className="text-muted-foreground">{projectName}</span>
                        <Link
                          to={`/projects/${item.project.id}`}
                          className="shrink-0 text-primary underline-offset-4 hover:underline"
                        >
                          Open
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base">Queue ({filteredItems.length})</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">All inbox items. Open a project to act.</p>
            </CardHeader>
            <CardContent className="p-0">
              {filteredItems.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    title={
                      typeFilter || stageFilter || (customerIdFilter != null && !isNaN(customerIdFilter))
                        ? 'No items match filters'
                        : 'No items need attention'
                    }
                    description={
                      typeFilter || stageFilter || (customerIdFilter != null && !isNaN(customerIdFilter))
                        ? 'Try changing or clearing filters to see more items.'
                        : 'All onboarding projects are on track. Check back later or run risk checks on projects.'
                    }
                    icon={<FileWarning className="size-12 text-muted-foreground" />}
                    action={
                      <Link to="/projects" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                        View projects
                      </Link>
                    }
                  />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-5 py-3">Type</TableHead>
                      <TableHead className="px-5 py-3">Customer</TableHead>
                      <TableHead className="px-5 py-3">Project / Stage</TableHead>
                      <TableHead className="px-5 py-3">Risk</TableHead>
                      <TableHead className="px-5 py-3">Context</TableHead>
                      <TableHead className="px-5 py-3 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => {
                      const projectName =
                        item.project.name ?? item.customer?.company_name ?? `Project #${item.project.id}`;
                      let context = '';
                      if (item.task) {
                        if (item.task.status === 'overdue' && item.task.due_date) {
                          context = `Due ${new Date(item.task.due_date).toLocaleDateString()}`;
                        }
                        if (item.task.blocker_flag && item.task.blocker_reason) {
                          context = context
                            ? `${context} · ${item.task.blocker_reason}`
                            : item.task.blocker_reason;
                        }
                      }
                      if (item.recommendation?.label) context = item.recommendation.label;
                      if (item.item_type === 'project_alert')
                        context = 'Project at risk — review tasks and blockers';

                      return (
                        <TableRow
                          key={`${item.item_type}-${item.project.id}-${item.task?.id ?? item.recommendation?.id ?? 'alert'}`}
                        >
                          <TableCell className="px-5 py-3">
                            <span className="font-medium text-foreground">
                              {itemTypeLabel(item.item_type)}
                            </span>
                          </TableCell>
                          <TableCell className="px-5 py-3">
                            {item.customer ? (
                              <span className="text-foreground">{item.customer.company_name}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                            {item.customer && (
                              <div className="mt-0.5">
                                <CustomerTypeBadge type={item.customer.customer_type} />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="px-5 py-3">
                            <p className="font-medium text-foreground">{projectName}</p>
                            <div className="mt-0.5">
                              <StageBadge stage={item.project.current_stage} />
                            </div>
                          </TableCell>
                          <TableCell className="px-5 py-3">
                            <ProjectStatusBadge status={item.project.status} />
                            {item.project.risk_flag && (
                              <AlertTriangle
                                className="ml-1 inline-block size-3.5 text-destructive"
                                aria-label="At risk"
                              />
                            )}
                          </TableCell>
                          <TableCell className="max-w-xs truncate px-5 py-3 text-muted-foreground" title={context}>
                            {context || '—'}
                          </TableCell>
                          <TableCell className="px-5 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                to={`/projects/${item.project.id}`}
                                className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
                              >
                                Open project
                                <ExternalLink className="size-3" />
                              </Link>
                              {item.item_type === 'recommendation' && item.recommendation && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    dismissRecMutation.mutate({
                                      projectId: item.project.id,
                                      recommendationId: item.recommendation!.id,
                                    })
                                  }
                                  disabled={dismissRecMutation.isPending}
                                  className="text-muted-foreground"
                                  title="Dismiss recommendation"
                                >
                                  <XCircle className="size-3.5" />
                                  Dismiss
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </PageContainer>
  );
}
