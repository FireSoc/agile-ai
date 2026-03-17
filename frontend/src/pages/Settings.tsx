import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePageLayout } from '@/contexts/PageLayoutContext';
import { useAuth } from '@/contexts/AuthContext';

export function Settings() {
  const { setPageLayout } = usePageLayout();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setPageLayout({ title: 'Settings' });
  }, [setPageLayout]);

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  const email = user?.email ?? '';

  return (
    <PageContainer className="flex flex-col gap-6">
      <PageHeader title="Settings" />

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Signed in as</p>
            <p className="text-sm text-foreground">{email || '—'}</p>
          </div>
          {user?.id && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">User ID</p>
              <p className="font-mono text-xs text-foreground break-all">{user.id}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sign out</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="destructive"
            onClick={handleSignOut}
            className="gap-2"
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
