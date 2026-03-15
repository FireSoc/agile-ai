import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileWarning,
  ExternalLink,
  XCircle,
  Filter,
} from 'lucide-react';
import { Topbar } from '../components/layout/Topbar';
import { StatCard } from '../components/ui/StatCard';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { PageLoading } from '../components/ui/LoadingSpinner';
import { ProjectStatusBadge, StageBadge, CustomerTypeBadge } from '../components/ui/StatusBadge';
import { projectsApi } from '../api/projects';
import { customersApi } from '../api/customers';
import { opsInboxApi } from '../api/opsInbox';
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

export function OpsInbox() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const typeFilter = searchParams.get('type') ?? '';
  const stageFilter = searchParams.get('stage') ?? '';
  const customerIdParam = searchParams.get('customer');
  const customerIdFilter = customerIdParam ? parseInt(customerIdParam, 10) : null;

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

  const stages: Array<{ value: string; label: string }> = [
    { value: 'kickoff', label: 'Kickoff' },
    { value: 'setup', label: 'Setup' },
    { value: 'integration', label: 'Integration' },
    { value: 'training', label: 'Training' },
    { value: 'go_live', label: 'Go-Live' },
  ];

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  }

  return (
    <div>
      <Topbar />
      <div className="px-6 py-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Ops Inbox</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Action queue: blocked tasks, overdue work, recommendations, and at-risk projects. Triage and open projects to act.
          </p>
        </div>

        {isError && (
          <ErrorAlert
            message="Could not load ops inbox. Is the backend running?"
            onRetry={() => refetch()}
          />
        )}

        {!isError && isPending && <PageLoading />}

        {!isError && !isPending && (
          <>
            <section aria-labelledby="inbox-stats-heading">
              <h2 id="inbox-stats-heading" className="sr-only">Inbox summary</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                <StatCard
                  label="Needs attention now"
                  value={totals.needs_attention_now}
                  icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
                  iconBg="bg-red-50"
                />
                <StatCard
                  label="Blocked"
                  value={totals.blocked}
                  icon={<AlertCircle className="h-5 w-5 text-amber-600" />}
                  iconBg="bg-amber-50"
                />
                <StatCard
                  label="Overdue"
                  value={totals.overdue}
                  icon={<Clock className="h-5 w-5 text-red-600" />}
                  iconBg="bg-red-50"
                />
                <StatCard
                  label="Recommendations"
                  value={totals.recommendations}
                  icon={<FileWarning className="h-5 w-5 text-blue-600" />}
                  iconBg="bg-blue-50"
                />
                <StatCard
                  label="At-risk projects"
                  value={totals.at_risk_projects}
                  icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
                  iconBg="bg-red-50"
                />
              </div>
            </section>

            <section aria-labelledby="inbox-filters-heading">
              <h2 id="inbox-filters-heading" className="sr-only">Filters</h2>
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <Filter className="h-3.5 w-3.5" /> Filter
                </span>
                <select
                  aria-label="Filter by type"
                  value={typeFilter}
                  onChange={(e) => setFilter('type', e.target.value)}
                  className="rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 bg-white"
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
                  className="rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 bg-white"
                >
                  <option value="">All stages</option>
                  {stages.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Filter by customer"
                  value={customerIdFilter ?? ''}
                  onChange={(e) => setFilter('customer', e.target.value)}
                  className="rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 bg-white"
                >
                  <option value="">All customers</option>
                  {(customers ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            <section className="card overflow-hidden" aria-labelledby="inbox-queue-heading">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 id="inbox-queue-heading" className="text-sm font-semibold text-slate-800">
                  Queue ({filteredItems.length})
                </h2>
              </div>

              {filteredItems.length === 0 ? (
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
                  icon={<CheckCircle2 className="h-12 w-12 text-slate-300" />}
                  action={
                    <Link to="/projects" className="text-sm font-medium text-brand-600 hover:underline">
                      View projects
                    </Link>
                  }
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Type
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Customer
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Project / Stage
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Risk
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Context
                        </th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
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
                          <tr
                            key={`${item.item_type}-${item.project.id}-${item.task?.id ?? item.recommendation?.id ?? 'alert'}`}
                            className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50"
                          >
                            <td className="px-5 py-3">
                              <span className="font-medium text-slate-800">
                                {itemTypeLabel(item.item_type)}
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              {item.customer ? (
                                <span className="text-slate-700">{item.customer.company_name}</span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                              {item.customer && (
                                <div className="mt-0.5">
                                  <CustomerTypeBadge type={item.customer.customer_type} />
                                </div>
                              )}
                            </td>
                            <td className="px-5 py-3">
                              <p className="font-medium text-slate-800">{projectName}</p>
                              <div className="mt-0.5">
                                <StageBadge stage={item.project.current_stage} />
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              <ProjectStatusBadge status={item.project.status} />
                              {item.project.risk_flag && (
                                <AlertTriangle
                                  className="inline-block ml-1 h-3.5 w-3.5 text-red-500"
                                  aria-label="At risk"
                                />
                              )}
                            </td>
                            <td className="px-5 py-3 text-slate-600 max-w-xs truncate" title={context}>
                              {context || '—'}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Link
                                  to={`/projects/${item.project.id}`}
                                  className="inline-flex items-center gap-1 text-brand-600 hover:underline text-xs font-medium"
                                >
                                  Open project <ExternalLink className="h-3 w-3" />
                                </Link>
                                {item.item_type === 'recommendation' && item.recommendation && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      dismissRecMutation.mutate({
                                        projectId: item.project.id,
                                        recommendationId: item.recommendation!.id,
                                      })
                                    }
                                    disabled={dismissRecMutation.isPending}
                                    className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700 text-xs"
                                    title="Dismiss recommendation"
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                    Dismiss
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
