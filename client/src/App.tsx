import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import { Route, Switch } from "wouter";
import { lazy, Suspense } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

const AdminPage = lazy(() => import("@/pages/ElegexPages").then(module => ({ default: module.AdminPage })));
const DocumentsPage = lazy(() => import("@/pages/ElegexPages").then(module => ({ default: module.DocumentsPage })));
const NotificationsPage = lazy(() => import("@/pages/ElegexPages").then(module => ({ default: module.NotificationsPage })));
const RecordDetailPage = lazy(() => import("@/pages/ElegexPages").then(module => ({ default: module.RecordDetailPage })));
const RecordsPage = lazy(() => import("@/pages/ElegexPages").then(module => ({ default: module.RecordsPage })));
const TasksPage = lazy(() => import("@/pages/ElegexPages").then(module => ({ default: module.TasksPage })));
const DispatchPage = lazy(() => import("@/pages/FieldServicePages").then(module => ({ default: module.DispatchPage })));
const FieldCommandCentre = lazy(() => import("@/pages/FieldServicePages").then(module => ({ default: module.FieldCommandCentre })));
const FieldReportsPage = lazy(() => import("@/pages/FieldServicePages").then(module => ({ default: module.FieldReportsPage })));
const JobDetailPage = lazy(() => import("@/pages/FieldServicePages").then(module => ({ default: module.JobDetailPage })));
const JobsPage = lazy(() => import("@/pages/FieldServicePages").then(module => ({ default: module.JobsPage })));
const StagingReadinessPage = lazy(() => import("@/pages/FieldServicePages").then(module => ({ default: module.StagingReadinessPage })));

function RouteLoading() { return <div className="grid min-h-[60vh] place-items-center text-sm font-medium text-[#667085]">Loading workspace view…</div>; }

function Router() {
  return <DashboardLayout><Suspense fallback={<RouteLoading />}><Switch>
    <Route path="/" component={FieldCommandCentre} />
    <Route path="/jobs/:id">{params => <JobDetailPage id={Number(params.id)} />}</Route>
    <Route path="/jobs" component={JobsPage} />
    <Route path="/dispatch" component={DispatchPage} />
    <Route path="/projects/:id">{params => <RecordDetailPage kind="projects" id={Number(params.id)} />}</Route>
    <Route path="/cases/:id">{params => <RecordDetailPage kind="cases" id={Number(params.id)} />}</Route>
    <Route path="/contacts/:id">{params => <RecordDetailPage kind="contacts" id={Number(params.id)} />}</Route>
    <Route path="/projects">{() => <RecordsPage kind="projects" />}</Route>
    <Route path="/cases">{() => <RecordsPage kind="cases" />}</Route>
    <Route path="/contacts">{() => <RecordsPage kind="contacts" />}</Route>
    <Route path="/tasks" component={TasksPage} />
    <Route path="/documents" component={DocumentsPage} />
    <Route path="/reports" component={FieldReportsPage} />
    <Route path="/staging" component={StagingReadinessPage} />
    <Route path="/notifications" component={NotificationsPage} />
    <Route path="/admin">{() => <AdminPage />}</Route>
    <Route path="/settings">{() => <AdminPage settingsOnly />}</Route>
    <Route>{FieldCommandCentre}</Route>
  </Switch></Suspense></DashboardLayout>;
}

function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster richColors position="top-right" /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}

export default App;
