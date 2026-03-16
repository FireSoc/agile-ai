import type { ReactNode } from 'react';
import { Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterBarProps {
  children: ReactNode;
  label?: string;
  className?: string;
}

export function FilterBar({ children, label = 'Filter', className }: FilterBarProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3',
        className
      )}
      role="group"
      aria-label={label}
    >
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Filter className="size-3.5" aria-hidden />
        {label}
      </span>
      {children}
    </div>
  );
}
