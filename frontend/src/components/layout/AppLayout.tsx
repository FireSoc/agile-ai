import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { PageLayoutProvider } from '@/contexts/PageLayoutContext';
import { ErrorBoundary } from '../ErrorBoundary';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

const SIDEBAR_STORAGE_KEY = 'app-sidebar-collapsed';

function getStoredSidebarCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function AppLayout() {
  const location = useLocation();
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
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
        <div
          className="flex min-h-0 flex-1 flex-col min-w-0"
          data-sidebar-collapsed={isSidebarCollapsed || undefined}
        >
          <Topbar
            isSidebarCollapsed={isSidebarCollapsed}
            onToggleSidebar={toggleSidebar}
          />
          <main className="flex min-h-0 flex-1 flex-col overflow-visible bg-background">
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
          </main>
        </div>
      </div>
    </PageLayoutProvider>
  );
}
