import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  CalendarDays,
  Zap,
  FlaskConical,
  CalendarClock,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
];

const SANDBOX_ITEMS = [
  { to: '/simulator', icon: FlaskConical, label: 'Simulator' },
  { to: '/timeline', icon: CalendarClock, label: 'Timeline' },
];

export function Sidebar() {
  return (
    <aside className="w-56 flex-shrink-0 flex flex-col bg-slate-900 text-white">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-slate-800">
        <div className="rounded-md bg-brand-600 p-1.5">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-none">Agile</p>
          <p className="text-xs text-slate-400 leading-none mt-0.5">Onboarding Engine</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto" aria-label="Main navigation">
        <div className="space-y-0.5">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`
              }
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </div>

        {/* Decision Sandbox section */}
        <div>
          <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Decision Sandbox
          </p>
          <div className="space-y-0.5">
            {SANDBOX_ITEMS.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-600 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`
                }
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-800">
        <p className="text-xs text-slate-500">Internal Ops Tool</p>
      </div>
    </aside>
  );
}
