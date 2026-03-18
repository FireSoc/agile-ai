import { useLayoutEffect } from 'react';
import { Link } from 'react-router-dom';
import { DEMO_ROUTES } from '@/demo/demoSeedData';
import { usePageLayout } from '@/contexts/PageLayoutContext';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';

export function DemoPlaybooks() {
  const { setPageLayout } = usePageLayout();

  useLayoutEffect(() => {
    setPageLayout({
      title: 'Playbooks',
      subtitle: 'Demo — playbook templates drive stages and tasks.',
    });
  }, [setPageLayout]);

  return (
    <PageContainer className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Playbooks
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Playbooks define stage and task templates by segment (SMB, mid-market, enterprise). When a deal closes,
            the project is created from the selected playbook. In this demo, the three sample projects use
            playbook-driven stages and tasks.
          </p>
          <Link to={DEMO_ROUTES.dashboard} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            Back to dashboard
          </Link>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
