import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider } from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { canAccessWorkspaceAdministration } from "@/lib/access";
import { trpc } from "@/lib/trpc";
import { Bell, BriefcaseBusiness, ChartNoAxesCombined, ClipboardCheck, FileText, FolderKanban, LayoutDashboard, LogOut, MapPinned, Menu, Settings2, ShieldCheck, UsersRound, CheckSquare, Wrench } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

const primaryNavigation = [
  { icon: LayoutDashboard, label: "Office overview", path: "/" },
  { icon: Wrench, label: "Jobs", path: "/jobs" },
  { icon: ClipboardCheck, label: "My field visits", path: "/field" },
  { icon: MapPinned, label: "Dispatch", path: "/dispatch" },
  { icon: UsersRound, label: "Clients", path: "/contacts" },
  { icon: FolderKanban, label: "Programmes", path: "/projects" },
  { icon: BriefcaseBusiness, label: "Exceptions", path: "/cases" },
  { icon: CheckSquare, label: "Office tasks", path: "/tasks" },
];

const secondaryNavigation = [
  { icon: FileText, label: "Documents", path: "/documents" },
  { icon: ChartNoAxesCombined, label: "Commercial reporting", path: "/reports" },
];

function ElegexWordmark({ inverted = false, compact = false }: { inverted?: boolean; compact?: boolean }) {
  return <span className={`inline-flex items-center gap-2 ${inverted ? "text-white" : "text-[#101827]"}`}><img src="/manus-storage/elegex-user-logo-transparent_32ecda05.png" alt="Elegex metallic E mark" className={`h-6 w-6 object-contain ${inverted ? "rounded-md bg-white/95 p-0.5 shadow-sm" : ""}`} /><span className="font-black tracking-[0.13em]">ELEGEX</span>{!compact ? <span className={`text-[9px] font-bold tracking-[0.18em] ${inverted ? "text-[#A8C8FF]" : "text-[#667085]"}`}>OPERATIONS</span> : null}</span>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const workspace = trpc.elegex.workspace.current.useQuery(undefined, { enabled: Boolean(user) });
  const isPrivileged = canAccessWorkspaceAdministration(workspace.data?.role);

  if (loading) return <div className="min-h-screen bg-[#F5F7FB]" />;
  if (!user) {
    return (
      <main data-testid="public-entry" className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr] bg-[#F6F8FC] text-[#14213D]">
        <section className="relative hidden overflow-hidden bg-[#12264F] px-12 py-14 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -left-24 top-28 h-72 w-72 rounded-full bg-[#3171F5]/30 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#B6D4FF]/15 blur-3xl" />
          <div className="relative text-sm"><ElegexWordmark inverted /></div>
          <div className="relative max-w-xl"><p className="mb-5 text-xs font-semibold tracking-[0.24em] text-[#A8C8FF]">GLOBAL JOB MANAGEMENT & FIELD SERVICE</p><h1 className="text-5xl font-semibold leading-[1.06] tracking-[-0.04em]">Every job, visible from booking to invoice.</h1><p className="mt-6 max-w-lg text-base leading-7 text-[#D4E2FF]">A precise office workspace for dispatch, field evidence, quotes, invoicing readiness, and the accountable work behind every client visit.</p><div className="mt-9 grid max-w-lg grid-cols-3 gap-3"><div className="rounded-2xl border border-white/10 bg-white/10 p-4"><p className="text-lg font-semibold">5 roles</p><p className="mt-1 text-xs leading-5 text-[#C9DCFF]">Scoped workspace access</p></div><div className="rounded-2xl border border-white/10 bg-white/10 p-4"><p className="text-lg font-semibold">6 months</p><p className="mt-1 text-xs leading-5 text-[#C9DCFF]">Labelled synthetic history</p></div><div className="rounded-2xl border border-white/10 bg-white/10 p-4"><p className="text-lg font-semibold">1 workspace</p><p className="mt-1 text-xs leading-5 text-[#C9DCFF]">Dispatch through reporting</p></div></div></div>
          <p className="relative text-sm text-[#A8C8FF]">Elegex keeps office control and field delivery in the same line of sight.</p>
        </section>
        <section className="flex items-center justify-center px-6 py-12 sm:px-10"><div className="w-full max-w-md rounded-[1.75rem] border border-[#E4EAF4] bg-white p-8 shadow-[0_20px_60px_rgba(24,54,108,0.10)] sm:p-10"><div className="mb-10 text-sm"><ElegexWordmark /></div><p className="text-sm font-semibold tracking-[0.18em] text-[#195FE6]">OPERATIONS WORKSPACE</p><h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#14213D]">Sign in to operations</h2><p className="mt-3 text-sm leading-6 text-[#667085]">Continue securely with your Manus account. Your first sign-in provisions a private multi-tenant operations workspace with a clearly labelled, synthetic demonstration history.</p><Button onClick={() => startLogin()} className="mt-8 h-12 w-full rounded-xl bg-[#195FE6] text-sm font-semibold shadow-[0_8px_20px_rgba(25,95,230,0.25)] hover:bg-[#124FC3]">Continue with Manus</Button><div className="mt-5 grid grid-cols-3 gap-2 text-center lg:hidden"><span className="rounded-lg bg-[#F5F8FF] px-2 py-2 text-[10px] font-semibold text-[#50617F]">5 roles</span><span className="rounded-lg bg-[#F5F8FF] px-2 py-2 text-[10px] font-semibold text-[#50617F]">6 months</span><span className="rounded-lg bg-[#F5F8FF] px-2 py-2 text-[10px] font-semibold text-[#50617F]">Tenant scoped</span></div><div className="mt-8 rounded-xl bg-[#F5F8FF] p-4 text-sm leading-6 text-[#4B5C7A]"><span className="font-semibold text-[#14213D]">Demonstration access</span><br />No shared password is required. Use any Manus account; the app provisions a tenant-isolated synthetic workspace with owner, admin, manager, member, and viewer roles.</div><p className="mt-5 text-center text-xs text-[#98A2B3]">Public entry is independent of tenant data and remains available if the workspace service is unavailable.</p></div></section>
      </main>
    );
  }

  const navigate = (path: string) => { setLocation(path); setMobileOpen(false); };
  const renderNav = (items: typeof primaryNavigation) => items.map(item => <SidebarMenuItem key={item.path}><SidebarMenuButton isActive={location === item.path} onClick={() => navigate(item.path)} tooltip={item.label} className="h-10 rounded-xl px-3 text-[#50617F] data-[active=true]:bg-[#EAF1FF] data-[active=true]:font-semibold data-[active=true]:text-[#195FE6]"><item.icon className="h-[18px] w-[18px]" /><span>{item.label}</span></SidebarMenuButton></SidebarMenuItem>);

  return (
    <SidebarProvider defaultOpen>
      <Sidebar className={`border-r border-[#E7ECF5] bg-white ${mobileOpen ? "translate-x-0" : ""}`}>
        <SidebarHeader className="h-20 justify-center px-5"><button onClick={() => navigate("/")} className="text-left text-sm"><ElegexWordmark compact /></button></SidebarHeader>
        <SidebarContent className="gap-7 px-3 pb-5"><div><p className="px-3 pb-2 text-[10px] font-bold tracking-[0.16em] text-[#98A2B3]">WORKSPACE</p><SidebarMenu>{renderNav(primaryNavigation)}</SidebarMenu></div><div><p className="px-3 pb-2 text-[10px] font-bold tracking-[0.16em] text-[#98A2B3]">INSIGHTS</p><SidebarMenu>{renderNav(secondaryNavigation)}</SidebarMenu></div>{isPrivileged ? <div><p className="px-3 pb-2 text-[10px] font-bold tracking-[0.16em] text-[#98A2B3]">ADMINISTRATION</p><SidebarMenu><SidebarMenuItem><SidebarMenuButton isActive={location === "/staging"} onClick={() => navigate("/staging")} tooltip="Staging readiness" className="h-10 rounded-xl px-3 text-[#50617F] data-[active=true]:bg-[#EAF1FF] data-[active=true]:font-semibold data-[active=true]:text-[#195FE6]"><ShieldCheck className="h-[18px] w-[18px]" /><span>Staging readiness</span></SidebarMenuButton></SidebarMenuItem><SidebarMenuItem><SidebarMenuButton isActive={location === "/admin"} onClick={() => navigate("/admin")} tooltip="Administration" className="h-10 rounded-xl px-3 text-[#50617F] data-[active=true]:bg-[#EAF1FF] data-[active=true]:font-semibold data-[active=true]:text-[#195FE6]"><ShieldCheck className="h-[18px] w-[18px]" /><span>Administration</span></SidebarMenuButton></SidebarMenuItem><SidebarMenuItem><SidebarMenuButton isActive={location === "/settings"} onClick={() => navigate("/settings")} tooltip="Settings" className="h-10 rounded-xl px-3 text-[#50617F] data-[active=true]:bg-[#EAF1FF] data-[active=true]:font-semibold data-[active=true]:text-[#195FE6]"><Settings2 className="h-[18px] w-[18px]" /><span>Settings</span></SidebarMenuButton></SidebarMenuItem></SidebarMenu></div> : null}</SidebarContent>
        <SidebarFooter className="border-t border-[#EEF2F7] p-4"><button onClick={logout} className="group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-[#F5F8FF]"><Avatar className="h-9 w-9"><AvatarFallback className="bg-[#EAF1FF] text-xs font-bold text-[#195FE6]">{user.name?.split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase() || "EU"}</AvatarFallback></Avatar><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-[#24324D]">{user.name || "Elegex user"}</span><span className="block truncate text-xs capitalize text-[#7A879E]">{workspace.data?.role || "loading"} · {workspace.data?.organizationName || "workspace"}</span></span><LogOut className="h-4 w-4 text-[#98A2B3] transition-colors group-hover:text-[#195FE6]" /></button></SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-[#F5F7FB]"><header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-[#E7ECF5] bg-[#F5F7FB]/90 px-5 backdrop-blur-xl md:px-8"><div className="flex items-center gap-3"><button onClick={() => setMobileOpen(!mobileOpen)} className="grid h-10 w-10 place-items-center rounded-xl border border-[#E4EAF4] bg-white text-[#50617F] lg:hidden"><Menu className="h-5 w-5" /></button><div><p className="text-xs font-medium text-[#7A879E]">{workspace.data?.organizationName || "Elegex Operations"}</p><p className="text-sm font-semibold text-[#14213D]">{location === "/" ? "Command centre" : location.slice(1).replace(/-/g, " ")}</p></div></div><button onClick={() => navigate("/notifications")} className="relative grid h-10 w-10 place-items-center rounded-xl border border-[#E4EAF4] bg-white text-[#50617F] transition-colors hover:border-[#B6D4FF] hover:text-[#195FE6]"><Bell className="h-[18px] w-[18px]" />{workspace.data ? <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-[#F5F7FB] bg-[#EA526F]" /> : null}</button></header><main className="min-h-[calc(100vh-5rem)] p-5 md:p-8">{children}</main></SidebarInset>
    </SidebarProvider>
  );
}
