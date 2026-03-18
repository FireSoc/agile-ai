import { useLayoutEffect, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDemo, type DemoStepId } from './DemoProvider';
import { DEMO_ROUTES } from './demoSeedData';

type NextRoute = string | null | ((pathname: string) => string | null);

const DEMO_OVERLAY_STEPS: Array<{
  stepId: DemoStepId;
  routeMatch: (pathname: string) => boolean;
  targetSelector?: string;
  message: string;
  placement: 'right' | 'bottom' | 'center';
  nextRoute: NextRoute;
  /** If true, show "Explore freely" + "Create account" instead of "Got it" + "Explore freely" */
  isThankYou?: boolean;
}> = [
  {
    stepId: 'dashboard',
    routeMatch: (p) => p === '/demo/dashboard',
    targetSelector: '[data-demo-target="dashboard-welcome"]',
    message:
      'Hello, welcome to the interactive demo for Agile AI. This product helps you manage customer onboarding: track projects by stage, spot risk early, and run simulations to plan go-live. This dashboard is your home base—you’ll see active projects, at-risk items, and quick links. When you’re ready, we’ll look at Customers next.',
    placement: 'right',
    nextRoute: DEMO_ROUTES.customers,
  },
  {
    stepId: 'customers',
    routeMatch: (p) => p === '/demo/customers',
    targetSelector: '[data-demo-target="customers-list"]',
    message:
      'This is your Customers page. Here you see the companies you’re onboarding—each customer has projects tied to their journey. In the full product you can add and manage customers here. Next we’ll look at your onboarding projects.',
    placement: 'right',
    nextRoute: DEMO_ROUTES.projects,
  },
  {
    stepId: 'projects',
    routeMatch: (p) => p === '/demo/projects',
    targetSelector: '[data-demo-target="projects-list"]',
    message:
      'These are your onboarding projects—one per customer journey. Each project has a stage, risk level, and tasks. This page lets you see everything at a glance. Click any project to open its detail page.',
    placement: 'right',
    nextRoute: null,
  },
  {
    stepId: 'projectDetail',
    routeMatch: (p) => /^\/demo\/projects\/\d+$/.test(p),
    targetSelector: '[data-demo-target="project-task-list"]',
    message:
      'This is the project detail page. You’ll see stage progress, risk, tasks, and activity for this onboarding. Take a look around. When you’re ready, open the task list below to see and complete tasks.',
    placement: 'right',
    nextRoute: null,
  },
  {
    stepId: 'projectTasks',
    routeMatch: (p) => /^\/demo\/projects\/\d+\/tasks$/.test(p),
    targetSelector: '[data-demo-target="tasks-list"]',
    message:
      'These are the tasks for this stage. Completing them advances the project through the onboarding flow. In the full environment you can add more tasks here. Next, try the Simulator to see how risk and timelines are modeled.',
    placement: 'right',
    nextRoute: DEMO_ROUTES.simulator,
  },
  {
    stepId: 'simulator',
    routeMatch: (p) => p === '/demo/simulator',
    targetSelector: '[data-demo-target="simulator-run"]',
    message:
      'The Simulator models your onboarding timeline and risk using tasks and delay assumptions—no login required. It shows projected go-live, stage-by-stage results, and recommendations. Select a project above and click Run simulation to see the output.',
    placement: 'bottom',
    nextRoute: null,
  },
  {
    stepId: 'simulatorOutput',
    routeMatch: (p) => p === '/demo/simulator',
    targetSelector: '[data-demo-target="simulator-results"]',
    message:
      'Here’s what the simulation output means: the Summary shows whether the project is on track or at risk, plus TTFV (time to first value) and total duration. The stage breakdown shows how each phase performs and any blockers. Risk signals and recommendations help you decide what to do next.',
    placement: 'right',
    nextRoute: null,
  },
  {
    stepId: 'thankYou',
    routeMatch: (p) => p === '/demo/simulator',
    message:
      'Thank you for trying the demo at Agile. You can now explore freely or create your own account to use the full product.',
    placement: 'center',
    nextRoute: null,
    isThankYou: true,
  },
];

