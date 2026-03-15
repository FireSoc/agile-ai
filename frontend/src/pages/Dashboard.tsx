import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FolderKanban,
  Play,
  AlertTriangle,
  CheckCircle2,
  Users,
  ArrowRight,
  Database,
} from 'lucide-react';
import { projectsApi } from '../api/projects';
import { customersApi } from '../api/customers';
import { seedApi } from '../api/seed';
import { StatCard } from '../components/ui/StatCard';
import { ProjectStatusBadge, StageBadge } from '../components/ui/StatusBadge';
import { PageLoading } from '../components/ui/LoadingSpinner';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { Topbar } from '../components/layout/Topbar';

export function Dashboard() {
  const queryClient = useQueryClient();
  const [seedMsg, setSeedMsg] = useState<string | null>(null);

  const { data: projects, isPending: loadingProjects, isError: errorProjects, refetch: refetchProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  });

  const { data: customers, isPending: loadingCustomers } = useQuery({
    queryKey: ['customers'],
    queryFn: customersApi.list,
  });

  const seedMutation = useMutation({
    mutationFn: seedApi.seed,
    onSuccess: (data) => {
      setSeedMsg(data.message ?? 'Database seeded.');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setTimeout(() => setSeedMsg(null), 4000);
    },
  });

  if (loadingProjects || loadingCustomers) return <PageLoading />;

  const totalProjects = projects?.length ?? 0;
  const activeProjects = projects?.filter((p) => p.status === 'active').length ?? 0;
  const atRiskProjects = projects?.filter((p) => p.status === 'at_risk' || p.risk_flag).length ?? 0;
  const completedProjects = projects?.filter((p) => p.status === 'completed').length ?? 0;
  const totalCustomers = customers?.length ?? 0;

  // Collect recent events across all projects by fetching each project detail
  // We show the most recent 8 events from a flat list if available
  const recentProjects = projects?.slice(0, 5) ?? [];

  return (
    <div>
      <Topbar
        action={
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
          >
            <Database className="h-3.5 w-3.5" />
            {seedMutation.isPending ? 'Seeding…' : 'Seed Database'}
          </button>
        }
      />

      <div className="px-6 py-6 space-y-6">
        {seedMsg && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 font-medium">
            {seedMsg}
          </div>
        )}

        {errorProjects && (
          <ErrorAlert
            message="Could not load projects. Is the backend running?"
            onRetry={() => refetchProjects()}
          />
        )}

        {/* Stats */}
        <section aria-labelledby="stats-heading">
          <h2 id="stats-heading" className="sr-only">Overview stats</h2>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
            <StatCard
              label="Total Projects"
              value={totalProjects}
              icon={<FolderKanban className="h-5 w-5 text-brand-600" />}
              iconBg="bg-brand-50"
            />
            <StatCard
              label="Active"
              value={activeProjects}
              icon={<Play className="h-5 w-5 text-blue-600" />}
              iconBg="bg-blue-50"
            />
            <StatCard
              label="At Risk"
              value={atRiskProjects}
              icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
              iconBg="bg-red-50"
            />
            <StatCard
              label="Completed"
              value={completedProjects}
              icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
              iconBg="bg-emerald-50"
            />
            <StatCard
              label="Customers"
              value={totalCustomers}
              icon={<Users className="h-5 w-5 text-purple-600" />}
              iconBg="bg-purple-50"
            />
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Recent Projects */}
          <section className="lg:col-span-2" aria-labelledby="projects-heading">
            <div className="card">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h2 id="projects-heading" className="text-sm font-semibold text-slate-800">
                  Recent Projects
                </h2>
                <Link to="/projects" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              {recentProjects.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-slate-500">
                  No projects yet.{' '}
                  <Link to="/projects" className="text-brand-600 hover:underline">
                    Create one
                  </Link>{' '}
                  or{' '}
                  <button
                    type="button"
                    className="text-brand-600 hover:underline"
                    onClick={() => seedMutation.mutate()}
                  >
                    seed the database
                  </button>
                  .
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentProjects.map((project) => {
                    const customer = customers?.find((c) => c.id === project.customer_id);
                    return (
                      <Link
                        key={project.id}
                        to={`/projects/${project.id}`}
                        className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors group"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate group-hover:text-brand-700 transition-colors">
                            {project.name ?? customer?.company_name ?? `Project #${project.id}`}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {customer?.customer_type.toUpperCase()} · {customer?.industry}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                          <StageBadge stage={project.current_stage} />
                          <ProjectStatusBadge status={project.status} />
                          {project.risk_flag && (
                            <AlertTriangle className="h-3.5 w-3.5 text-red-500" aria-label="At risk" />
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Quick Links */}
          <section aria-labelledby="quicklinks-heading">
            <div className="card">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 id="quicklinks-heading" className="text-sm font-semibold text-slate-800">
                  Quick Actions
                </h2>
              </div>
              <div className="p-5 space-y-2">
                <Link
                  to="/customers"
                  className="flex items-center justify-between rounded-md border border-slate-200 px-4 py-3 text-sm hover:bg-slate-50 hover:border-brand-300 transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="h-4 w-4 text-slate-400 group-hover:text-brand-600" />
                    <span className="font-medium text-slate-700">Manage Customers</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                </Link>
                <Link
                  to="/projects"
                  className="flex items-center justify-between rounded-md border border-slate-200 px-4 py-3 text-sm hover:bg-slate-50 hover:border-brand-300 transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <FolderKanban className="h-4 w-4 text-slate-400 group-hover:text-brand-600" />
                    <span className="font-medium text-slate-700">View All Projects</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                </Link>

                {atRiskProjects > 0 && (
                  <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      <p className="text-sm font-medium text-red-700">
                        {atRiskProjects} project{atRiskProjects > 1 ? 's' : ''} at risk
                      </p>
                    </div>
                    <Link
                      to="/projects"
                      className="mt-1 text-xs text-red-600 hover:underline flex items-center gap-1"
                    >
                      Review now <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
