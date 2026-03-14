import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronLeft,
  User,
  Calendar,
  Star,
  ShieldAlert,
  FileText,
  Building2,
  Activity,
} from 'lucide-react';
import { projectsApi } from '../api/projects';
import { tasksApi } from '../api/tasks';
import { customersApi } from '../api/customers';
import {
  ProjectStatusBadge,
  TaskStatusBadge,
  StageBadge,
  CustomerTypeBadge,
  Badge,
} from '../components/ui/StatusBadge';
import { StageProgress } from '../components/ui/StageProgress';
import { EventFeed } from '../components/ui/EventFeed';
import { PageLoading, LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { EmptyState } from '../components/ui/EmptyState';
import { Topbar } from '../components/layout/Topbar';
import type { Task } from '../types';

function TaskRow({
  task,
  onComplete,
  isCompleting,
}: {
  task: Task;
  onComplete: (id: number) => void;
  isCompleting: boolean;
}) {
  const isActionable = task.status !== 'completed' && task.status !== 'blocked';

  return (
    <tr className={`border-b border-slate-100 last:border-0 ${task.status === 'overdue' ? 'bg-red-50/40' : 'hover:bg-slate-50'} transition-colors`}>
      <td className="px-5 py-3.5">
        <div>
          <div className="flex items-center gap-1.5">
            <span className={`text-sm font-medium ${task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
              {task.title}
            </span>
            {task.required_for_stage_completion && (
              <span title="Required for stage completion">
                <Star className="h-3 w-3 text-amber-500 fill-amber-400" aria-label="Required" />
              </span>
            )}
            {task.is_customer_required && (
              <Badge label="Customer" variant="purple" />
            )}
            {task.requires_setup_data && (
              <Badge label="Needs Setup Data" variant="slate" />
            )}
          </div>
          {task.description && (
            <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{task.description}</p>
          )}
        </div>
      </td>
      <td className="px-5 py-3.5">
        <TaskStatusBadge status={task.status} />
      </td>
      <td className="px-5 py-3.5">
        {task.assigned_to ? (
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <User className="h-3.5 w-3.5 text-slate-400" />
            {task.assigned_to}
          </div>
        ) : (
          <span className="text-xs text-slate-400">Unassigned</span>
        )}
      </td>
      <td className="px-5 py-3.5">
        {task.due_date ? (
          <div className={`flex items-center gap-1 text-xs ${task.status === 'overdue' ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
            <Calendar className="h-3.5 w-3.5" />
            {new Date(task.due_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </div>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </td>
      <td className="px-5 py-3.5 text-right">
        {isActionable && (
          <button
            type="button"
            className="btn-secondary text-xs py-1"
            onClick={() => onComplete(task.id)}
            disabled={isCompleting}
          >
            {isCompleting ? (
              <LoadingSpinner size="sm" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            Mark Complete
          </button>
        )}
      </td>
    </tr>
  );
}

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const queryClient = useQueryClient();

  const [completingTaskId, setCompletingTaskId] = useState<number | null>(null);
  const [actionMsg, setActionMsg] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  const { data: project, isPending, isError, refetch } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId),
    enabled: !isNaN(projectId),
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: customersApi.list,
  });

  const customer = customers?.find((c) => c.id === project?.customer_id);

  function showMsg(text: string, type: 'success' | 'info' = 'success') {
    setActionMsg({ text, type });
    setTimeout(() => setActionMsg(null), 5000);
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    queryClient.invalidateQueries({ queryKey: ['projects'] });
  }

  const completeTaskMutation = useMutation({
    mutationFn: tasksApi.complete,
    onMutate: (taskId) => setCompletingTaskId(taskId),
    onSuccess: (data) => {
      invalidate();
      setCompletingTaskId(null);
      if (data.project_completed) {
        showMsg('Project completed!');
      } else if (data.stage_advanced) {
        showMsg(`Stage advanced to ${data.new_stage?.replace('_', '-') ?? ''}.`);
      } else {
        showMsg(data.message);
      }
    },
    onError: () => setCompletingTaskId(null),
  });

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

  if (isPending) return <PageLoading />;

  if (isError || !project) {
    return (
      <div>
        <Topbar />
        <div className="px-6 py-6">
          <ErrorAlert message="Could not load project." onRetry={() => refetch()} />
        </div>
      </div>
    );
  }

  const tasks = project.tasks ?? [];
  const events = project.events ?? [];

  const tasksByStage = tasks.reduce<Record<string, Task[]>>((acc, task) => {
    if (!acc[task.stage]) acc[task.stage] = [];
    acc[task.stage].push(task);
    return acc;
  }, {});

  const completedTaskCount = tasks.filter((t) => t.status === 'completed').length;
  const overdueTaskCount = tasks.filter((t) => t.status === 'overdue').length;

  return (
    <div>
      <Topbar />

      <div className="px-6 py-6 space-y-6">
        {/* Back link */}
        <Link
          to="/projects"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          All Projects
        </Link>

        {/* Action feedback banner */}
        {actionMsg && (
          <div
            className={`rounded-lg px-4 py-3 text-sm font-medium border ${
              actionMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-blue-50 border-blue-200 text-blue-700'
            }`}
            role="status"
          >
            {actionMsg.text}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Left column: summary + tasks */}
          <div className="xl:col-span-2 space-y-6">

            {/* Project summary card */}
            <section className="card p-5" aria-labelledby="project-summary">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h2 id="project-summary" className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    {customer?.company_name ?? `Project #${project.id}`}
                    {project.risk_flag && (
                      <AlertTriangle className="h-4 w-4 text-red-500" aria-label="At risk" />
                    )}
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Onboarding Project #{project.id}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StageBadge stage={project.current_stage} />
                  <ProjectStatusBadge status={project.status} />
                </div>
              </div>

              {/* Stage progress */}
              <StageProgress currentStage={project.current_stage} status={project.status} />

              {/* Meta row */}
              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600 border-t border-slate-100 pt-4">
                {customer && (
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <span>{customer.company_name}</span>
                    <CustomerTypeBadge type={customer.customer_type} />
                  </div>
                )}
                {customer?.industry && (
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-slate-400" />
                    <span>{customer.industry}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span>
                    Created{' '}
                    {new Date(project.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                {project.notes && (
                  <div className="flex items-start gap-1.5 w-full">
                    <FileText className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-500 italic">{project.notes}</span>
                  </div>
                )}
              </div>
            </section>

            {/* Task actions bar */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-slate-600 mr-auto">
                <span className="font-medium">{completedTaskCount}/{tasks.length}</span>
                <span className="text-slate-400">tasks completed</span>
                {overdueTaskCount > 0 && (
                  <span className="flex items-center gap-1 text-red-600 font-medium">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {overdueTaskCount} overdue
                  </span>
                )}
              </div>
              <button
                type="button"
                className="btn-secondary text-sm"
                onClick={() => checkOverdueMutation.mutate()}
                disabled={checkOverdueMutation.isPending}
              >
                {checkOverdueMutation.isPending ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Clock className="h-4 w-4" />
                )}
                Check Overdue
              </button>
              <button
                type="button"
                className={`btn text-sm ${project.risk_flag ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500' : 'btn-secondary'}`}
                onClick={() => checkRiskMutation.mutate()}
                disabled={checkRiskMutation.isPending}
              >
                {checkRiskMutation.isPending ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <ShieldAlert className="h-4 w-4" />
                )}
                Check Risk
              </button>
            </div>

            {/* Tasks table */}
            <section aria-labelledby="tasks-heading">
              <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 id="tasks-heading" className="text-sm font-semibold text-slate-800">
                    Tasks
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    <Star className="h-3 w-3 text-amber-500 fill-amber-400 inline mr-0.5" />
                    Required for stage gate
                  </p>
                </div>

                {tasks.length === 0 ? (
                  <EmptyState title="No tasks" description="Tasks will be generated when the project is created." />
                ) : (
                  Object.entries(tasksByStage).map(([stage, stageTasks]) => (
                    <div key={stage}>
                      <div className="px-5 py-2 bg-slate-50 border-b border-slate-100">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          {stage.replace('_', ' ')} Stage
                        </span>
                      </div>
                      <table className="w-full text-sm">
                        <thead className="sr-only">
                          <tr>
                            <th>Task</th>
                            <th>Status</th>
                            <th>Assigned To</th>
                            <th>Due Date</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stageTasks.map((task) => (
                            <TaskRow
                              key={task.id}
                              task={task}
                              onComplete={(taskId) => completeTaskMutation.mutate(taskId)}
                              isCompleting={completingTaskId === task.id}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Right column: events */}
          <aside>
            <section className="card" aria-labelledby="events-heading">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
                <Activity className="h-4 w-4 text-slate-400" />
                <h3 id="events-heading" className="text-sm font-semibold text-slate-800">
                  Workflow Events
                </h3>
                <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                  {events.length}
                </span>
              </div>
              <div className="px-5 py-4">
                <EventFeed events={events} />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
