import { useLayoutEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Building2, ArrowRight } from 'lucide-react';
import { demoCustomersApi, demoProjectsApi, demoQueryKeys } from '@/demo/demoApi';
import { DEMO_ROUTES } from '@/demo/demoSeedData';
import { CustomerTypeBadge } from '@/components/ui/StatusBadge';
import { PageContainer } from '@/components/layout/PageContainer';
import { usePageLayout } from '@/contexts/PageLayoutContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { EmptyState } from '@/components/ui/EmptyState';

export function DemoCustomers() {
  const { setPageLayout } = usePageLayout();

  const { data: customers, isPending, isError, refetch } = useQuery({
    queryKey: demoQueryKeys.customers,
    queryFn: demoCustomersApi.list,
  });

  const { data: projects } = useQuery({
    queryKey: demoQueryKeys.projects,
    queryFn: demoProjectsApi.list,
  });

  useLayoutEffect(() => {
    setPageLayout({
      title: 'Customers',
      subtitle: 'Demo customer accounts.',
    });
  }, [setPageLayout]);

  function getMostRecentProjectIdForCustomer(customerId: number): number | null {
    if (!projects?.length) return null;
    const forCustomer = projects
      .filter((p) => p.customer_id === customerId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return forCustomer[0]?.id ?? null;
  }

  if (isPending) return <PageLoading />;

  if (isError) {
    return (
      <PageContainer>
        <ErrorAlert message="Failed to load demo customers." onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  if (!customers?.length) {
    return (
      <PageContainer>
        <EmptyState
          title="No customers in demo"
          description="The demo shows sample data. Use Reset demo to restore."
          icon={<Building2 className="h-12 w-12 text-muted-foreground" />}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="flex flex-col gap-6">
      <Card data-demo-target="customers-list">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            All Customers
            <Badge variant="secondary" className="font-normal">
              {customers.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-5 py-3">Company</TableHead>
                <TableHead className="px-5 py-3">Type</TableHead>
                <TableHead className="px-5 py-3">Industry</TableHead>
                <TableHead className="px-5 py-3">Created</TableHead>
                <TableHead className="px-5 py-3 text-right">Projects</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => {
                const projectId = getMostRecentProjectIdForCustomer(customer.id);
                return (
                  <TableRow key={customer.id}>
                    <TableCell className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-7 w-7 rounded-full bg-primary/10">
                          <AvatarFallback className="text-xs font-semibold text-primary">
                            {customer.company_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-foreground">{customer.company_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-3.5">
                      <CustomerTypeBadge type={customer.customer_type} />
                    </TableCell>
                    <TableCell className="px-5 py-3.5 text-muted-foreground">{customer.industry ?? '—'}</TableCell>
                    <TableCell className="px-5 py-3.5 text-muted-foreground">
                      {new Date(customer.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell className="px-5 py-3.5 text-right">
                      {projectId != null ? (
                        <Link
                          to={DEMO_ROUTES.projectDetail(projectId)}
                          className="text-sm font-medium text-primary underline-offset-4 hover:underline inline-flex items-center gap-1"
                        >
                          View project <ArrowRight className="h-3 w-3" />
                        </Link>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
