import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  BookOpen,
  FlaskConical,
  ChevronDown,
  ChevronRight,
  Wrench,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { AgileLogo } from '@/components/AgileLogo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { DEMO_ROUTES } from '@/demo/demoSeedData';
import { cn } from '@/lib/utils';

const CORE_NAV = [
  { to: DEMO_ROUTES.dashboard, icon: LayoutDashboard, label: 'Dashboard' },
  { to: DEMO_ROUTES.simulator, icon: FlaskConical, label: 'Simulator' },
];

const WORKSPACE_NAV = [
  { to: DEMO_ROUTES.projects, icon: FolderKanban, label: 'Projects' },
  { to: DEMO_ROUTES.customers, icon: Users, label: 'Customers' },
];

const TOOLS_NAV = [{ to: DEMO_ROUTES.playbooks, icon: BookOpen, label: 'Playbooks' }];

const toolsPaths = TOOLS_NAV.map(({ to }) => to);

function isToolsActive(pathname: string) {
  return toolsPaths.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

function NavLabel({ isCollapsed, children }: { isCollapsed: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-200',
        isCollapsed ? 'max-w-0 opacity-0' : 'max-w-xs opacity-100'
      )}
    >
      {children}
    </span>
  );
}

function NavGroup({
  items,
  onNavClick,
  isCollapsed,
}: {
  items: Array<{ to: string; icon: React.ComponentType<{ className?: string }>; label: string }>;
  onNavClick: (to: string) => void;
  isCollapsed: boolean;
}) {
  return (
    <div className="space-y-1">
      {items.map(({ to, icon: Icon, label: itemLabel }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 rounded-lg py-2 text-sm font-medium transition-colors',
              isCollapsed ? 'justify-center px-0' : 'px-3',
              isActive
                ? 'bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]'
                : 'text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]/20 hover:text-[var(--sidebar-foreground)]'
            )
          }
          onClick={() => onNavClick(to)}
          title={isCollapsed ? itemLabel : undefined}
        >
          <Icon className="size-5 shrink-0" aria-hidden />
          <NavLabel isCollapsed={isCollapsed}>{itemLabel}</NavLabel>
        </NavLink>
      ))}
    </div>
  );
}

interface DemoSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function DemoSidebar({ isCollapsed, onToggleCollapse }: DemoSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [toolsOpen, setToolsOpen] = useState(() => isToolsActive(location.pathname));
  const expanded = toolsOpen || isToolsActive(location.pathname);

  const handleNavClick = (to: string) => {
    navigate(to);
  };

  return (
    <aside
      className={cn(
        'flex flex-shrink-0 flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)] transition-[width] duration-200 min-h-0',
        'w-14 md:w-16',
        !isCollapsed && 'md:w-56',
        'h-full md:h-[calc(100vh-1rem)] md:my-2 md:mr-2 md:shadow-sm',
        isCollapsed ? 'md:ml-0 md:rounded-l-none md:rounded-r-xl' : 'md:ml-2 md:rounded-xl'
      )}
      aria-label="Demo navigation"
    >
      <div
        className={cn(
          'flex h-16 items-center gap-2 overflow-hidden',
          isCollapsed ? 'justify-center px-2' : 'px-3 md:px-4'
        )}
      >
        <div className="flex size-9 shrink-0 items-center justify-center md:size-10">
          <AgileLogo size="sm" className="size-5 md:size-6" />
        </div>
        <div
          className={cn(
            'overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-200 min-w-0',
            isCollapsed ? 'max-w-0 opacity-0' : 'max-w-xs opacity-100'
          )}
        >
          <p className="text-sm font-semibold leading-none">Agile</p>
          <p className="mt-0.5 text-xs text-[var(--sidebar-foreground)]/80 leading-none">Demo</p>
        </div>
      </div>
      <Separator className="bg-[var(--sidebar-border)]" />
      <nav className={cn('flex-1 space-y-1 overflow-y-auto py-4', isCollapsed ? 'px-0' : 'px-2')}>
        <NavGroup items={CORE_NAV} onNavClick={handleNavClick} isCollapsed={isCollapsed} />
        <div className="pt-1">
          <NavGroup items={WORKSPACE_NAV} onNavClick={handleNavClick} isCollapsed={isCollapsed} />
        </div>
        <div className="space-y-1 pt-1">
          {isCollapsed ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg py-2 text-sm font-medium transition-colors',
                  isCollapsed ? 'justify-center px-0 min-w-0' : 'px-3',
                  isToolsActive(location.pathname)
                    ? 'bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]'
                    : 'text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]/20'
                )}
                aria-label="Tools menu"
              >
                {isCollapsed ? (
                  <span className="flex size-full items-center justify-center">
                    <Wrench className="size-5 shrink-0" aria-hidden />
                  </span>
                ) : (
                  <Wrench className="size-5 shrink-0" aria-hidden />
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="start" sideOffset={8}>
                {TOOLS_NAV.map(({ to, icon: Icon, label }) => (
                  <DropdownMenuItem key={to} onClick={() => handleNavClick(to)}>
                    <Icon className="mr-2 size-4" aria-hidden />
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setToolsOpen((o) => !o)}
                className={cn(
                  'flex w-full items-center justify-between gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isToolsActive(location.pathname)
                    ? 'bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]'
                    : 'text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]/20 hover:text-[var(--sidebar-foreground)]'
                )}
                aria-expanded={expanded}
                aria-controls="demo-tools-nav"
              >
                <span className="flex items-center gap-2.5">
                  <Wrench className="size-5 shrink-0" aria-hidden />
                  <span>More</span>
                </span>
                {toolsOpen ? (
                  <ChevronDown className="size-4 shrink-0" aria-hidden />
                ) : (
                  <ChevronRight className="size-4 shrink-0" aria-hidden />
                )}
              </button>
              <div
                id="demo-tools-nav"
                className="mt-1 space-y-1 border-l border-[var(--sidebar-border)] pl-2 ml-3"
                hidden={!expanded}
              >
                {TOOLS_NAV.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]'
                          : 'text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]/20 hover:text-[var(--sidebar-foreground)]'
                      )
                    }
                    onClick={() => {
                      handleNavClick(to);
                      setToolsOpen(true);
                    }}
                  >
                    <Icon className="size-5 shrink-0" aria-hidden />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </div>
            </>
          )}
        </div>
      </nav>
      <Separator className="bg-[var(--sidebar-border)]" />
      <div className={cn('flex flex-col gap-1 py-3', isCollapsed ? 'px-0' : 'px-2')}>
        <button
          type="button"
          onClick={onToggleCollapse}
          className={cn(
            'flex items-center gap-2.5 rounded-lg py-2 text-sm font-medium transition-colors',
            isCollapsed ? 'justify-center px-0' : 'px-3',
            'text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-ring)]'
          )}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <PanelLeft className="size-5 shrink-0" aria-hidden />
          ) : (
            <PanelLeftClose className="size-5 shrink-0" aria-hidden />
          )}
          <NavLabel isCollapsed={isCollapsed}>Collapse</NavLabel>
        </button>
      </div>
    </aside>
  );
}
