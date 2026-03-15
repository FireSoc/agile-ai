import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from './Modal';
import { calendarApi } from '../../api/calendar';
import type {
  CalendarEntryType,
  CalendarEvent,
  CalendarEventCreate,
  OnboardingStage,
  TaskStatus,
} from '../../types';
import { STAGE_LABELS } from '../../types';

const ENTRY_TYPES: { value: CalendarEntryType; label: string }[] = [
  { value: 'task', label: 'Task' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'project', label: 'Project' },
];

const STAGES: OnboardingStage[] = ['kickoff', 'setup', 'training', 'go_live'];

const CRITICALITY_OPTIONS = [
  { value: 1, label: '1 — Nice to Have' },
  { value: 2, label: '2 — Important' },
  { value: 3, label: '3 — Urgent' },
  { value: 4, label: '4 — Mission Critical' },
];

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'blocked', label: 'Blocked' },
];

function toDateInputValue(d: string | null): string {
  if (!d) return '';
  return d.slice(0, 10);
}

interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pre-filled date when creating (YYYY-MM-DD). */
  initialDate?: string;
  /** When set, modal is in edit mode. */
  event: CalendarEvent | null;
  /** Query key to invalidate on success (e.g. ['calendar', start, end]). */
  queryKey: unknown[];
}

export function EventFormModal({
  isOpen,
  onClose,
  initialDate,
  event,
  queryKey,
}: EventFormModalProps) {
  const queryClient = useQueryClient();
  const isEdit = event != null;

  const [title, setTitle] = useState('');
  const [entryType, setEntryType] = useState<CalendarEntryType>('task');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [durationDays, setDurationDays] = useState<string>('');
  const [stage, setStage] = useState<OnboardingStage | ''>('');
  const [criticality, setCriticality] = useState<string>('');
  const [status, setStatus] = useState<TaskStatus>('not_started');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (event) {
      setTitle(event.title);
      setEntryType(event.entry_type as CalendarEntryType);
      setStartDate(toDateInputValue(event.start_date));
      setEndDate(toDateInputValue(event.end_date));
      setDurationDays(event.duration_days != null ? String(event.duration_days) : '');
      setStage(event.stage ?? '');
      setCriticality(event.criticality != null ? String(event.criticality) : '');
      setStatus(event.status);
      setDescription(event.description ?? '');
    } else {
      const date = initialDate ?? new Date().toISOString().slice(0, 10);
      setTitle('');
      setEntryType('task');
      setStartDate(date);
      setEndDate('');
      setDurationDays('');
      setStage('');
      setCriticality('');
      setStatus('not_started');
      setDescription('');
    }
  }, [isOpen, event, initialDate]);

  const createMutation = useMutation({
    mutationFn: (data: CalendarEventCreate) => calendarApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof calendarApi.update>[1] }) =>
      calendarApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => calendarApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      onClose();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      entry_type: entryType,
      start_date: startDate,
      end_date: endDate || null,
      duration_days: durationDays ? parseInt(durationDays, 10) : null,
      criticality: criticality ? parseInt(criticality, 10) : null,
      stage: stage || null,
      status,
      project_id: null,
    };

    if (isEdit && event) {
      updateMutation.mutate({ id: event.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function handleDelete() {
    if (!event) return;
    if (window.confirm('Delete this event?')) deleteMutation.mutate(event.id);
  }

  const isPending =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit event' : 'New event'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="event-title">
            Title
          </label>
          <input
            id="event-title"
            type="text"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title"
            required
          />
        </div>

        <div>
          <span className="label">Entry type</span>
          <div className="flex gap-1 mt-1 p-1 rounded-md bg-slate-100 w-fit">
            {ENTRY_TYPES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setEntryType(value)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  entryType === value
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="event-start">
              Date
            </label>
            <input
              id="event-start"
              type="date"
              className="input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="event-end">
              End date
            </label>
            <input
              id="event-end"
              type="date"
              className="input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="event-duration">
            Duration (days)
          </label>
          <input
            id="event-duration"
            type="number"
            min={1}
            className="input w-24"
            value={durationDays}
            onChange={(e) => setDurationDays(e.target.value)}
            placeholder="—"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label" htmlFor="event-stage">
              Stage
            </label>
            <select
              id="event-stage"
              className="select w-full"
              value={stage}
              onChange={(e) => setStage(e.target.value as OnboardingStage | '')}
            >
              <option value="">—</option>
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="event-criticality">
              Criticality
            </label>
            <select
              id="event-criticality"
              className="select w-full"
              value={criticality}
              onChange={(e) => setCriticality(e.target.value)}
            >
              <option value="">—</option>
              {CRITICALITY_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="event-status">
              Status
            </label>
            <select
              id="event-status"
              className="select w-full"
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
            >
              {STATUS_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="event-notes">
            Notes
          </label>
          <textarea
            id="event-notes"
            className="input min-h-[80px] resize-y"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional notes"
            rows={3}
          />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <div>
            {isEdit && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="btn-danger"
              >
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isPending}>
              {isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
