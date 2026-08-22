export type WorkspaceRole = "owner" | "admin" | "manager" | "member" | "viewer";

export const canAccessWorkspaceAdministration = (
  role?: WorkspaceRole | string | null
) => role === "owner" || role === "admin";
export const canManageOperationalControls = (
  role?: WorkspaceRole | string | null
) => ["owner", "admin", "manager"].includes(role || "");
export const canEditWorkspaceRecords = (role?: WorkspaceRole | string | null) =>
  role !== "viewer" && Boolean(role);

export const workspaceRoutePolicy = [
  { path: "/", minimumRole: "viewer" },
  { path: "/jobs", minimumRole: "viewer" },
  { path: "/jobs/:id", minimumRole: "viewer" },
  { path: "/field", minimumRole: "member" },
  { path: "/dispatch", minimumRole: "viewer" },
  { path: "/contacts", minimumRole: "viewer" },
  { path: "/contacts/:id", minimumRole: "viewer" },
  { path: "/projects", minimumRole: "viewer" },
  { path: "/projects/:id", minimumRole: "viewer" },
  { path: "/cases", minimumRole: "viewer" },
  { path: "/cases/:id", minimumRole: "viewer" },
  { path: "/tasks", minimumRole: "viewer" },
  { path: "/documents", minimumRole: "viewer" },
  { path: "/photos", minimumRole: "viewer" },
  { path: "/reports", minimumRole: "viewer" },
  { path: "/notifications", minimumRole: "viewer" },
  { path: "/staging", minimumRole: "admin" },
  { path: "/admin", minimumRole: "admin" },
  { path: "/settings", minimumRole: "admin" },
] as const;

export function canAccessWorkspaceRoute(
  path: string,
  role?: WorkspaceRole | string | null
) {
  const policy = workspaceRoutePolicy.find(entry => entry.path === path);
  if (!policy) return false;
  if (policy.minimumRole === "admin")
    return canAccessWorkspaceAdministration(role);
  if (policy.minimumRole === "member") return canEditWorkspaceRecords(role);
  return Boolean(role);
}
