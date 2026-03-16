import { Check } from 'lucide-react';
import { STAGE_ORDER, STAGE_LABELS, type OnboardingStage } from '../../types';

interface StageProgressProps {
  currentStage: OnboardingStage;
  status?: string;
}

export function StageProgress({ currentStage, status }: StageProgressProps) {
  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  const isCompleted = status === 'completed';

  return (
    <nav aria-label="Onboarding stage progress">
      <ol className="flex items-center gap-0">
        {STAGE_ORDER.map((stage, index) => {
          const isDone = isCompleted ? true : index < currentIndex;
          const isCurrent = !isCompleted && index === currentIndex;

          return (
            <li key={stage} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors ${
                    isDone
                      ? 'bg-primary border-primary text-primary-foreground'
                      : isCurrent
                        ? 'border-primary bg-background text-primary'
                        : 'border-border bg-background text-muted-foreground'
                  }`}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isDone ? <Check className="h-4 w-4" /> : <span>{index + 1}</span>}
                </div>
                <span
                  className={`mt-1.5 text-xs font-medium whitespace-nowrap ${
                    isDone || isCurrent ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {STAGE_LABELS[stage]}
                </span>
              </div>
              {index < STAGE_ORDER.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 mb-4 transition-colors ${
                    isDone ? 'bg-primary' : 'bg-border'
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
