import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import { AdminPage, DashboardHome, DocumentsPage, NotificationsPage, RecordDetailPage, RecordsPage, ReportsPage, TasksPage } from "@/pages/ElegexPages";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function Router() {
  return <DashboardLayout><Switch>
    <Route path="/" component={DashboardHome} />
    <Route path="/projects/:id">{params => <RecordDetailPage kind="projects" id={Number(params.id)} />}</Route>
    <Route path="/cases/:id">{params => <RecordDetailPage kind="cases" id={Number(params.id)} />}</Route>
    <Route path="/contacts/:id">{params => <RecordDetailPage kind="contacts" id={Number(params.id)} />}</Route>
    <Route path="/projects">{() => <RecordsPage kind="projects" />}</Route>
    <Route path="/cases">{() => <RecordsPage kind="cases" />}</Route>
    <Route path="/contacts">{() => <RecordsPage kind="contacts" />}</Route>
    <Route path="/tasks" component={TasksPage} />
    <Route path="/documents" component={DocumentsPage} />
    <Route path="/reports" component={ReportsPage} />
    <Route path="/notifications" component={NotificationsPage} />
    <Route path="/admin">{() => <AdminPage />}</Route>
    <Route path="/settings">{() => <AdminPage settingsOnly />}</Route>
    <Route>{DashboardHome}</Route>
  </Switch></DashboardLayout>;
}

function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster richColors position="top-right" /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}

export default App;
