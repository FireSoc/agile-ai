import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Building2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { customersApi } from '../api/customers';
import { CustomerTypeBadge } from '../components/ui/StatusBadge';
import { CustomerForm } from '../components/ui/CustomerForm';
import { Modal } from '../components/ui/Modal';
import { PageLoading } from '../components/ui/LoadingSpinner';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { EmptyState } from '../components/ui/EmptyState';
import { Topbar } from '../components/layout/Topbar';

export function Customers() {
  const [isModalOpen, setModalOpen] = useState(false);

  const { data: customers, isPending, isError, refetch } = useQuery({
    queryKey: ['customers'],
    queryFn: customersApi.list,
  });

  return (
    <div>
      <Topbar
        action={
          <button
            type="button"
            className="btn-primary"
            onClick={() => setModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            New Customer
          </button>
        }
      />

      <div className="px-6 py-6">
        {isPending && <PageLoading />}

        {isError && (
          <ErrorAlert
            message="Failed to load customers. Is the backend running?"
            onRetry={() => refetch()}
          />
        )}

        {!isPending && !isError && customers?.length === 0 && (
          <EmptyState
            title="No customers yet"
            description="Add your first customer to start an onboarding project."
            icon={<Building2 className="h-12 w-12" />}
            action={
              <button
                type="button"
                className="btn-primary"
                onClick={() => setModalOpen(true)}
              >
                <Plus className="h-4 w-4" />
                New Customer
              </button>
            }
          />
        )}

        {!isPending && !isError && customers && customers.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">
                All Customers{' '}
                <span className="ml-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 font-normal">
                  {customers.length}
                </span>
              </h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Company
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Type
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Industry
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Created
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-brand-700">
                            {customer.company_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-slate-800">{customer.company_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <CustomerTypeBadge type={customer.customer_type} />
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{customer.industry}</td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {new Date(customer.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        to={`/projects?customer=${customer.id}`}
                        className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
                      >
                        View projects <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        title="New Customer"
      >
        <CustomerForm
          onSuccess={() => setModalOpen(false)}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
