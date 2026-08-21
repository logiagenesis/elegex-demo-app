import {
  boolean,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  slug: varchar("slug", { length: 160 }).notNull().unique(),
  industry: varchar("industry", { length: 100 }),
  primaryColor: varchar("primaryColor", { length: 16 }).default("#2563EB").notNull(),
  timezone: varchar("timezone", { length: 80 }).default("Africa/Johannesburg").notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const organizationMembers = mysqlTable("organizationMembers", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["owner", "admin", "manager", "member", "viewer"]).notNull(),
  title: varchar("title", { length: 120 }),
  isActive: boolean("isActive").default(true).notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
}, table => [
  index("member_organization_idx").on(table.organizationId),
  index("member_user_idx").on(table.userId),
  uniqueIndex("member_organization_user_unique").on(table.organizationId, table.userId),
]);

export const invitations = mysqlTable("invitations", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  role: mysqlEnum("role", ["admin", "manager", "member", "viewer"]).notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  invitedBy: int("invitedBy").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  acceptedAt: timestamp("acceptedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("invite_organization_idx").on(table.organizationId)]);

export const contacts = mysqlTable("contacts", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  company: varchar("company", { length: 160 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  location: varchar("location", { length: 180 }),
  status: mysqlEnum("status", ["lead", "active", "inactive"]).default("lead").notNull(),
  notes: text("notes"),
  metadata: json("metadata"),
  createdBy: int("createdBy").notNull(),
  updatedBy: int("updatedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp("deletedAt"),
}, table => [
  index("contact_organization_idx").on(table.organizationId),
  index("contact_status_idx").on(table.organizationId, table.status),
]);

export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  contactId: int("contactId"),
  name: varchar("name", { length: 180 }).notNull(),
  code: varchar("code", { length: 32 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["planning", "active", "on_hold", "complete", "archived"]).default("planning").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
  startDate: timestamp("startDate"),
  dueDate: timestamp("dueDate"),
  budget: int("budget"),
  progress: int("progress").default(0).notNull(),
  metadata: json("metadata"),
  createdBy: int("createdBy").notNull(),
  updatedBy: int("updatedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp("deletedAt"),
}, table => [
  index("project_organization_idx").on(table.organizationId),
  index("project_status_idx").on(table.organizationId, table.status),
]);

export const cases = mysqlTable("cases", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  contactId: int("contactId"),
  projectId: int("projectId"),
  reference: varchar("reference", { length: 40 }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  summary: text("summary"),
  status: mysqlEnum("status", ["open", "investigating", "pending", "resolved", "closed"]).default("open").notNull(),
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  ownerId: int("ownerId"),
  dueDate: timestamp("dueDate"),
  metadata: json("metadata"),
  createdBy: int("createdBy").notNull(),
  updatedBy: int("updatedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp("deletedAt"),
}, table => [
  index("case_organization_idx").on(table.organizationId),
  index("case_status_idx").on(table.organizationId, table.status),
]);

export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  projectId: int("projectId"),
  caseId: int("caseId"),
  title: varchar("title", { length: 180 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["todo", "in_progress", "blocked", "complete"]).default("todo").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
  assigneeId: int("assigneeId"),
  dueDate: timestamp("dueDate"),
  completedAt: timestamp("completedAt"),
  createdBy: int("createdBy").notNull(),
  updatedBy: int("updatedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp("deletedAt"),
}, table => [
  index("task_organization_idx").on(table.organizationId),
  index("task_assignee_idx").on(table.organizationId, table.assigneeId),
  index("task_status_idx").on(table.organizationId, table.status),
]);

export const notes = mysqlTable("notes", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  projectId: int("projectId"),
  caseId: int("caseId"),
  contactId: int("contactId"),
  content: text("content").notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("note_organization_idx").on(table.organizationId)]);

export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  projectId: int("projectId"),
  caseId: int("caseId"),
  contactId: int("contactId"),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 120 }).notNull(),
  sizeBytes: int("sizeBytes").notNull(),
  storageKey: varchar("storageKey", { length: 500 }).notNull(),
  storageUrl: varchar("storageUrl", { length: 600 }).notNull(),
  uploadedBy: int("uploadedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("document_organization_idx").on(table.organizationId)]);

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["assignment", "activity", "system"]).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  description: text("description"),
  href: varchar("href", { length: 300 }),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("notification_organization_idx").on(table.organizationId),
  index("notification_user_idx").on(table.userId, table.readAt),
]);

export const activityLogs = mysqlTable("activityLogs", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  actorId: int("actorId"),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entityType", { length: 60 }).notNull(),
  entityId: int("entityId"),
  summary: varchar("summary", { length: 500 }).notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("activity_organization_idx").on(table.organizationId, table.createdAt),
]);

export const savedViews = mysqlTable("savedViews", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  resource: mysqlEnum("resource", ["contacts", "projects", "cases", "tasks", "reports"]).notNull(),
  filters: json("filters").notNull(),
  isShared: boolean("isShared").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("saved_view_organization_idx").on(table.organizationId, table.resource)]);

