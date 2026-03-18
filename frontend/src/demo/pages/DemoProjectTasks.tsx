import { useLayoutEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ChevronRight, Star } from 'lucide-react';
import { demoProjectsApi, demoCustomersApi, demoTasksApi, demoQueryKeys } from '@/demo/demoApi';
import { DEMO_ROUTES } from '@/demo/demoSeedData';
import { StageBadge, ProjectStatusBadge } from '@/components/ui/StatusBadge';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageContainer } from '@/components/layout/PageContainer';
import { usePageLayout } from '@/contexts/PageLayoutContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TaskRow } from '@/components/tasks/TaskRow';
import type { Task } from '@/types';
import { STAGE_ORDER } from '@/types';

export function DemoProjectTasks() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const queryClient = useQueryClient();
  const { setPageLayout } = usePageLayout();
  const [completingTaskId, setCompletingTaskId] = useState<number | null>(null);

  const { data: project, isPending, isError, refetch } = useQuery({
    queryKey: demoQueryKeys.project(projectId),
    queryFn: () => demoProjectsApi.get(projectId),
    enabled: !isNaN(projectId),
  });

  const { data: customers } = useQuery({
    queryKey: demoQueryKeys.customers,
    queryFn: demoCustomersApi.list,
  });

  const customer = customers?.find((c) => c.id === project?.customer_id);
  const projectName = project?.name ?? customer?.company_name ?? `Project #${projectId}`;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: demoQueryKeys.all });
  }

  const completeTaskMutation = useMutation({
    mutationFn: demoTasksApi.complete,
    onMutate: (taskId) => setCompletingTaskId(taskId),
    onSuccess: () => {
      invalidate();
      setCompletingTaskId(null);
    },
    onError: () => setCompletingTaskId(null),
  });

  useLayoutEffect(() => {
    if (!project) return;
    setPageLayout({
      title: `${projectName} — Tasks`,
    });
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
  const currentStageIndex = STAGE_ORDER.indexOf(project.current_stage);
  const stagesToShow = STAGE_ORDER.slice(Math.max(0, currentStageIndex));
  const stageSet = new Set(stagesToShow);
  const relevantTasks = tasks.filter((t) => stageSet.has(t.stage));
  const tasksByStage = relevantTasks.reduce<Record<string, Task[]>>((acc, task) => {
    if (!acc[task.stage]) acc[task.stage] = [];
    acc[task.stage].push(task);
    return acc;
  }, {});

  const completedTaskCount = tasks.filter((t) => t.status === 'completed').length;
  const overdueTaskCount = tasks.filter((t) => t.status === 'overdue').length;

  return (
    <PageContainer className="flex flex-col gap-6">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link to={DEMO_ROUTES.projects} className="hover:text-foreground underline-offset-4 hover:underline">
          Projects
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link to={DEMO_ROUTES.projectDetail(projectId)} className="hover:text-foreground underline-offset-4 hover:underline">
          {projectName}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Tasks</span>
      </nav>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{projectName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{completedTaskCount}/{tasks.length}</span> tasks completed
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
          <div className="flex items-center gap-2">
            <StageBadge stage={project.current_stage} />
            <ProjectStatusBadge status={project.status} />
          </div>
        </div>

        <Card data-demo-target="tasks-list">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-lg">Task list</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {tasks.length === 0 ? (
              <div className="p-6">
                <EmptyState title="No tasks" description="No tasks in this demo project." />
              </div>
            ) : relevantTasks.length === 0 ? (
              <div className="p-6">
                <EmptyState title="No tasks in current or upcoming stages" description="All tasks are in completed stages." />
              </div>
            ) : (
              stagesToShow.map((stage) => {
                const stageTasks = tasksByStage[stage] ?? [];
                if (stageTasks.length === 0) return null;
                return (
                  <div key={stage}>
                    <div className="px-5 py-2 bg-muted/50 border-b border-border">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {stage.replace('_', ' ')} Stage
                      </span>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow className="sr-only">
                          <TableHead>Task</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stageTasks.map((task) => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            onComplete={(taskId) => completeTaskMutation.mutate(taskId)}
                            isCompleting={completingTaskId === task.id}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
