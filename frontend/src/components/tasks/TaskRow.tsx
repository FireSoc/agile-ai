import { CheckCircle2, Calendar, Star } from 'lucide-react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { TaskStatusBadge, Badge } from '@/components/ui/StatusBadge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { cn } from '@/lib/utils';
import type { Task } from '../../types';

export interface TaskRowProps {
  task: Task;
  onComplete: (id: number) => void;
  isCompleting: boolean;
  onSelect?: (task: Task) => void;
}

export function TaskRow({ task, onComplete, onSelect, isCompleting }: TaskRowProps) {
  const isActionable = task.status !== 'completed' && task.status !== 'blocked';

  return (
    <TableRow
      className={cn(
        task.status === 'overdue' && 'bg-destructive/5',
        onSelect && 'cursor-pointer hover:bg-muted/50'
      )}
      onClick={() => onSelect?.(task)}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(task);
              }
            }
          : undefined
      }
      aria-label={onSelect ? `View details for task: ${task.title}` : undefined}
    >
      <TableCell className="px-5 py-3.5">
        <div>
          <div className="flex items-center gap-1.5">
            <span className={cn('text-sm font-medium', task.status === 'completed' && 'text-muted-foreground line-through')}>
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
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{task.description}</p>
          )}
        </div>
      </TableCell>
      <TableCell className="px-5 py-3.5">
        <TaskStatusBadge status={task.status} />
      </TableCell>
      <TableCell className="px-5 py-3.5">
        {task.due_date ? (
          <div className={cn('flex items-center gap-1 text-xs', task.status === 'overdue' && 'text-destructive font-medium')}>
            <Calendar className="h-3.5 w-3.5" />
            {new Date(task.due_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
        {isActionable && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            aria-label="Mark task complete"
            onClick={(e) => {
              e.stopPropagation();
              onComplete(task.id);
            }}
            disabled={isCompleting}
          >
            {isCompleting ? (
              <LoadingSpinner size="sm" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            Mark Complete
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