export const appSettings = mysqlTable("appSettings", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().unique(),
  defaultProjectStatus: varchar("defaultProjectStatus", { length: 32 }).default("planning").notNull(),
  allowMemberInvites: boolean("allowMemberInvites").default(false).notNull(),
  notificationDigest: boolean("notificationDigest").default(true).notNull(),
  metadata: json("metadata"),
  updatedBy: int("updatedBy").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const integrationConnections = mysqlTable("integrationConnections", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  provider: mysqlEnum("provider", ["database", "webhook", "analytics", "storage"]).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  status: mysqlEnum("status", ["active", "paused", "degraded", "disabled"]).default("active").notNull(),
  configuration: json("configuration").notNull(),
  secretReference: varchar("secretReference", { length: 180 }),
  lastValidatedAt: timestamp("lastValidatedAt"),
  lastError: text("lastError"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("integration_connection_organization_idx").on(table.organizationId, table.status),
  uniqueIndex("integration_connection_unique").on(table.organizationId, table.provider, table.name),
]);

export const integrationEvents = mysqlTable("integrationEvents", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  connectionId: int("connectionId").notNull(),
  eventType: varchar("eventType", { length: 120 }).notNull(),
  payload: json("payload").notNull(),
  idempotencyKey: varchar("idempotencyKey", { length: 180 }).notNull(),
  status: mysqlEnum("status", ["pending", "processing", "delivered", "failed", "discarded"]).default("pending").notNull(),
  attempts: int("attempts").default(0).notNull(),
  availableAt: timestamp("availableAt").defaultNow().notNull(),
  processedAt: timestamp("processedAt"),
  lastError: text("lastError"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("integration_event_dispatch_idx").on(table.connectionId, table.status, table.availableAt),
  uniqueIndex("integration_event_idempotency_unique").on(table.connectionId, table.idempotencyKey),
]);

export const jobs = mysqlTable("jobs", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  contactId: int("contactId").notNull(),
  projectId: int("projectId"),
  jobNumber: varchar("jobNumber", { length: 32 }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  description: text("description").notNull(),
  serviceAddress: varchar("serviceAddress", { length: 360 }).notNull(),
  stage: mysqlEnum("stage", ["scheduled", "in_progress", "on_hold", "ready_for_invoicing", "invoiced", "cancelled"]).default("scheduled").notNull(),
  priority: mysqlEnum("priority", ["routine", "standard", "urgent", "critical"]).default("standard").notNull(),
  foremanId: int("foremanId"),
  scheduledStart: timestamp("scheduledStart"),
  scheduledEnd: timestamp("scheduledEnd"),
  checkInAt: timestamp("checkInAt"),
  checkOutAt: timestamp("checkOutAt"),
  geoStatus: mysqlEnum("geoStatus", ["pending", "verified", "flagged", "manual_override"]).default("pending").notNull(),
  holdReason: varchar("holdReason", { length: 500 }),
  cancelReason: varchar("cancelReason", { length: 500 }),
  completedAt: timestamp("completedAt"),
  readyForInvoiceAt: timestamp("readyForInvoiceAt"),
  createdBy: int("createdBy").notNull(),
  updatedBy: int("updatedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp("deletedAt"),
}, table => [
  uniqueIndex("job_organization_number_unique").on(table.organizationId, table.jobNumber),
  index("job_organization_stage_idx").on(table.organizationId, table.stage, table.scheduledStart),
  index("job_foreman_schedule_idx").on(table.organizationId, table.foremanId, table.scheduledStart),
]);

export const jobVisits = mysqlTable("jobVisits", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  jobId: int("jobId").notNull(),
  foremanId: int("foremanId").notNull(),
  scheduledStart: timestamp("scheduledStart").notNull(),
  scheduledEnd: timestamp("scheduledEnd").notNull(),
  status: mysqlEnum("status", ["scheduled", "en_route", "on_site", "complete", "missed", "cancelled"]).default("scheduled").notNull(),
  travelMinutes: int("travelMinutes").default(0).notNull(),
  geoStatus: mysqlEnum("geoStatus", ["pending", "verified", "flagged", "manual_override"]).default("pending").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("job_visit_dispatch_idx").on(table.organizationId, table.foremanId, table.scheduledStart),
  index("job_visit_job_idx").on(table.organizationId, table.jobId),
]);

export const jobMaterials = mysqlTable("jobMaterials", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  jobId: int("jobId").notNull(),
  description: varchar("description", { length: 240 }).notNull(),
  quantity: int("quantity").default(1).notNull(),
  unit: varchar("unit", { length: 40 }).default("each").notNull(),
  source: mysqlEnum("source", ["catalog", "free_text", "client_supplied"]).default("catalog").notNull(),
  unitPrice: int("unitPrice").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("job_material_job_idx").on(table.organizationId, table.jobId)]);

