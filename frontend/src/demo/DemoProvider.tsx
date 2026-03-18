import { useEffect, createContext, useContext, useCallback, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribe, resetDemo } from './demoStore';
import { demoQueryKeys } from './demoApi';

export const DEMO_TUTORIAL_STEPS = [
  { id: 'dashboard', label: 'Welcome & dashboard', route: '/demo/dashboard' },
  { id: 'customers', label: 'Meet your customers', route: '/demo/customers' },
  { id: 'projects', label: 'View onboarding projects', route: '/demo/projects' },
  { id: 'projectDetail', label: 'Explore project details', route: '/demo/projects/2' },
  { id: 'projectTasks', label: 'Open task list', route: '/demo/projects/2/tasks' },
  { id: 'simulator', label: 'Try the simulator', route: '/demo/simulator' },
  { id: 'explore', label: 'Explore freely', route: null },
] as const;

export type DemoStepId =
  | (typeof DEMO_TUTORIAL_STEPS)[number]['id']
  | 'simulatorOutput'
  | 'thankYou';

interface DemoContextValue {
  resetDemo: () => void;
  stepsCompleted: Set<DemoStepId>;
  markStepComplete: (step: DemoStepId) => void;
  checklistDismissed: boolean;
  dismissChecklist: () => void;
}

const DemoContext = createContext<DemoContextValue>({
  resetDemo: () => {},
  stepsCompleted: new Set(),
  markStepComplete: () => {},
  checklistDismissed: false,
  dismissChecklist: () => {},
});

export function DemoProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [stepsCompleted, setStepsCompleted] = useState<Set<DemoStepId>>(() => new Set());
  const [checklistDismissed, setChecklistDismissed] = useState(false);

  const reset = useCallback(() => {
    resetDemo();
    setStepsCompleted(new Set());
    setChecklistDismissed(false);
    queryClient.invalidateQueries({ queryKey: demoQueryKeys.all });
  }, [queryClient]);

  const markStepComplete = useCallback((step: DemoStepId) => {
    setStepsCompleted((prev) => new Set(prev).add(step));
  }, []);

  const dismissChecklist = useCallback(() => {
    setChecklistDismissed(true);
  }, []);

  useEffect(() => {
    return subscribe(() => {
      queryClient.invalidateQueries({ queryKey: demoQueryKeys.all });
    });
  }, [queryClient]);

  return (
    <DemoContext.Provider
      value={{
        resetDemo: reset,
        stepsCompleted,
        markStepComplete,
        checklistDismissed,
        dismissChecklist,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  return useContext(DemoContext);
}
