import { useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/customers': 'Customers',
  '/projects': 'Projects',
  '/calendar': 'Calendar',
  '/simulator': 'Decision Sandbox',
  '/timeline': 'Deadline Timeline',
};

interface TopbarProps {
  action?: ReactNode;
}

export function Topbar({ action }: TopbarProps) {
  const { pathname } = useLocation();

  const title =
    PAGE_TITLES[pathname] ??
    (pathname.startsWith('/projects/') ? 'Project Detail' : 'Agile');

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
      <h1 className="text-base font-semibold text-slate-800">{title}</h1>
      {action && <div>{action}</div>}
    </header>
  );
}
