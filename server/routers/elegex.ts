import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import { checkDatabaseHealth } from "../connectors/database";
import { enqueueIntegrationEvent, listDispatchableEvents, listIntegrationConnections, upsertIntegrationConnection } from "../connectors/outbox";
import { storagePut } from "../storage";
import { protectedProcedure, router } from "../_core/trpc";

const listInput = z.object({ query: z.string().max(120).optional(), status: z.string().max(40).optional(), page: z.number().int().positive().optional(), pageSize: z.number().int().positive().max(50).optional() });
const tenantProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const scope = await db.ensureTenantScope(ctx.user.id);
  return next({ ctx: { ...ctx, scope } });
});

function requireEdit(role: Parameters<typeof db.canEditRecords>[0]) {
  if (!db.canEditRecords(role)) throw new TRPCError({ code: "FORBIDDEN", message: "Your workspace role is read-only." });
}

function requireManage(role: Parameters<typeof db.canManageRecords>[0]) {
  if (!db.canManageRecords(role)) throw new TRPCError({ code: "FORBIDDEN", message: "Your workspace role cannot perform this action." });
}

function requireAdmin(role: Parameters<typeof db.canManageWorkspace>[0]) {
  if (!db.canManageWorkspace(role)) throw new TRPCError({ code: "FORBIDDEN", message: "Only workspace owners and administrators can access this area." });
}

