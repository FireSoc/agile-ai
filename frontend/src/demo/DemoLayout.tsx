import { useState } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { PanelLeft, PanelLeftClose, RotateCcw, Home } from 'lucide-react';
import { PageLayoutProvider, usePageLayout } from '@/contexts/PageLayoutContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useDemo } from './DemoProvider';
import { DEMO_ROUTES } from './demoSeedData';
import { DemoSidebar } from './DemoSidebar';
import { DemoTourOverlay } from '@/demo/DemoTourOverlay';

const SIDEBAR_STORAGE_KEY = 'demo-sidebar-collapsed';

function getStoredSidebarCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function DemoTopbar({
  isSidebarCollapsed,
  onToggleSidebar,
}: {
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}) {
  const { pageLayout } = usePageLayout();
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-4 md:px-6">
      <div className="min-w-0 flex-1 flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isSidebarCollapsed ? <PanelLeft className="size-5" aria-hidden /> : <PanelLeftClose className="size-5" aria-hidden />}
        </button>
        {pageLayout.title ? (
          <>
            <h1 className="truncate text-lg font-semibold text-foreground">{pageLayout.title}</h1>
            {pageLayout.subtitle && (
              <span className="hidden truncate text-sm text-muted-foreground sm:inline">{pageLayout.subtitle}</span>
            )}
            {pageLayout.action != null && <span className="flex shrink-0">{pageLayout.action}</span>}
          </>
        ) : null}
      </div>
    </header>
  );
}

export function DemoLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { resetDemo, dismissChecklist } = useDemo();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(getStoredSidebarCollapsed);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <PageLayoutProvider>
      <div
        className="flex min-h-screen w-full bg-muted/30"
        data-sidebar-collapsed={isSidebarCollapsed || undefined}
      >
        <DemoSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
        <div
          className="flex min-h-0 flex-1 flex-col min-w-0"
          data-sidebar-collapsed={isSidebarCollapsed || undefined}
        >
          <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-indigo-200 bg-indigo-50/90 px-4 md:px-6 dark:border-indigo-800 dark:bg-indigo-950/80">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="rounded-full bg-indigo-200 px-2.5 py-0.5 text-xs font-semibold text-indigo-900 dark:bg-indigo-700 dark:text-indigo-100">
                Demo
              </span>
              <span className="hidden text-sm text-indigo-800 dark:text-indigo-200 sm:inline">
                Changes reset when you refresh or click Reset demo.
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={dismissChecklist}
                className="inline-flex items-center gap-1.5 rounded-md border border-indigo-300 bg-white px-3 py-1.5 text-sm font-medium text-indigo-800 hover:bg-indigo-100 dark:border-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-100 dark:hover:bg-indigo-800/80"
              >
                Explore freely
              </button>
              <button
                type="button"
                onClick={() => {
                  resetDemo();
                  navigate(DEMO_ROUTES.dashboard);
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-indigo-300 bg-white px-3 py-1.5 text-sm font-medium text-indigo-800 hover:bg-indigo-100 dark:border-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-100 dark:hover:bg-indigo-800/80"
              >
                <RotateCcw className="size-3.5" aria-hidden />
                Reset demo
              </button>
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 rounded-md border border-indigo-300 bg-white px-3 py-1.5 text-sm font-medium text-indigo-800 hover:bg-indigo-100 dark:border-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-100 dark:hover:bg-indigo-800/80"
              >
                <Home className="size-3.5" aria-hidden />
                Exit to home
              </Link>
            </div>
          </header>
          <DemoTopbar isSidebarCollapsed={isSidebarCollapsed} onToggleSidebar={toggleSidebar} />
          <main className="flex min-h-0 flex-1 flex-col overflow-visible bg-background relative">
            <div className="main-content-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-4">
              <ErrorBoundary>
                <div
                  key={location.pathname}
                  className="animate-in fade-in-0 duration-200"
                >
                  <Outlet />
                </div>
              </ErrorBoundary>
            </div>
            <DemoTourOverlay />
          </main>
        </div>
      </div>
    </PageLayoutProvider>
  );
}
