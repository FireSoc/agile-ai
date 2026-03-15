import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { projectsApi } from '../../api/projects';
import { customersApi } from '../../api/customers';
import type { ProjectCreate } from '../../types';
import { LoadingSpinner } from './LoadingSpinner';

interface ProjectFormProps {
  preselectedCustomerId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ProjectForm({ preselectedCustomerId, onSuccess, onCancel }: ProjectFormProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: customers, isPending: loadingCustomers } = useQuery({
    queryKey: ['customers'],
    queryFn: customersApi.list,
  });

  const [form, setForm] = useState<ProjectCreate>({
    customer_id: preselectedCustomerId ?? 0,
    name: '',
    notes: '',
  });
  const [errors, setErrors] = useState<{ customer_id?: string }>({});

  const mutation = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      onSuccess?.();
      navigate(`/projects/${project.id}`);
    },
  });

  function validate(): boolean {
    const next: typeof errors = {};
    if (!form.customer_id) next.customer_id = 'Please select a customer.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate(form);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <label htmlFor="customer_id" className="label">
          Customer <span className="text-red-500">*</span>
        </label>
        {loadingCustomers ? (
          <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
            <LoadingSpinner size="sm" /> Loading customers…
          </div>
        ) : (
          <select
            id="customer_id"
            className="select"
            value={form.customer_id}
            onChange={(e) => setForm((f) => ({ ...f, customer_id: Number(e.target.value) }))}
            aria-invalid={!!errors.customer_id}
            aria-describedby={errors.customer_id ? 'customer-error' : undefined}
          >
            <option value={0}>Select a customer…</option>
            {customers?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company_name} ({c.customer_type.toUpperCase()})
              </option>
            ))}
          </select>
        )}
        {errors.customer_id && (
          <p id="customer-error" role="alert" className="mt-1 text-xs text-red-600">
            {errors.customer_id}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="project_name" className="label">
          Project name <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <input
          id="project_name"
          type="text"
          className="input"
          placeholder="e.g. Q1 onboarding, Pilot launch"
          value={form.name ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value.trim() || undefined }))}
          maxLength={255}
        />
      </div>

      <div>
        <label htmlFor="notes" className="label">
          Notes <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea
          id="notes"
          className="input resize-none"
          rows={3}
          placeholder="Any additional context for this onboarding…"
          value={form.notes ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />
      </div>

      {mutation.isError && (
        <p role="alert" className="text-sm text-red-600">
          {(mutation.error as Error).message}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn-primary" disabled={mutation.isPending || loadingCustomers}>
          {mutation.isPending && <LoadingSpinner size="sm" />}
          Create Project
        </button>
      </div>
    </form>
  );
}
