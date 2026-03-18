import { useLayoutEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FolderKanban, ArrowRight } from 'lucide-react';
import { demoProjectsApi, demoCustomersApi, demoQueryKeys } from '@/demo/demoApi';
import { DEMO_ROUTES } from '@/demo/demoSeedData';
import { ProjectStatusBadge, StageBadge } from '@/components/ui/StatusBadge';
import { RiskScoreBadge } from '@/components/ui/RiskScoreBadge';
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
import { Badge } from '@/components/ui/badge';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { EmptyState } from '@/components/ui/EmptyState';

export function DemoProjectsLanding() {
  const { setPageLayout } = usePageLayout();

  const { data: projects, isPending, isError, refetch } = useQuery({
    queryKey: demoQueryKeys.projects,
    queryFn: demoProjectsApi.list,
  });

  const { data: customers } = useQuery({
    queryKey: demoQueryKeys.customers,
    queryFn: demoCustomersApi.list,
  });

  useLayoutEffect(() => {
    setPageLayout({
      title: 'Onboarding projects',
      subtitle: 'Demo projects. Click one to open its detail.',
    });
  }, [setPageLayout]);

  const customerMap = new Map(customers?.map((c) => [c.id, c]) ?? []);

  if (isPending) return <PageLoading />;

  if (isError) {
    return (
      <PageContainer>
        <ErrorAlert message="Failed to load demo projects." onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  if (!projects?.length) {
    return (
      <PageContainer>
        <EmptyState
          title="No projects in demo"
          description="Use Reset demo to restore sample data."
          icon={<FolderKanban className="h-12 w-12 text-muted-foreground" />}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="flex flex-col gap-6">
      <Card data-demo-target="projects-list">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            All onboarding projects
            <Badge variant="secondary" className="font-normal">
              {projects.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-5 py-3">Project</TableHead>
                <TableHead className="px-5 py-3">Customer</TableHead>
                <TableHead className="px-5 py-3">Stage</TableHead>
                <TableHead className="px-5 py-3">Status</TableHead>
                <TableHead className="px-5 py-3">Risk</TableHead>
                <TableHead className="px-5 py-3 text-right">Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => {
                const customer = customerMap.get(project.customer_id);
                return (
                  <TableRow key={project.id}>
                    <TableCell className="px-5 py-3.5 font-medium text-foreground">
                      {project.name ?? `${customer?.company_name ?? 'Project'} — #${project.id}`}
                    </TableCell>
                    <TableCell className="px-5 py-3.5 text-muted-foreground">
                      {customer?.company_name ?? `Customer #${project.customer_id}`}
                    </TableCell>
                    <TableCell className="px-5 py-3.5">
                      <StageBadge stage={project.current_stage} />
                    </TableCell>
                    <TableCell className="px-5 py-3.5">
                      <ProjectStatusBadge status={project.status} />
                    </TableCell>
                    <TableCell className="px-5 py-3.5">
                      <RiskScoreBadge
                        score={project.risk_score ?? null}
                        level={project.risk_level ?? undefined}
                      />
                    </TableCell>
                    <TableCell className="px-5 py-3.5 text-right">
                      <Link
                        to={DEMO_ROUTES.projectDetail(project.id)}
                        className="text-sm font-medium text-primary underline-offset-4 hover:underline inline-flex items-center gap-1"
                      >
                        Open <ArrowRight className="h-3 w-3" />
                      </Link>
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
