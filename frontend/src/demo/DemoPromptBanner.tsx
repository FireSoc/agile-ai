import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useDemo, type DemoStepId } from '@/demo/DemoProvider';
import { cn } from '@/lib/utils';

interface DemoPromptBannerProps {
  stepId: DemoStepId;
  message: string;
  className?: string;
}

export function DemoPromptBanner({ stepId, message, className }: DemoPromptBannerProps) {
  const { markStepComplete, checklistDismissed } = useDemo();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    markStepComplete(stepId);
  }, [stepId, markStepComplete]);

  if (checklistDismissed || dismissed) return null;

  return (
    <div
      role="status"
      className={cn(
        'flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm',
        className
      )}
    >
      <p className="min-w-0 flex-1 text-foreground">{message}</p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded p-1 text-muted-foreground hover:bg-primary/10 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label="Dismiss"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
