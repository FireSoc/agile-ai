import { Link, useLocation } from 'react-router-dom';
import { MoreHorizontal, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePageLayout } from '@/contexts/PageLayoutContext';
import { cn } from '@/lib/utils';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Overview',
  '/projects': 'Projects',
  '/projects/list': 'Projects',
  '/simulator': 'Simulator',
  '/ops-inbox': 'Ops Inbox',
  '/customers': 'Customers',
  '/deals/import': 'Import deal',
  '/playbooks': 'Playbooks',
};

function fallbackTitle(pathname: string): string {
  if (pathname.startsWith('/portal/')) return 'Customer portal';
  if (pathname.startsWith('/projects/') && !pathname.endsWith('/list')) return 'Project';
  return PAGE_TITLES[pathname] ?? 'Agile Onboarding';
}

interface TopbarProps {
  /** Optional user name for avatar fallback; defaults to "User" */
  userName?: string;
}

export function Topbar({ userName = 'User' }: TopbarProps) {
  const { pathname } = useLocation();
  const { pageLayout } = usePageLayout();

  const title = pageLayout.title || fallbackTitle(pathname);
  const subtitle = pageLayout.subtitle;
  const breadcrumbs = pageLayout.breadcrumbs;
  const action = pageLayout.action;

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-4 md:px-6">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-4">
        <div className="min-w-0">
          {breadcrumbs != null && breadcrumbs.length > 0 && (
            <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground">
              {breadcrumbs.map((b, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="size-3.5 shrink-0" aria-hidden />}
                  {b.to != null ? (
                    <Link to={b.to} className="hover:text-foreground truncate">
                      {b.label}
                    </Link>
                  ) : (
                    <span className="truncate">{b.label}</span>
                  )}
                </span>
              ))}
            </nav>
          )}
          <h1 className={cn(
            'truncate text-base font-semibold text-foreground',
            breadcrumbs != null && breadcrumbs.length > 0 && 'mt-0.5'
          )}>
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {action != null && <div className="hidden shrink-0 sm:block">{action}</div>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button variant="ghost" size="icon" className="rounded-full" aria-label="Open menu">
              <MoreHorizontal className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem>Help</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Avatar className="size-8 border-2 border-border">
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
            {userName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