export const jobEvidence = mysqlTable("jobEvidence", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  jobId: int("jobId").notNull(),
  evidenceType: mysqlEnum("evidenceType", ["before_photo", "after_photo", "video", "signature", "job_card", "safety_document", "note"]).notNull(),
  title: varchar("title", { length: 240 }).notNull(),
  storageUrl: varchar("storageUrl", { length: 600 }),
  capturedBy: int("capturedBy"),
  capturedAt: timestamp("capturedAt").defaultNow().notNull(),
  syncStatus: mysqlEnum("syncStatus", ["synced", "pending_upload", "needs_review"]).default("synced").notNull(),
  metadata: json("metadata"),
}, table => [index("job_evidence_job_idx").on(table.organizationId, table.jobId, table.evidenceType)]);

export const quotes = mysqlTable("quotes", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  jobId: int("jobId").notNull(),
  quoteNumber: varchar("quoteNumber", { length: 40 }).notNull(),
  status: mysqlEnum("status", ["needs_pricing", "draft", "sent", "accepted", "declined", "expired"]).default("needs_pricing").notNull(),
  assessedAt: timestamp("assessedAt"),
  sentAt: timestamp("sentAt"),
  respondedAt: timestamp("respondedAt"),
  validUntil: timestamp("validUntil"),
  total: int("total").default(0).notNull(),
  declineReason: varchar("declineReason", { length: 500 }),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("quote_organization_number_unique").on(table.organizationId, table.quoteNumber),
  index("quote_organization_status_idx").on(table.organizationId, table.status, table.updatedAt),
]);

export const quoteItems = mysqlTable("quoteItems", {
  id: int("id").autoincrement().primaryKey(),
  quoteId: int("quoteId").notNull(),
  description: varchar("description", { length: 240 }).notNull(),
  quantity: int("quantity").default(1).notNull(),
  unitPrice: int("unitPrice").default(0).notNull(),
  total: int("total").default(0).notNull(),
  source: mysqlEnum("source", ["catalog", "free_text"]).default("catalog").notNull(),
}, table => [index("quote_item_quote_idx").on(table.quoteId)]);

export const invoiceLinks = mysqlTable("invoiceLinks", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  jobId: int("jobId").notNull(),
  externalSystem: varchar("externalSystem", { length: 80 }).default("QuickBooks Online").notNull(),
  externalInvoiceNumber: varchar("externalInvoiceNumber", { length: 80 }).notNull(),
  status: mysqlEnum("status", ["linked", "credited", "superseded"]).default("linked").notNull(),
  linkedAt: timestamp("linkedAt").defaultNow().notNull(),
  linkedBy: int("linkedBy").notNull(),
  notes: varchar("notes", { length: 500 }),
}, table => [index("invoice_link_job_idx").on(table.organizationId, table.jobId, table.status)]);

export const monthlyOperationalSnapshots = mysqlTable("monthlyOperationalSnapshots", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  periodStart: timestamp("periodStart").notNull(),
  jobsCompleted: int("jobsCompleted").default(0).notNull(),
  jobsInProgress: int("jobsInProgress").default(0).notNull(),
  jobsOnHold: int("jobsOnHold").default(0).notNull(),
  quotesSent: int("quotesSent").default(0).notNull(),
  quotesAccepted: int("quotesAccepted").default(0).notNull(),
  invoicesLinked: int("invoicesLinked").default(0).notNull(),
  invoicedValue: int("invoicedValue").default(0).notNull(),
  firstVisitResolutionRate: int("firstVisitResolutionRate").default(0).notNull(),
  customerSatisfactionIndex: int("customerSatisfactionIndex").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("monthly_snapshot_organization_period_unique").on(table.organizationId, table.periodStart)]);

export const environmentReleases = mysqlTable("environmentReleases", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  environment: mysqlEnum("environment", ["development", "staging", "production"]).notNull(),
  version: varchar("version", { length: 80 }).notNull(),
  commitSha: varchar("commitSha", { length: 80 }),
  status: mysqlEnum("status", ["planned", "deploying", "healthy", "degraded", "rolled_back"]).default("planned").notNull(),
  deployedBy: int("deployedBy").notNull(),
  deployedAt: timestamp("deployedAt").defaultNow().notNull(),
  rollbackVersion: varchar("rollbackVersion", { length: 80 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("environment_release_organization_idx").on(table.organizationId, table.environment, table.deployedAt)]);

export const releaseChecks = mysqlTable("releaseChecks", {
  id: int("id").autoincrement().primaryKey(),
  releaseId: int("releaseId").notNull(),
  category: mysqlEnum("category", ["database", "api", "ui", "security", "performance", "observability"]).notNull(),
  checkName: varchar("checkName", { length: 180 }).notNull(),
  status: mysqlEnum("status", ["passed", "warning", "failed", "not_run"]).notNull(),
  evidence: varchar("evidence", { length: 600 }),
  checkedAt: timestamp("checkedAt").defaultNow().notNull(),
  checkedBy: varchar("checkedBy", { length: 120 }).default("release workflow").notNull(),
}, table => [index("release_check_release_idx").on(table.releaseId, table.category, table.status)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type OrganizationRole = OrganizationMember["role"];
export type Job = typeof jobs.$inferSelect;
export type JobStage = Job["stage"];
