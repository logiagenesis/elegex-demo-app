import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import { canAccessWorkspaceRoute } from "@/lib/access";
import { trpc } from "@/lib/trpc";
import { Route, Switch, useLocation } from "wouter";
import { Component, lazy, ReactNode, Suspense } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import NotFound from "./pages/NotFound";

const AdminPage = lazy(() =>
  import("@/pages/ElegexPages").then(module => ({ default: module.AdminPage }))
);
const OrganizationSettingsPage = lazy(
  () => import("@/pages/OrganizationSettingsPage")
);
const DocumentsPage = lazy(() => import("@/pages/TypedDocumentsPage"));
const NotificationsPage = lazy(() =>
  import("@/pages/ElegexPages").then(module => ({
    default: module.NotificationsPage,
  }))
);
const RecordDetailPage = lazy(() =>
  import("@/pages/ElegexPages").then(module => ({
    default: module.RecordDetailPage,
  }))
);
const RecordsPage = lazy(() =>
  import("@/pages/ElegexPages").then(module => ({
    default: module.RecordsPage,
  }))
);
const TasksPage = lazy(() =>
  import("@/pages/ElegexPages").then(module => ({ default: module.TasksPage }))
);
const DispatchPage = lazy(() =>
  import("@/pages/FieldServicePages").then(module => ({
    default: module.DispatchPage,
  }))
);
const FieldCommandCentre = lazy(() =>
  import("@/pages/FieldServicePages").then(module => ({
    default: module.FieldCommandCentre,
  }))
);
const FieldReportsPage = lazy(() =>
  import("@/pages/FieldServicePages").then(module => ({
    default: module.FieldReportsPage,
  }))
);
const ForemanPage = lazy(() =>
  import("@/pages/ForemanPage").then(module => ({
    default: module.ForemanPage,
  }))
);
const JobDetailPage = lazy(() =>
  import("@/pages/FieldServicePages").then(module => ({
    default: module.JobDetailPage,
  }))
);
const JobsPage = lazy(() =>
  import("@/pages/FieldServicePages").then(module => ({
    default: module.JobsPage,
  }))
);
const StagingReadinessPage = lazy(() =>
  import("@/pages/FieldServicePages").then(module => ({
    default: module.StagingReadinessPage,
  }))
);

function RouteLoading() {
  return (
    <div className="grid min-h-[60vh] place-items-center text-sm font-medium text-[#667085]">
      Loading workspace view…
    </div>
  );
}

function PrivilegedRoute({
  children,
  path,
}: {
  children: ReactNode;
  path: "/staging" | "/admin" | "/settings";
}) {
  const workspace = trpc.elegex.workspace.current.useQuery();
  if (workspace.isLoading) return <RouteLoading />;
  if (!canAccessWorkspaceRoute(path, workspace.data?.role))
    return (
      <section className="grid min-h-[60vh] place-items-center text-center">
        <div className="max-w-md rounded-3xl border border-[#E4EAF4] bg-white p-8 shadow-[0_16px_45px_rgba(24,54,108,0.08)]">
          <p className="text-xs font-bold tracking-[0.16em] text-[#C63550]">
            RESTRICTED VIEW
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-[#14213D]">
            This route is reserved for workspace administrators.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#667085]">
            Your current role can continue to use the operational workspace, but
            cannot access release or administration controls.
          </p>
        </div>
      </section>
    );
  return <>{children}</>;
}

class RouteLoadBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <section className="mx-auto grid min-h-[60vh] max-w-xl place-items-center text-center">
          <div className="rounded-3xl border border-[#E4EAF4] bg-white p-8 shadow-[0_16px_45px_rgba(24,54,108,0.08)]">
            <p className="text-xs font-bold tracking-[0.16em] text-[#195FE6]">
              VIEW UNAVAILABLE
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-[#14213D]">
              This workspace module could not load.
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#667085]">
              The navigation shell remains available. Return to the command
              centre or reload the application to request a fresh module bundle.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                onClick={() => window.location.assign("/")}
                className="rounded-xl bg-[#195FE6] px-4 py-2.5 text-sm font-semibold text-white"
              >
                Command centre
              </button>
              <button
                onClick={() => window.location.reload()}
                className="rounded-xl border border-[#D6E2F6] px-4 py-2.5 text-sm font-semibold text-[#195FE6]"
              >
                Reload app
              </button>
            </div>
          </div>
        </section>
      );
    return this.props.children;
  }
}

function Router() {
  const [location] = useLocation();
  return (
    <DashboardLayout>
      <RouteLoadBoundary key={location}>
        <Suspense fallback={<RouteLoading />}>
          <Switch>
            <Route path="/" component={FieldCommandCentre} />
            <Route path="/jobs/:id">
              {params => <JobDetailPage id={Number(params.id)} />}
            </Route>
            <Route path="/jobs" component={JobsPage} />
            <Route path="/field" component={ForemanPage} />
            <Route path="/dispatch" component={DispatchPage} />
            <Route path="/projects/:id">
              {params => (
                <RecordDetailPage kind="projects" id={Number(params.id)} />
              )}
            </Route>
            <Route path="/cases/:id">
              {params => (
                <RecordDetailPage kind="cases" id={Number(params.id)} />
              )}
            </Route>
            <Route path="/contacts/:id">
              {params => (
                <RecordDetailPage kind="contacts" id={Number(params.id)} />
              )}
            </Route>
            <Route path="/projects">
              {() => <RecordsPage kind="projects" />}
            </Route>
            <Route path="/cases">{() => <RecordsPage kind="cases" />}</Route>
            <Route path="/contacts">
              {() => <RecordsPage kind="contacts" />}
            </Route>
            <Route path="/tasks" component={TasksPage} />
            <Route path="/documents" component={DocumentsPage} />
            <Route path="/reports" component={FieldReportsPage} />
            <Route path="/staging">
              {() => (
                <PrivilegedRoute path="/staging">
                  <StagingReadinessPage />
                </PrivilegedRoute>
              )}
            </Route>
            <Route path="/notifications" component={NotificationsPage} />
            <Route path="/admin">
              {() => (
                <PrivilegedRoute path="/admin">
                  <AdminPage />
                </PrivilegedRoute>
              )}
            </Route>
            <Route path="/settings">
              {() => (
                <PrivilegedRoute path="/settings">
                  <OrganizationSettingsPage />
                </PrivilegedRoute>
              )}
            </Route>
            <Route>
              <NotFound />
            </Route>
          </Switch>
        </Suspense>
      </RouteLoadBoundary>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
