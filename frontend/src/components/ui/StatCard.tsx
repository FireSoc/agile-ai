import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: ReactNode;
  iconBg?: string;
  trend?: ReactNode;
}

export function StatCard({ label, value, icon, iconBg = 'bg-brand-50', trend }: StatCardProps) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`${iconBg} rounded-lg p-2.5 flex-shrink-0`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold text-slate-900 tabular-nums">{value}</p>
        {trend && <div className="mt-1">{trend}</div>}
      </div>
    </div>
  );
}