export const elegexRouter = router({
  workspace: router({
    current: tenantProcedure.query(({ ctx }) => ctx.scope),
    members: tenantProcedure.query(({ ctx }) => db.listWorkspaceMembers(ctx.scope.organizationId)),
  }),
  dashboard: tenantProcedure.query(({ ctx }) => db.getDashboard(ctx.scope.organizationId, ctx.user.id)),
  contacts: router({
    list: tenantProcedure.input(listInput).query(({ ctx, input }) => db.listContacts({ ...input, organizationId: ctx.scope.organizationId })),
    create: tenantProcedure.input(z.object({ name: z.string().min(2).max(160), company: z.string().max(160).optional(), email: z.string().email().optional().or(z.literal("")), phone: z.string().max(50).optional(), location: z.string().max(180).optional(), status: z.enum(["lead", "active", "inactive"]).optional(), notes: z.string().max(4000).optional() })).mutation(({ ctx, input }) => { requireEdit(ctx.scope.role); return db.createContact(ctx.scope.organizationId, ctx.user.id, { ...input, email: input.email || undefined }); }),
    update: tenantProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().min(2).max(160).optional(), company: z.string().max(160).optional(), email: z.string().email().optional().or(z.literal("")), phone: z.string().max(50).optional(), location: z.string().max(180).optional(), status: z.enum(["lead", "active", "inactive"]).optional(), notes: z.string().max(4000).optional() })).mutation(({ ctx, input }) => { requireEdit(ctx.scope.role); const { id, ...record } = input; return db.updateContact(ctx.scope.organizationId, ctx.user.id, id, { ...record, email: record.email || undefined }); }),
  }),
  projects: router({
    list: tenantProcedure.input(listInput).query(({ ctx, input }) => db.listProjects({ ...input, organizationId: ctx.scope.organizationId })),
    create: tenantProcedure.input(z.object({ name: z.string().min(2).max(180), code: z.string().min(2).max(32), contactId: z.number().int().positive().optional(), description: z.string().max(5000).optional(), status: z.enum(["planning", "active", "on_hold", "complete", "archived"]).optional(), priority: z.enum(["low", "medium", "high", "urgent"]).optional(), dueDate: z.date().optional(), budget: z.number().int().nonnegative().optional() })).mutation(({ ctx, input }) => { requireEdit(ctx.scope.role); return db.createProject(ctx.scope.organizationId, ctx.user.id, input); }),
    update: tenantProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().min(2).max(180).optional(), description: z.string().max(5000).optional(), status: z.enum(["planning", "active", "on_hold", "complete", "archived"]).optional(), priority: z.enum(["low", "medium", "high", "urgent"]).optional(), progress: z.number().int().min(0).max(100).optional(), dueDate: z.date().optional(), budget: z.number().int().nonnegative().optional() })).mutation(({ ctx, input }) => { requireEdit(ctx.scope.role); const { id, ...record } = input; return db.updateProject(ctx.scope.organizationId, ctx.user.id, id, record); }),
  }),
  cases: router({
    list: tenantProcedure.input(listInput).query(({ ctx, input }) => db.listCases({ ...input, organizationId: ctx.scope.organizationId })),
    create: tenantProcedure.input(z.object({ reference: z.string().min(3).max(40), title: z.string().min(3).max(180), summary: z.string().max(5000).optional(), contactId: z.number().int().positive().optional(), projectId: z.number().int().positive().optional(), severity: z.enum(["low", "medium", "high", "critical"]).optional(), ownerId: z.number().int().positive().optional(), dueDate: z.date().optional() })).mutation(({ ctx, input }) => { requireEdit(ctx.scope.role); return db.createCase(ctx.scope.organizationId, ctx.user.id, input); }),
    update: tenantProcedure.input(z.object({ id: z.number().int().positive(), title: z.string().min(3).max(180).optional(), summary: z.string().max(5000).optional(), status: z.enum(["open", "investigating", "pending", "resolved", "closed"]).optional(), severity: z.enum(["low", "medium", "high", "critical"]).optional(), ownerId: z.number().int().positive().optional(), dueDate: z.date().optional() })).mutation(({ ctx, input }) => { requireEdit(ctx.scope.role); const { id, ...record } = input; return db.updateCase(ctx.scope.organizationId, ctx.user.id, id, record); }),
  }),
  tasks: router({
    list: tenantProcedure.input(listInput).query(({ ctx, input }) => db.listTasks({ ...input, organizationId: ctx.scope.organizationId })),
    create: tenantProcedure.input(z.object({ title: z.string().min(3).max(180), description: z.string().max(5000).optional(), projectId: z.number().int().positive().optional(), caseId: z.number().int().positive().optional(), priority: z.enum(["low", "medium", "high", "urgent"]).optional(), assigneeId: z.number().int().positive().optional(), dueDate: z.date().optional() })).mutation(({ ctx, input }) => { requireEdit(ctx.scope.role); return db.createTask(ctx.scope.organizationId, ctx.user.id, input); }),
    update: tenantProcedure.input(z.object({ id: z.number().int().positive(), title: z.string().min(3).max(180).optional(), description: z.string().max(5000).optional(), projectId: z.number().int().positive().optional(), status: z.enum(["todo", "in_progress", "blocked", "complete"]).optional(), priority: z.enum(["low", "medium", "high", "urgent"]).optional(), assigneeId: z.number().int().positive().optional(), dueDate: z.date().optional() })).mutation(({ ctx, input }) => { requireEdit(ctx.scope.role); const { id, ...record } = input; return db.updateTask(ctx.scope.organizationId, ctx.user.id, id, record); }),
  }),
  records: router({
    detail: tenantProcedure.input(z.object({ resource: z.enum(["contacts", "projects", "cases"]), id: z.number().int().positive() })).query(({ ctx, input }) => db.getRecordDetail(ctx.scope.organizationId, input.resource, input.id)),
    archive: tenantProcedure.input(z.object({ resource: z.enum(["contacts", "projects", "cases", "tasks"]), id: z.number().int().positive() })).mutation(({ ctx, input }) => { requireManage(ctx.scope.role); return db.archiveRecord(ctx.scope.organizationId, ctx.user.id, input.resource, input.id); }),
  }),
  notifications: router({
    list: tenantProcedure.query(({ ctx }) => db.getNotifications(ctx.scope.organizationId, ctx.user.id)),
    markRead: tenantProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => db.markNotificationRead(ctx.scope.organizationId, ctx.user.id, input.id)),
  }),
  documents: router({
    list: tenantProcedure.input(z.object({ resource: z.enum(["contact", "project", "case"]).optional(), recordId: z.number().int().positive().optional() }).optional()).query(({ ctx, input }) => db.listDocuments(ctx.scope.organizationId, input?.resource, input?.recordId)),
    upload: tenantProcedure.input(z.object({ fileName: z.string().min(1).max(255), mimeType: z.string().min(1).max(120), dataUrl: z.string().max(7_000_000), projectId: z.number().int().positive().optional(), caseId: z.number().int().positive().optional(), contactId: z.number().int().positive().optional() })).mutation(async ({ ctx, input }) => {
      requireEdit(ctx.scope.role);
      const allowed = ["application/pdf", "text/plain", "text/csv", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/jpeg", "image/png"];
      if (!allowed.includes(input.mimeType)) throw new TRPCError({ code: "BAD_REQUEST", message: "This file type is not permitted." });
      const base64 = input.dataUrl.split(",")[1];
      if (!base64) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid upload payload." });
      const bytes = Buffer.from(base64, "base64");
      if (bytes.length > 5_000_000) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Files must be 5 MB or smaller." });
      const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const uploaded = await storagePut(`elegex/${ctx.scope.organizationId}/documents/${safeName}`, bytes, input.mimeType);
      return db.createDocumentRecord(ctx.scope.organizationId, ctx.user.id, { ...input, storageKey: uploaded.key, storageUrl: uploaded.url, sizeBytes: bytes.length });
    }),
  }),
  reports: router({
    rows: tenantProcedure.query(({ ctx }) => db.getReportRows(ctx.scope.organizationId)),
    savedViews: tenantProcedure.query(({ ctx }) => db.getSavedViews(ctx.scope.organizationId, ctx.user.id)),
    saveView: tenantProcedure.input(z.object({ name: z.string().min(2).max(120), filters: z.record(z.string(), z.unknown()), isShared: z.boolean().optional() })).mutation(({ ctx, input }) => db.createSavedView(ctx.scope.organizationId, ctx.user.id, { ...input, resource: "reports" })),
  }),
  integrations: router({
    databaseHealth: tenantProcedure.query(async ({ ctx }) => { requireAdmin(ctx.scope.role); return checkDatabaseHealth(); }),
    list: tenantProcedure.query(({ ctx }) => { requireAdmin(ctx.scope.role); return listIntegrationConnections(ctx.scope.organizationId); }),
    upsert: tenantProcedure.input(z.object({ provider: z.enum(["database", "webhook", "analytics", "storage"]), name: z.string().min(2).max(120), configuration: z.record(z.string(), z.unknown()), secretReference: z.string().max(180).optional(), status: z.enum(["active", "paused", "degraded", "disabled"]).optional() })).mutation(({ ctx, input }) => { requireAdmin(ctx.scope.role); return upsertIntegrationConnection({ ...input, organizationId: ctx.scope.organizationId, createdBy: ctx.user.id }); }),
    enqueue: tenantProcedure.input(z.object({ connectionId: z.number().int().positive(), eventType: z.string().min(2).max(120), payload: z.record(z.string(), z.unknown()), idempotencyKey: z.string().min(8).max(180) })).mutation(({ ctx, input }) => { requireAdmin(ctx.scope.role); return enqueueIntegrationEvent({ ...input, organizationId: ctx.scope.organizationId }); }),
    dispatchable: tenantProcedure.input(z.object({ connectionId: z.number().int().positive(), limit: z.number().int().positive().max(100).optional() })).query(({ ctx, input }) => { requireAdmin(ctx.scope.role); return listDispatchableEvents(input.connectionId, input.limit); }),
  }),
  admin: router({
    data: tenantProcedure.query(({ ctx }) => { requireAdmin(ctx.scope.role); return db.getAdminData(ctx.scope.organizationId); }),
    updateMemberRole: tenantProcedure.input(z.object({ membershipId: z.number().int().positive(), role: z.enum(["admin", "manager", "member", "viewer"]) })).mutation(({ ctx, input }) => { requireAdmin(ctx.scope.role); return db.updateMemberRole(ctx.scope.organizationId, ctx.user.id, input.membershipId, input.role); }),
    updateSettings: tenantProcedure.input(z.object({ name: z.string().min(2).max(160).optional(), primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(), timezone: z.string().max(80).optional(), allowMemberInvites: z.boolean().optional(), notificationDigest: z.boolean().optional() })).mutation(({ ctx, input }) => { requireAdmin(ctx.scope.role); return db.updateSettings(ctx.scope.organizationId, ctx.user.id, input); }),
    resetDemo: tenantProcedure.mutation(({ ctx }) => { requireAdmin(ctx.scope.role); return db.resetDemoData(ctx.scope.organizationId, ctx.user.id); }),
  }),
});
