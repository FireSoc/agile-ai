import { useLayoutEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ChevronRight, Plus, Star } from 'lucide-react';
import { projectsApi } from '../api/projects';
import { tasksApi } from '../api/tasks';
import { customersApi } from '../api/customers';
import { StageBadge, ProjectStatusBadge } from '../components/ui/StatusBadge';
import { PageLoading, LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { EmptyState } from '../components/ui/EmptyState';
import { PageContainer } from '@/components/layout/PageContainer';
import { usePageLayout } from '@/contexts/PageLayoutContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TaskRow } from '@/components/tasks/TaskRow';
import type { Task, OnboardingStage, TaskCreatePayload } from '../types';
import { STAGE_ORDER, STAGE_LABELS } from '../types';

const DEFAULT_TASK_FORM = {
  title: '',
  stage: 'kickoff' as OnboardingStage,
  description: '',
  due_date: '',
  required_for_stage_completion: true,
  is_customer_required: false,
  requires_setup_data: false,
};

export function ProjectTasks() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const queryClient = useQueryClient();
  const { setPageLayout } = usePageLayout();

  const [completingTaskId, setCompletingTaskId] = useState<number | null>(null);
  const [addTaskSheetOpen, setAddTaskSheetOpen] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState(DEFAULT_TASK_FORM);

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
  const projectName = project?.name ?? customer?.company_name ?? `Project #${projectId}`;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    queryClient.invalidateQueries({ queryKey: ['projects'] });
  }

  const completeTaskMutation = useMutation({
    mutationFn: tasksApi.complete,
    onMutate: (taskId) => setCompletingTaskId(taskId),
    onSuccess: () => {
      invalidate();
      setCompletingTaskId(null);
    },
    onError: () => setCompletingTaskId(null),
  });

  const createTaskMutation = useMutation({
    mutationFn: (payload: TaskCreatePayload) =>
      projectsApi.createTask(projectId, payload),
    onSuccess: () => {
      invalidate();
      setAddTaskSheetOpen(false);
      setNewTaskForm(DEFAULT_TASK_FORM);
    },
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
        <Link to="/projects/list" className="hover:text-foreground underline-offset-4 hover:underline">
          Projects
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link to={`/projects/${projectId}`} className="hover:text-foreground underline-offset-4 hover:underline">
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
              <span className="font-medium text-foreground">{completedTaskCount}/{tasks.length}</span>
              {' '}tasks completed
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
            {project.status !== 'completed' && (
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  setNewTaskForm((f) => ({ ...f, stage: project.current_stage, title: '', description: '', due_date: '' }));
                  setAddTaskSheetOpen(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Add task
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-lg">Task list</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {tasks.length === 0 ? (
              <div className="p-6">
                <EmptyState title="No tasks" description="Tasks will be generated when the project is created." />
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

      <Sheet open={addTaskSheetOpen} onOpenChange={setAddTaskSheetOpen}>
        <SheetContent side="right" className="flex flex-col">
          <SheetHeader>
            <SheetTitle>Add task</SheetTitle>
            <p className="text-sm text-muted-foreground">Define a new task for this project.</p>
          </SheetHeader>
          <form
            className="flex flex-1 flex-col gap-4 p-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newTaskForm.title.trim()) return;
              const payload: TaskCreatePayload = {
                title: newTaskForm.title.trim(),
                stage: newTaskForm.stage,
                description: newTaskForm.description.trim() || undefined,
                due_date: newTaskForm.due_date ? `${newTaskForm.due_date}T12:00:00.000Z` : undefined,
                required_for_stage_completion: newTaskForm.required_for_stage_completion,
                is_customer_required: newTaskForm.is_customer_required,
                requires_setup_data: newTaskForm.requires_setup_data,
              };
              createTaskMutation.mutate(payload);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="new-task-title">Title *</Label>
              <Input
                id="new-task-title"
                value={newTaskForm.title}
                onChange={(e) => setNewTaskForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Send welcome pack"
                required
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-task-stage">Stage</Label>
              <Select
                value={newTaskForm.stage}
                onValueChange={(v) => setNewTaskForm((f) => ({ ...f, stage: v as OnboardingStage }))}
              >
                <SelectTrigger id="new-task-stage" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGE_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STAGE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-task-description">Description (optional)</Label>
              <textarea
                id="new-task-description"
                value={newTaskForm.description}
                onChange={(e) => setNewTaskForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Brief description of the task"
                rows={2}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-task-due">Due date (optional)</Label>
              <Input
                id="new-task-due"
                type="date"
                value={newTaskForm.due_date}
                onChange={(e) => setNewTaskForm((f) => ({ ...f, due_date: e.target.value }))}
                className="w-full"
              />
            </div>
            <div className="space-y-3 border-t border-border pt-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newTaskForm.required_for_stage_completion}
                  onChange={(e) => setNewTaskForm((f) => ({ ...f, required_for_stage_completion: e.target.checked }))}
                  className="rounded border-input"
                />
                Required for stage completion
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newTaskForm.is_customer_required}
                  onChange={(e) => setNewTaskForm((f) => ({ ...f, is_customer_required: e.target.checked }))}
                  className="rounded border-input"
                />
                Customer required
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newTaskForm.requires_setup_data}
                  onChange={(e) => setNewTaskForm((f) => ({ ...f, requires_setup_data: e.target.checked }))}
                  className="rounded border-input"
                />
                Requires setup data
              </label>
            </div>
            <div className="mt-auto flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setAddTaskSheetOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTaskMutation.isPending || !newTaskForm.title.trim()}>
                {createTaskMutation.isPending ? <LoadingSpinner size="sm" /> : <Plus className="h-3.5 w-3.5" />}
                Add task
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </PageContainer>
  );
}
