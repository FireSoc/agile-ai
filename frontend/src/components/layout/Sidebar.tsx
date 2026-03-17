import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  BookOpen,
  FileDown,
  FlaskConical,
  ChevronDown,
  ChevronRight,
  Wrench,
  Columns2,
  Settings,
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
import { cn } from '@/lib/utils';

const CORE_NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/simulator', icon: FlaskConical, label: 'Simulator' },
];

const WORKSPACE_NAV = [
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/pipeline', icon: Columns2, label: 'Pipeline' },
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

function ToolsCollapsedMenu({
  onNavClick,
  isActive,
}: {
  onNavClick: (to: string) => void;
  isActive: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex w-full items-center justify-center rounded-lg px-2 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]'
            : 'text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]/20'
        )}
        aria-label="Tools menu"
      >
        <Wrench className="size-5 shrink-0" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start" sideOffset={8}>
        {TOOLS_NAV.map(({ to, icon: Icon, label }) => (
          <DropdownMenuItem key={to} onClick={() => onNavClick(to)}>
            <Icon className="mr-2 size-4" aria-hidden />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NavGroup({
  label,
  items,
  onNavClick,
  isCollapsed,
}: {
  label: string;
  items: Array<{ to: string; icon: React.ComponentType<{ className?: string }>; label: string }>;
  onNavClick: (to: string) => void;
  isCollapsed: boolean;
}) {
  return (
    <div className="space-y-1">
      {!isCollapsed && (
        <p className="px-2.5 py-1.5 text-xs font-medium uppercase tracking-wider text-[var(--sidebar-foreground)]/60 md:px-3">
          {label}
        </p>
      )}
      {items.map(({ to, icon: Icon, label: itemLabel }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors md:px-3',
              isCollapsed && 'justify-center px-2',
              isActive
                ? 'bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]'
                : 'text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]/20 hover:text-[var(--sidebar-foreground)]'
            )
          }
          onClick={() => onNavClick(to)}
          title={isCollapsed ? itemLabel : undefined}
        >
          <Icon className="size-5 shrink-0" aria-hidden />
          {!isCollapsed && <span className="hidden md:inline">{itemLabel}</span>}
        </NavLink>
      ))}
    </div>
  );
}

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ isCollapsed, onToggleCollapse }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [toolsOpen, setToolsOpen] = useState(() => isToolsActive(location.pathname));
  const expanded = toolsOpen || isToolsActive(location.pathname);

  const handleNavClick = (to: string) => {
    if (location.pathname === '/simulator' && to !== '/simulator') {
      window.location.assign(to);
      return;
    }
    navigate(to);
  };

  return (
    <aside
      className={cn(
        'flex flex-shrink-0 flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)] transition-[width] duration-200 min-h-0',
        'w-14 md:w-16',
        !isCollapsed && 'md:w-56',
        'h-full md:h-[calc(100vh-1rem)] md:my-2 md:ml-2 md:mr-2 md:rounded-xl md:shadow-sm'
      )}
      aria-label="Main navigation"
    >
      <div className={cn('flex h-16 items-center gap-2 overflow-hidden', isCollapsed ? 'justify-center px-0' : 'px-3 md:px-4')}>
        <div className="flex size-9 shrink-0 items-center justify-center md:size-10">
          <AgileLogo size="sm" className="size-5 md:size-6" />
        </div>
        {!isCollapsed && (
          <div className="hidden flex-1 min-w-0 md:block">
            <p className="text-sm font-semibold leading-none truncate">Agile</p>
            <p className="mt-0.5 text-xs text-[var(--sidebar-foreground)]/80 leading-none truncate">Onboarding</p>
          </div>
        )}
      </div>
      <Separator className="bg-[var(--sidebar-border)]" />
      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-4">
        <NavGroup label="Core" items={CORE_NAV} onNavClick={handleNavClick} isCollapsed={isCollapsed} />
        <NavGroup label="Workspace" items={WORKSPACE_NAV} onNavClick={handleNavClick} isCollapsed={isCollapsed} />
        <div className="space-y-1">
          {!isCollapsed && (
            <p className="px-2.5 py-1.5 text-xs font-medium uppercase tracking-wider text-[var(--sidebar-foreground)]/60 md:px-3">
              Tools
            </p>
          )}
          {isCollapsed ? (
            <ToolsCollapsedMenu onNavClick={handleNavClick} isActive={isToolsActive(location.pathname)} />
          ) : (
            <>
              <button
                type="button"
                onClick={() => setToolsOpen((o) => !o)}
                className={cn(
                  'flex w-full items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors md:px-3',
                  isToolsActive(location.pathname)
                    ? 'bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]'
                    : 'text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]/20 hover:text-[var(--sidebar-foreground)]'
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
                className="mt-1 space-y-1 border-l border-[var(--sidebar-border)] pl-2 md:ml-3"
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
                          : 'text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]/20 hover:text-[var(--sidebar-foreground)]'
                      )
                    }
                    onClick={() => { handleNavClick(to); setToolsOpen(true); }}
                  >
                    <Icon className="size-5 shrink-0" aria-hidden />
                    <span className="hidden md:inline">{label}</span>
                  </NavLink>
                ))}
              </div>
            </>
          )}
        </div>
      </nav>
      <Separator className="bg-[var(--sidebar-border)]" />
      <div className={cn('flex flex-col gap-1 px-2 py-3 md:px-4', isCollapsed && 'items-center')}>
        <button
          type="button"
          onClick={onToggleCollapse}
          className={cn(
            'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors md:px-3',
            isCollapsed && 'justify-center px-2',
            'text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-ring)]'
          )}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <PanelLeft className="size-5 shrink-0" aria-hidden /> : <PanelLeftClose className="size-5 shrink-0" aria-hidden />}
          {!isCollapsed && <span className="hidden md:inline">Collapse</span>}
        </button>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors md:px-3',
              isCollapsed && 'justify-center px-2',
              isActive
                ? 'bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]'
                : 'text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]/20 hover:text-[var(--sidebar-foreground)]'
            )
          }
          title={isCollapsed ? 'Settings' : undefined}
        >
          <Settings className="size-5 shrink-0" aria-hidden />
          {!isCollapsed && <span className="hidden md:inline">Settings</span>}
        </NavLink>
        {!isCollapsed && <p className="text-xs text-[var(--sidebar-foreground)]/70 px-2.5 md:px-3">Onboarding Ops</p>}
      </div>
    </aside>
  );
}
