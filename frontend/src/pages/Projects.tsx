import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, AlertTriangle, FolderKanban, ExternalLink } from 'lucide-react';
import { projectsApi } from '../api/projects';
import { customersApi } from '../api/customers';
import { ProjectStatusBadge, StageBadge, CustomerTypeBadge } from '../components/ui/StatusBadge';
import { ProjectForm } from '../components/ui/ProjectForm';
import { Modal } from '../components/ui/Modal';
import { PageLoading } from '../components/ui/LoadingSpinner';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { EmptyState } from '../components/ui/EmptyState';
import { Topbar } from '../components/layout/Topbar';

export function Projects() {
  const [isModalOpen, setModalOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const companyId = searchParams.get('company');
  const projectId = searchParams.get('project');

  const { data: projects, isPending: loadingProjects, isError, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: customersApi.list,
  });

  const customerMap = new Map(customers?.map((c) => [c.id, c]) ?? []);

  const filteredByCompany = companyId
    ? projects?.filter((p) => p.customer_id === Number(companyId))
    : projects;

  const filteredProjects =
    projectId && filteredByCompany
      ? filteredByCompany.filter((p) => p.id === Number(projectId))
      : filteredByCompany;

  const projectsForProjectDropdown = filteredByCompany ?? [];

  function setCompany(value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('company', value);
    else next.delete('company');
    next.delete('project');
    setSearchParams(next);
  }

  function setProject(value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('project', value);
    else next.delete('project');
    setSearchParams(next);
  }

  return (
    <div>
      <Topbar
        action={
          <button
            type="button"
            className="btn-primary"
            onClick={() => setModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            New Project
          </button>
        }
      />

      <div className="px-6 py-6 space-y-4">
        {!loadingProjects && !isError && (projects?.length ?? 0) > 0 && (
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label htmlFor="filter-company" className="label inline-block mb-0 mr-2">
                Company
              </label>
              <select
                id="filter-company"
                className="select w-48"
                value={companyId ?? ''}
                onChange={(e) => setCompany(e.target.value)}
                aria-label="Filter by company"
              >
                <option value="">All companies</option>
                {(customers ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="filter-project" className="label inline-block mb-0 mr-2">
                Project
              </label>
              <select
                id="filter-project"
                className="select w-56"
                value={projectId ?? ''}
                onChange={(e) => setProject(e.target.value)}
                aria-label="Filter by project"
                disabled={projectsForProjectDropdown.length === 0}
              >
                <option value="">All projects</option>
                {projectsForProjectDropdown.map((p) => {
                  const customer = customerMap.get(p.customer_id);
                  return (
                    <option key={p.id} value={p.id}>
                      {customer?.company_name ?? `Customer #${p.customer_id}`} — #{p.id}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        )}

        {loadingProjects && <PageLoading />}

        {isError && (
          <ErrorAlert
            message="Failed to load projects. Is the backend running?"
            onRetry={() => refetch()}
          />
        )}

        {!loadingProjects && !isError && filteredProjects?.length === 0 && (
          <EmptyState
            title="No projects yet"
            description="Create a new onboarding project for a customer to get started."
            icon={<FolderKanban className="h-12 w-12" />}
            action={
              <button
                type="button"
                className="btn-primary"
                onClick={() => setModalOpen(true)}
              >
                <Plus className="h-4 w-4" />
                New Project
              </button>
            }
          />
        )}

        {!loadingProjects && !isError && filteredProjects && filteredProjects.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">
                {companyId && projectId
                  ? 'Project'
                  : companyId
                    ? `Projects for ${customerMap.get(Number(companyId))?.company_name ?? 'Customer'}`
                    : 'All Projects'}
                <span className="ml-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 font-normal">
                  {filteredProjects.length}
                </span>
              </h2>
              {(companyId || projectId) && (
                <button
                  type="button"
                  onClick={() => setSearchParams({})}
                  className="text-xs text-brand-600 hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Customer
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Stage
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Risk
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Updated
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProjects.map((project) => {
                  const customer = customerMap.get(project.customer_id);
                  return (
                    <tr key={project.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div>
                          <p className="font-medium text-slate-800">
                            {customer?.company_name ?? `Customer #${project.customer_id}`}
                          </p>
                          {customer && (
                            <div className="mt-0.5">
                              <CustomerTypeBadge type={customer.customer_type} />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <StageBadge stage={project.current_stage} />
                      </td>
                      <td className="px-5 py-3.5">
                        <ProjectStatusBadge status={project.status} />
                      </td>
                      <td className="px-5 py-3.5">
                        {project.risk_flag ? (
                          <div className="flex items-center gap-1 text-red-600 text-xs font-medium">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            At Risk
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {new Date(project.updated_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          to={`/projects/${project.id}`}
                          className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
                        >
                          Open <ExternalLink className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        title="New Onboarding Project"
        size="md"
      >
        <ProjectForm
          preselectedCustomerId={companyId ? Number(companyId) : undefined}
          onSuccess={() => setModalOpen(false)}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
