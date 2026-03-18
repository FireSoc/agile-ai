import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import { useDemo, DEMO_TUTORIAL_STEPS } from '@/demo/DemoProvider';
import { cn } from '@/lib/utils';

export function DemoChecklist() {
  const { stepsCompleted, checklistDismissed, dismissChecklist } = useDemo();
  const location = useLocation();
  const [expanded, setExpanded] = useState(true);

  if (checklistDismissed) return null;

  const completedCount = stepsCompleted.size;

  return (
    <div className="border-b border-amber-200/60 bg-amber-50/50">
      <div className="flex items-center justify-between gap-2 px-4 py-2">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-2 text-left text-sm font-medium text-amber-900 hover:text-amber-800"
          aria-expanded={expanded}
        >
          <Lightbulb className="size-4 shrink-0 text-amber-600" aria-hidden />
          <span>Quick tour</span>
          <span className="text-amber-700 font-normal">
            ({completedCount}/{DEMO_TUTORIAL_STEPS.length - 1} done)
          </span>
          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
        <button
          type="button"
          onClick={dismissChecklist}
          className="rounded px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"
        >
          Explore freely
        </button>
      </div>
      {expanded && (
        <ul className="list-none px-4 pb-3 pt-0 space-y-1" role="list">
          {DEMO_TUTORIAL_STEPS.filter((s) => s.id !== 'explore').map((step) => {
            const done = stepsCompleted.has(step.id);
            const isCurrent = step.route && (
              location.pathname === step.route ||
              (step.id === 'dashboard' && location.pathname === '/demo/dashboard') ||
              (step.id === 'projectDetail' && /^\/demo\/projects\/\d+$/.test(location.pathname)) ||
              (step.id === 'projectTasks' && /^\/demo\/projects\/\d+\/tasks$/.test(location.pathname))
            );
            return (
              <li key={step.id}>
                {step.route ? (
                  <Link
                    to={step.route}
                    className={cn(
                      'flex items-center gap-2 rounded px-2 py-1 text-sm',
                      done && 'text-amber-800',
                      !done && isCurrent && 'bg-amber-100 font-medium text-amber-900',
                      !done && !isCurrent && 'text-amber-800 hover:bg-amber-100'
                    )}
                  >
                    {done ? (
                      <CheckCircle2 className="size-4 shrink-0 text-amber-600" aria-hidden />
                    ) : (
                      <span className="size-4 shrink-0 rounded-full border-2 border-amber-400" aria-hidden />
                    )}
                    {step.label}
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
