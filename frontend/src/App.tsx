import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from './components/layout/AppLayout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DemoProvider } from './demo/DemoProvider';
import { DemoLayout } from './demo/DemoLayout';
import { DEMO_ROUTES } from './demo/demoSeedData';
import {
  DemoDashboard,
  DemoProjectsLanding,
  DemoProjectDetail,
  DemoProjectTasks,
  DemoCustomers,
  DemoSimulator,
  DemoPlaybooks,
} from './demo/pages';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import { Customers } from './pages/Customers';
import { Projects } from './pages/Projects';
import { ProjectsLanding } from './pages/ProjectsLanding';
import { ProjectDetail } from './pages/ProjectDetail';
import { ProjectTasks } from './pages/ProjectTasks';
import { PlaybookInspector } from './pages/PlaybookInspector';
import { CustomerPortalProject } from './pages/CustomerPortalProject';
import { ImportDeal } from './pages/ImportDeal';
import { Simulator } from './pages/Simulator';
import { Pipeline } from './pages/Pipeline';
import { Settings } from './pages/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 1,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="size-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="size-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <Login />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/signup"
              element={
                <PublicOnlyRoute>
                  <Signup />
                </PublicOnlyRoute>
              }
            />

            {/* Customer portal — no auth required (shareable customer link) */}
            <Route path="/portal/projects/:id" element={<CustomerPortalProject />} />

            {/* Public demo — no auth; stateless seeded workspace */}
            <Route path="/demo" element={<DemoProvider><DemoLayout /></DemoProvider>}>
              <Route index element={<Navigate to={DEMO_ROUTES.dashboard} replace />} />
              <Route path="dashboard" element={<DemoDashboard />} />
              <Route path="projects" element={<DemoProjectsLanding />} />
              <Route path="projects/:id" element={<DemoProjectDetail />} />
              <Route path="projects/:id/tasks" element={<DemoProjectTasks />} />
              <Route path="customers" element={<DemoCustomers />} />
              <Route path="simulator" element={<DemoSimulator />} />
              <Route path="playbooks" element={<DemoPlaybooks />} />
            </Route>

            {/* Protected app routes */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/at-risk" element={<Navigate to="/dashboard" replace />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/projects" element={<ProjectsLanding />} />
              <Route path="/projects/list" element={<Projects />} />
              <Route path="/projects/:id/tasks" element={<ProjectTasks />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/playbooks" element={<PlaybookInspector />} />
              <Route path="/simulator" element={<Simulator />} />
              <Route path="/pipeline" element={<Pipeline />} />
              <Route path="/deals/import" element={<ImportDeal />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