function getStepForPathname(pathname: string, stepsCompleted: Set<DemoStepId>) {
  return DEMO_OVERLAY_STEPS.find(
    (s) => s.routeMatch(pathname) && !stepsCompleted.has(s.stepId)
  );
}

function resolveNextRoute(nextRoute: NextRoute, pathname: string): string | null {
  if (nextRoute == null) return null;
  if (typeof nextRoute === 'function') return nextRoute(pathname);
  return nextRoute;
}

/** Gap between the target component and the panel (panel placed just below target). */
const PANEL_BELOW_GAP = 12;
const CENTER_BOX_WIDTH = 360;
const CENTER_BOX_MIN_HEIGHT = 160;

const SCROLL_CONTAINER_SELECTOR = '.main-content-scroll';

export function DemoTourOverlay() {
  const location = useLocation();
  const navigate = useNavigate();
  const { checklistDismissed, stepsCompleted, markStepComplete, dismissChecklist } = useDemo();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [boxRect, setBoxRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  /** When true, show thank-you step immediately after "Got it" on simulator output (avoids context-update timing). */
  const [showThankYouNow, setShowThankYouNow] = useState(false);

  const stepFromPath = getStepForPathname(location.pathname, stepsCompleted);
  const step =
    showThankYouNow && location.pathname === '/demo/simulator'
      ? DEMO_OVERLAY_STEPS.find((s) => s.stepId === 'thankYou')
      : stepFromPath;
  const showOverlay = !checklistDismissed && step != null && !stepsCompleted.has(step.stepId);

  useEffect(() => {
    if (step?.stepId === 'projectDetail' && !stepsCompleted.has('projects')) {
      markStepComplete('projects');
    }
  }, [step?.stepId, stepsCompleted.has('projects'), markStepComplete]);

  const measure = useCallback(() => {
    if (!step || !showOverlay) {
      setTargetRect(null);
      setBoxRect(null);
      return;
    }

    const scrollEl = document.querySelector(SCROLL_CONTAINER_SELECTOR);
    const mainRect = scrollEl?.getBoundingClientRect();
    const padding = 16;
    const mainLeft = mainRect ? mainRect.left + padding : padding;
    const mainRight = mainRect ? mainRect.right - padding : window.innerWidth - padding;
    const mainTop = mainRect ? mainRect.top + padding : padding;
    const mainBottom = mainRect ? mainRect.bottom - padding : window.innerHeight - padding;

    if (step.placement === 'center') {
      const boxWidth = CENTER_BOX_WIDTH;
      const boxHeight = CENTER_BOX_MIN_HEIGHT;
      const left = mainLeft + (mainRight - mainLeft) / 2 - boxWidth / 2;
      const top = mainTop + (mainBottom - mainTop) / 2 - boxHeight / 2;
      setTargetRect(null);
      setBoxRect({
        left: Math.max(mainLeft, Math.min(left, mainRight - boxWidth)),
        top: Math.max(mainTop, Math.min(top, mainBottom - boxHeight)),
        width: boxWidth,
        height: boxHeight,
      });
      return;
    }

    const selector = step.targetSelector;
    if (!selector) {
      setTargetRect(null);
      setBoxRect(null);
      return;
    }

    const el = document.querySelector(selector);
    if (!el) {
      setTargetRect(null);
      setBoxRect(null);
      return;
    }

    const rect = el.getBoundingClientRect();
    setTargetRect(rect);
    const boxWidth = 280;
    const boxHeight = 120;
    const left = Math.max(mainLeft, Math.min(mainLeft + (mainRight - mainLeft) / 2 - boxWidth / 2, mainRight - boxWidth));
    const belowTop = rect.bottom + PANEL_BELOW_GAP;
    const minDistanceFromBottom = 80;
    // Prefer just below target; if that would sit at the very bottom, place above target instead.
    let top: number;
    if (belowTop + boxHeight > mainBottom - minDistanceFromBottom) {
      top = rect.top - boxHeight - PANEL_BELOW_GAP;
      if (top < mainTop) top = mainTop;
      if (top + boxHeight > mainBottom) top = mainBottom - boxHeight;
    } else {
      top = belowTop;
      if (top + boxHeight > mainBottom) top = mainBottom - boxHeight;
      if (top < mainTop) top = mainTop;
    }
    setBoxRect({ left, top, width: boxWidth, height: boxHeight });
  }, [step, showOverlay]);

  useLayoutEffect(() => {
    measure();
    window.addEventListener('resize', measure);

    const scrollEl = document.querySelector(SCROLL_CONTAINER_SELECTOR);
    const target = scrollEl ?? window;
    const handleScroll = () => measure();
    target.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('resize', measure);
      target.removeEventListener('scroll', handleScroll);
    };
  }, [measure]);

  // When simulatorOutput step is active but target isn't in DOM yet (user clicked Got it before running simulation),
  // observe the DOM and call measure() as soon as simulator-results appears.
  useEffect(() => {
    if (step?.stepId !== 'simulatorOutput' || !showOverlay || boxRect !== null) return;
    const selector = '[data-demo-target="simulator-results"]';
    if (document.querySelector(selector)) {
      measure();
      return;
    }
    const observer = new MutationObserver(() => {
      if (document.querySelector(selector)) {
        observer.disconnect();
        measure();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [step?.stepId, showOverlay, boxRect, measure]);

  const handleGotIt = useCallback(() => {
    if (!step) return;
    markStepComplete(step.stepId);
    if (step.stepId === 'simulatorOutput') setShowThankYouNow(true);
    const next = resolveNextRoute(step.nextRoute, location.pathname);
    if (next) navigate(next);
  }, [step, markStepComplete, navigate, location.pathname]);

  const handleExploreFreely = useCallback(() => {
    if (step) markStepComplete(step.stepId);
    setShowThankYouNow(false);
    dismissChecklist();
  }, [step, markStepComplete, dismissChecklist]);

  if (!showOverlay || !step || !boxRect) return null;

  const content = (
    <div className="fixed inset-0 z-50 pointer-events-none" aria-hidden="true">
      <div
        className="pointer-events-auto absolute rounded-xl border-2 border-sky-300 bg-sky-100 shadow-lg dark:border-sky-600 dark:bg-sky-900/95 p-4 max-w-[360px]"
        style={{
          left: boxRect.left,
          top: boxRect.top,
          width: boxRect.width,
          minHeight: boxRect.height,
        }}
        role="status"
        aria-live="polite"
      >
        <p className="text-sm text-sky-900 dark:text-sky-100 mb-3 whitespace-pre-line">{step.message}</p>
        <div className="flex flex-wrap gap-2">
          {step.isThankYou ? (
            <>
              <button
                type="button"
                onClick={handleExploreFreely}
                className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:bg-sky-700 dark:hover:bg-sky-600 pointer-events-auto"
              >
                Explore freely
              </button>
              <Link
                to="/signup"
                onClick={() => { if (step) markStepComplete(step.stepId); setShowThankYouNow(false); dismissChecklist(); }}
                className="rounded-md border border-sky-400 bg-transparent px-3 py-1.5 text-xs font-medium text-sky-800 hover:bg-sky-200 dark:border-sky-500 dark:text-sky-200 dark:hover:bg-sky-800 pointer-events-auto inline-flex items-center"
              >
                Create account
              </Link>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleGotIt}
                className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:bg-sky-700 dark:hover:bg-sky-600 pointer-events-auto"
              >
                Got it
              </button>
              <button
                type="button"
                onClick={handleExploreFreely}
                className="rounded-md border border-sky-400 bg-transparent px-3 py-1.5 text-xs font-medium text-sky-800 hover:bg-sky-200 dark:border-sky-500 dark:text-sky-200 dark:hover:bg-sky-800 pointer-events-auto"
              >
                Explore freely
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
