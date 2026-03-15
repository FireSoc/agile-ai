import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Zap,
  BookOpen,
  FileDown,
  FlaskConical,
  Inbox,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
} from 'lucide-react';

const PRIMARY_NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/simulator', icon: FlaskConical, label: 'Simulator' },
  { to: '/ops-inbox', icon: Inbox, label: 'Ops Inbox' },
  { to: '/customers', icon: Users, label: 'Customers' },
];

const MORE_NAV = [
  { to: '/playbooks', icon: BookOpen, label: 'Playbooks' },
  { to: '/deals/import', icon: FileDown, label: 'Import deal' },
];

const morePaths = MORE_NAV.map(({ to }) => to);

function isMoreActive(pathname: string) {
  return morePaths.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

const linkClass = (isActive: boolean) =>
  `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
  }`;

export function Sidebar() {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(isMoreActive(location.pathname));
  useEffect(() => {
    if (isMoreActive(location.pathname)) setMoreOpen(true);
  }, [location.pathname]);

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col bg-slate-900 text-white">
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-slate-800">
        <div className="rounded-md bg-brand-600 p-1.5">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-none">Agile</p>
          <p className="text-xs text-slate-400 leading-none mt-0.5">Onboarding Engine</p>
        </div>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto" aria-label="Main navigation">
        <div className="space-y-0.5">
          {PRIMARY_NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => linkClass(isActive)}>
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}

          {/* More menu */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              className={`w-full ${linkClass(isMoreActive(location.pathname))} justify-between`}
              aria-expanded={moreOpen}
              aria-controls="more-nav"
            >
              <span className="flex items-center gap-2.5">
                <MoreHorizontal className="h-4 w-4 flex-shrink-0" />
                More
              </span>
              {moreOpen ? (
                <ChevronDown className="h-4 w-4 flex-shrink-0" aria-hidden />
              ) : (
                <ChevronRight className="h-4 w-4 flex-shrink-0" aria-hidden />
              )}
            </button>
            <div id="more-nav" className="mt-0.5 ml-4 space-y-0.5 border-l border-slate-700 pl-2" hidden={!moreOpen}>
              {MORE_NAV.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => linkClass(isActive)}
                  onClick={() => setMoreOpen(true)}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      </nav>

      <div className="px-4 py-3 border-t border-slate-800">
        <p className="text-xs text-slate-500">Onboarding Ops Co-pilot</p>
      </div>
    </aside>
  );
}
