export type WorkspaceRole = "owner" | "admin" | "manager" | "member" | "viewer";

export const canAccessWorkspaceAdministration = (role?: WorkspaceRole | string | null) => role === "owner" || role === "admin";
export const canManageOperationalControls = (role?: WorkspaceRole | string | null) => ["owner", "admin", "manager"].includes(role || "");
export const canEditWorkspaceRecords = (role?: WorkspaceRole | string | null) => role !== "viewer" && Boolean(role);
