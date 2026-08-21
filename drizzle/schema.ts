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

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type OrganizationRole = OrganizationMember["role"];
