import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { calendarApi } from '../api/calendar';
import { tasksApi } from '../api/tasks';
import { EventFormModal } from '../components/ui/EventFormModal';
import { Topbar } from '../components/layout/Topbar';
import type { CalendarEvent, TaskCalendarItem } from '../types';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatMonthYear(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function toYYYYMMDD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getMonthRange(year: number, month: number): { start: string; end: string } {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return { start: toYYYYMMDD(start), end: toYYYYMMDD(end) };
}

/** Build 42-day grid (6 weeks) starting from the Sunday of the week that contains the 1st. */
function getCalendarDays(year: number, month: number): { date: Date; isCurrentMonth: boolean }[] {
  const first = new Date(year, month, 1);
  const dayOfWeek = first.getDay();
  const start = new Date(first);
  start.setDate(start.getDate() - dayOfWeek);

  const days: { date: Date; isCurrentMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push({
      date: d,
      isCurrentMonth: d.getMonth() === month,
    });
  }
  return days;
}

/** Tailwind classes for calendar-event chips by entry type. */
function eventChipColor(entryType: string): string {
  switch (entryType) {
    case 'task':
      return 'bg-brand-100 text-brand-800 border-brand-200';
    case 'deadline':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'project':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200';
  }
}

/** Stable color per company for project-task chips (6-color palette). */
const COMPANY_PALETTE = [
  'bg-brand-100 text-brand-800 border-brand-200',
  'bg-emerald-100 text-emerald-800 border-emerald-200',
  'bg-amber-100 text-amber-800 border-amber-200',
  'bg-violet-100 text-violet-800 border-violet-200',
  'bg-rose-100 text-rose-800 border-rose-200',
  'bg-sky-100 text-sky-800 border-sky-200',
] as const;

function companyChipColor(customerId: number): string {
  return COMPANY_PALETTE[customerId % COMPANY_PALETTE.length];
}

const MAX_CHIPS_PER_DAY = 4;

export function Calendar() {
  const today = useMemo(() => new Date(), []);
  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [modalOpen, setModalOpen] = useState(false);
  const [modalEvent, setModalEvent] = useState<CalendarEvent | null>(null);
  const [modalInitialDate, setModalInitialDate] = useState<string | undefined>(undefined);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const { start, end } = getMonthRange(year, month);

  const { data: events = [], isPending: loadingEvents } = useQuery({
    queryKey: ['calendar', start, end],
    queryFn: () => calendarApi.list(start, end),
  });

  const { data: projectTasks = [], isPending: loadingTasks } = useQuery({
    queryKey: ['tasks', 'calendar', start, end],
    queryFn: () => tasksApi.calendar(start, end),
  });

  const isPending = loadingEvents || loadingTasks;

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const key = e.start_date.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return map;
  }, [events]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, TaskCalendarItem[]>();
    for (const t of projectTasks) {
      if (!t.due_date) continue;
      const key = t.due_date.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return map;
  }, [projectTasks]);

  /** Merged list per date: calendar events first, then project tasks; for display cap. */
  const dayItemsByDate = useMemo(() => {
    const map = new Map<
      string,
      { events: CalendarEvent[]; tasks: TaskCalendarItem[]; total: number }
    >();
    const allDates = new Set<string>([
      ...eventsByDate.keys(),
      ...tasksByDate.keys(),
    ]);
    for (const dateStr of allDates) {
      const evs = eventsByDate.get(dateStr) ?? [];
      const tks = tasksByDate.get(dateStr) ?? [];
      map.set(dateStr, {
        events: evs,
        tasks: tks,
        total: evs.length + tks.length,
      });
    }
    return map;
  }, [eventsByDate, tasksByDate]);

  const calendarDays = useMemo(() => getCalendarDays(year, month), [year, month]);

  function goPrevMonth() {
    setViewDate(new Date(year, month - 1, 1));
  }

  function goNextMonth() {
    setViewDate(new Date(year, month + 1, 1));
  }

  function goToday() {
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
  }

  function openCreate(dateStr: string) {
    setModalEvent(null);
    setModalInitialDate(dateStr);
    setModalOpen(true);
  }

  function openEdit(event: CalendarEvent) {
    setModalEvent(event);
    setModalInitialDate(undefined);
    setModalOpen(true);
  }

  const isToday = (d: Date) =>
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  return (
    <div className="flex flex-col h-full">
      <Topbar />

      <div className="flex-1 overflow-auto p-6">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goPrevMonth}
                className="btn-ghost p-2"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="text-lg font-semibold text-slate-900 min-w-[200px] text-center">
                {formatMonthYear(viewDate)}
              </h2>
              <button
                type="button"
                onClick={goNextMonth}
                className="btn-ghost p-2"
                aria-label="Next month"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <button type="button" onClick={goToday} className="btn-secondary">
              Today
            </button>
          </div>

          {projectTasks.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-xs text-slate-500">
              <span className="font-medium text-slate-600">By company:</span>
              {Array.from(
                new Map(projectTasks.map((t) => [t.customer_id, t.company_name])).entries()
              ).map(([customerId, companyName]) => (
                <span
                  key={customerId}
                  className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 border ${companyChipColor(customerId)}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                  {companyName}
                </span>
              ))}
            </div>
          )}

          {isPending ? (
            <div className="py-12 text-center text-slate-500">Loading…</div>
          ) : (
            <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-lg overflow-hidden">
              {WEEKDAY_LABELS.map((label) => (
                <div
                  key={label}
                  className="bg-slate-50 px-2 py-2 text-center text-xs font-semibold text-slate-500 uppercase"
                >
                  {label}
                </div>
              ))}
              {calendarDays.map(({ date, isCurrentMonth }, i) => {
                const dateStr = toYYYYMMDD(date);
                const dayItems = dayItemsByDate.get(dateStr) ?? {
                  events: [],
                  tasks: [],
                  total: 0,
                };
                const combined: Array<
                  { type: 'event'; event: CalendarEvent } | { type: 'task'; task: TaskCalendarItem }
                > = [
                  ...dayItems.events.map((event) => ({ type: 'event' as const, event })),
                  ...dayItems.tasks.map((task) => ({ type: 'task' as const, task })),
                ];
                const toShow = combined.slice(0, MAX_CHIPS_PER_DAY);
                const moreCount = combined.length - toShow.length;

                return (
                  <div
                    key={i}
                    role="button"
                    tabIndex={0}
                    onClick={() => openCreate(dateStr)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openCreate(dateStr);
                      }
                    }}
                    className={`min-h-[100px] bg-white p-1.5 flex flex-col cursor-pointer hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-inset ${
                      !isCurrentMonth ? 'opacity-50' : ''
                    }`}
                    aria-label={`${dateStr}, ${dayItems.total} items. Click to add event.`}
                  >
                    <span
                      className={`text-left text-sm font-medium w-7 h-7 rounded flex items-center justify-center flex-shrink-0 ${
                        isToday(date)
                          ? 'bg-brand-600 text-white'
                          : isCurrentMonth
                            ? 'text-slate-700'
                            : 'text-slate-400'
                      }`}
                    >
                      {date.getDate()}
                    </span>
                    <div className="flex-1 space-y-1 overflow-hidden mt-0.5">
                      {toShow.map((item) =>
                        item.type === 'event' ? (
                          <button
                            key={`ev-${item.event.id}`}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(item.event);
                            }}
                            className={`block w-full text-left px-2 py-1 rounded text-xs truncate border ${eventChipColor(item.event.entry_type)} hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand-500`}
                            title={item.event.title}
                          >
                            {item.event.title}
                          </button>
                        ) : (
                          <Link
                            key={`task-${item.task.id}`}
                            to={`/projects/${item.task.project_id}`}
                            onClick={(e) => e.stopPropagation()}
                            title={`${item.task.company_name} · ${item.task.status} · ${item.task.due_date?.slice(0, 10) ?? ''}`}
                            className={`flex items-center gap-0.5 w-full text-left px-2 py-1 rounded text-xs truncate border ${companyChipColor(item.task.customer_id)} hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand-500`}
                          >
                            {item.task.required_for_stage_completion && (
                              <Star className="h-2.5 w-2.5 flex-shrink-0 text-amber-500 fill-amber-400" aria-hidden />
                            )}
                            <span className="truncate">{item.task.title}</span>
                          </Link>
                        )
                      )}
                      {moreCount > 0 && (
                        <span className="text-xs text-slate-400 px-1">
                          +{moreCount} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <EventFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialDate={modalInitialDate}
        event={modalEvent}
        queryKey={['calendar', start, end]}
      />
    </div>
  );
}
