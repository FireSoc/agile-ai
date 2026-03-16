import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  BookOpen,
  FileDown,
  FlaskConical,
  Inbox,
  ChevronDown,
  ChevronRight,
  Zap,
  Wrench,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const CORE_NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/simulator', icon: FlaskConical, label: 'Simulator' },
  { to: '/ops-inbox', icon: Inbox, label: 'Ops Inbox' },
];

const WORKSPACE_NAV = [
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/customers', icon: Users, label: 'Customers' },
];

const TOOLS_NAV = [
  { to: '/playbooks', icon: BookOpen, label: 'Playbooks' },
  { to: '/deals/import', icon: FileDown, label: 'Import deal' },
];

const toolsPaths = TOOLS_NAV.map(({ to }) => to);

function isToolsActive(pathname: string) {
  return toolsPaths.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

function NavGroup({
  label,
  items,
}: {
  label: string;
  items: Array<{ to: string; icon: React.ComponentType<{ className?: string }>; label: string }>;
}) {
  return (
    <div className="space-y-1">
      <p className="px-2.5 py-1.5 text-xs font-medium uppercase tracking-wider text-white/50 md:px-3">
        {label}
      </p>
      {items.map(({ to, icon: Icon, label: itemLabel }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors md:px-3',
              isActive
                ? 'bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            )
          }
        >
          <Icon className="size-5 shrink-0" aria-hidden />
          <span className="hidden md:inline">{itemLabel}</span>
        </NavLink>
      ))}
    </div>
  );
}

export function Sidebar() {
  const location = useLocation();
  const [toolsOpen, setToolsOpen] = useState(() => isToolsActive(location.pathname));
  const expanded = toolsOpen || isToolsActive(location.pathname);

  return (
    <aside
      className="flex w-14 flex-shrink-0 flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)] md:w-56"
      aria-label="Main navigation"
    >
      <div className="flex h-14 items-center gap-2 px-3 md:px-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] md:size-10">
          <Zap className="size-4 md:size-5" aria-hidden />
        </div>
        <div className="hidden flex-1 md:block">
          <p className="text-sm font-semibold leading-none">Agile</p>
          <p className="mt-0.5 text-xs text-white/70 leading-none">Onboarding</p>
        </div>
      </div>
      <Separator className="bg-white/10" />
      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-4">
        <NavGroup label="Core" items={CORE_NAV} />
        <NavGroup label="Workspace" items={WORKSPACE_NAV} />
        <div className="space-y-1">
          <p className="px-2.5 py-1.5 text-xs font-medium uppercase tracking-wider text-white/50 md:px-3">
            Tools
          </p>
          <button
            type="button"
            onClick={() => setToolsOpen((o) => !o)}
            className={cn(
              'flex w-full items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors md:px-3',
              isToolsActive(location.pathname)
                ? 'bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            )}
            aria-expanded={expanded}
            aria-controls="tools-nav"
          >
            <span className="flex items-center gap-2.5">
              <Wrench className="size-5 shrink-0" aria-hidden />
              <span className="hidden md:inline">More</span>
            </span>
            {toolsOpen ? (
              <ChevronDown className="size-4 shrink-0" aria-hidden />
            ) : (
              <ChevronRight className="size-4 shrink-0" aria-hidden />
            )}
          </button>
          <div
            id="tools-nav"
            className="mt-1 space-y-1 border-l border-white/20 pl-2 md:ml-3"
            hidden={!expanded}
          >
            {TOOLS_NAV.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors md:px-3',
                    isActive
                      ? 'bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  )
                }
                onClick={() => setToolsOpen(true)}
              >
                <Icon className="size-5 shrink-0" aria-hidden />
                <span className="hidden md:inline">{label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
      <Separator className="bg-white/10" />
      <div className="px-3 py-3 md:px-4">
        <p className="text-xs text-white/60">Onboarding Ops</p>
      </div>
    </aside>
  );
}
