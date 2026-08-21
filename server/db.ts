import { and, asc, count, desc, eq, isNull, like, or, sql } from "drizzle-orm";
import {
  activityLogs,
  appSettings,
  cases,
  contacts,
  documents,
  notifications,
  organizationMembers,
  organizations,
  projects,
  savedViews,
  tasks,
  type InsertUser,
  type OrganizationRole,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { writeAuditEvent } from "./connectors/audit";
import { getDatabase, withTransaction } from "./connectors/database";

export async function getDb() {
  return getDatabase();
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = {
    openId: user.openId,
    name: user.name ?? null,
    email: user.email ?? null,
    loginMethod: user.loginMethod ?? null,
    lastSignedIn: user.lastSignedIn ?? new Date(),
    role: user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user"),
  };
  await db.insert(users).values(values).onDuplicateKeyUpdate({
    set: {
      name: values.name,
      email: values.email,
      loginMethod: values.loginMethod,
      lastSignedIn: new Date(),
      role: values.role,
    },
  });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export type TenantScope = {
  organizationId: number;
  role: OrganizationRole;
  organizationName: string;
  primaryColor: string;
};

export const canManageWorkspace = (role: OrganizationRole) => ["owner", "admin"].includes(role);
export const canEditRecords = (role: OrganizationRole) => role !== "viewer";
export const canManageRecords = (role: OrganizationRole) => ["owner", "admin", "manager"].includes(role);

async function logActivity(
  organizationId: number,
  actorId: number | null,
  action: string,
  entityType: string,
  entityId: number | null,
  summary: string,
) {
  await writeAuditEvent({ organizationId, actorId, action, entityType, entityId, summary });
}

async function seedDemoWorkspace(organizationId: number, ownerId: number) {
  const db = await getDb();
  if (!db) return;
  const contactRows = await db.select({ total: count() }).from(contacts).where(eq(contacts.organizationId, organizationId));
  if ((contactRows[0]?.total ?? 0) > 0) return;

  const now = Date.now();
  const date = (days: number) => new Date(now + days * 86_400_000);
  const team = [
    { openId: `elegex-${organizationId}-mila`, name: "Mila Petersen", email: "mila.petersen@elegex.demo", title: "Operations Manager", role: "manager" as const },
    { openId: `elegex-${organizationId}-jordan`, name: "Jordan Okoro", email: "jordan.okoro@elegex.demo", title: "Project Lead", role: "member" as const },
    { openId: `elegex-${organizationId}-sana`, name: "Sana Davids", email: "sana.davids@elegex.demo", title: "Finance Reviewer", role: "viewer" as const },
  ];
  const teamIds: number[] = [];
  for (const teammate of team) {
    await db.insert(users).values({ ...teammate, loginMethod: "demo", role: "user", lastSignedIn: new Date() }).onDuplicateKeyUpdate({ set: { name: teammate.name, email: teammate.email } });
    const teammateRow = await db.select().from(users).where(eq(users.openId, teammate.openId)).limit(1);
    const teammateId = teammateRow[0]?.id;
    if (teammateId) {
      teamIds.push(teammateId);
      await db.insert(organizationMembers).values({ organizationId, userId: teammateId, role: teammate.role, title: teammate.title }).onDuplicateKeyUpdate({ set: { title: teammate.title, role: teammate.role, isActive: true } });
    }
  }

  await db.insert(appSettings).values({ organizationId, updatedBy: ownerId });
  const contactValues = [
    { name: "Aisha Naidoo", company: "Northstar Properties", email: "aisha@northstarproperties.co.za", phone: "+27 21 555 0193", location: "Cape Town", status: "active" as const, notes: "Primary portfolio contact. Prefers concise Friday updates." },
    { name: "Lucas Mthembu", company: "Cedar Health Group", email: "lucas@cedarhealth.co.za", phone: "+27 31 880 1224", location: "Durban", status: "active" as const, notes: "Stakeholder for the digital intake programme." },
    { name: "Elena Meyer", company: "Helio Retail", email: "elena@helioretail.co.za", phone: "+27 11 322 8900", location: "Johannesburg", status: "lead" as const, notes: "Exploring a phased service rollout in Q4." },
    { name: "Tendai Ncube", company: "Arbor Logistics", email: "tendai@arborlogistics.co.za", phone: "+27 21 742 4371", location: "Cape Town", status: "active" as const, notes: "Monthly steering review on the first Wednesday." },
  ];
  await db.insert(contacts).values(contactValues.map(contact => ({ ...contact, organizationId, createdBy: ownerId, updatedBy: ownerId })));
  const seededContacts = await db.select().from(contacts).where(eq(contacts.organizationId, organizationId)).orderBy(asc(contacts.id));

  const projectValues = [
    { name: "Harbourview Portfolio Transition", code: "HV-024", description: "Coordinate the operational transition across the Harbourview property portfolio.", status: "active" as const, priority: "high" as const, startDate: date(-33), dueDate: date(23), budget: 480000, progress: 72, contactId: seededContacts[0]?.id },
    { name: "Cedar Digital Intake", code: "CD-118", description: "Design and launch a compliant client intake workflow for Cedar Health Group.", status: "active" as const, priority: "urgent" as const, startDate: date(-18), dueDate: date(12), budget: 365000, progress: 48, contactId: seededContacts[1]?.id },
    { name: "Helio Store Standards", code: "HS-071", description: "Discovery engagement for a scalable retail standards programme.", status: "planning" as const, priority: "medium" as const, startDate: date(8), dueDate: date(56), budget: 275000, progress: 12, contactId: seededContacts[2]?.id },
    { name: "Arbor Service Recovery", code: "AS-053", description: "Resolve service exceptions and establish a sustainable operating rhythm.", status: "on_hold" as const, priority: "high" as const, startDate: date(-45), dueDate: date(31), budget: 190000, progress: 36, contactId: seededContacts[3]?.id },
  ];
  await db.insert(projects).values(projectValues.map(project => ({ ...project, organizationId, createdBy: ownerId, updatedBy: ownerId })));
  const seededProjects = await db.select().from(projects).where(eq(projects.organizationId, organizationId)).orderBy(asc(projects.id));

  const caseValues = [
    { reference: "CS-2041", title: "Harbourview stakeholder access review", summary: "Validate stakeholder access ahead of the phase-two handover.", status: "investigating" as const, severity: "high" as const, projectId: seededProjects[0]?.id, contactId: seededContacts[0]?.id, ownerId: teamIds[0] ?? ownerId, dueDate: date(3) },
    { reference: "CS-2042", title: "Cedar consent wording clarification", summary: "Confirm that the proposed wording complies with Cedar’s internal review standard.", status: "pending" as const, severity: "medium" as const, projectId: seededProjects[1]?.id, contactId: seededContacts[1]?.id, ownerId: ownerId, dueDate: date(6) },
    { reference: "CS-2043", title: "Arbor escalation response", summary: "Prepare the response package for the outstanding delivery escalation.", status: "open" as const, severity: "critical" as const, projectId: seededProjects[3]?.id, contactId: seededContacts[3]?.id, ownerId: teamIds[1] ?? ownerId, dueDate: date(-1) },
  ];
  await db.insert(cases).values(caseValues.map(item => ({ ...item, organizationId, createdBy: ownerId, updatedBy: ownerId })));

  const taskValues = [
    { title: "Confirm access matrix with Northstar", description: "Close the remaining owner access questions before the readiness review.", status: "in_progress" as const, priority: "high" as const, projectId: seededProjects[0]?.id, assigneeId: teamIds[0] ?? ownerId, dueDate: date(1) },
    { title: "Prepare Cedar intake prototype", description: "Share the updated prototype with Cedar’s review team.", status: "todo" as const, priority: "urgent" as const, projectId: seededProjects[1]?.id, assigneeId: teamIds[1] ?? ownerId, dueDate: date(2) },
    { title: "Document Helio discovery outputs", description: "Consolidate workshop outputs into the planning brief.", status: "todo" as const, priority: "medium" as const, projectId: seededProjects[2]?.id, assigneeId: ownerId, dueDate: date(9) },
    { title: "Resolve Arbor service exception", description: "Align the response package and recovery timeline with the client.", status: "blocked" as const, priority: "urgent" as const, projectId: seededProjects[3]?.id, assigneeId: teamIds[1] ?? ownerId, dueDate: date(-1) },
    { title: "Review change log", description: "Confirm all logged changes are captured in the monthly operations update.", status: "complete" as const, priority: "low" as const, projectId: seededProjects[0]?.id, assigneeId: teamIds[0] ?? ownerId, dueDate: date(-4), completedAt: date(-2) },
  ];
  await db.insert(tasks).values(taskValues.map(task => ({ ...task, organizationId, createdBy: ownerId, updatedBy: ownerId })));
  await db.insert(notifications).values([
    { organizationId, userId: ownerId, type: "assignment", title: "Cedar intake prototype is assigned to you", description: "Due in two days · Cedar Digital Intake", href: "/tasks" },
    { organizationId, userId: ownerId, type: "activity", title: "Northstar confirmed the transition review", description: "The project team added a new readiness update.", href: "/projects" },
    { organizationId, userId: ownerId, type: "system", title: "Your demo workspace is ready", description: "Explore live records, reports, and administration controls.", href: "/" },
  ]);
  await db.insert(savedViews).values({ organizationId, userId: ownerId, name: "Priority delivery work", resource: "tasks", filters: { priority: ["high", "urgent"], status: ["todo", "in_progress", "blocked"] }, isShared: true });
  await db.insert(activityLogs).values([
    { organizationId, actorId: teamIds[0] ?? ownerId, action: "updated", entityType: "project", entityId: seededProjects[0]?.id, summary: "Mila Petersen updated Harbourview Portfolio Transition" },
    { organizationId, actorId: ownerId, action: "created", entityType: "case", entityId: null, summary: "A new case CS-2042 was logged for Cedar Health Group" },
    { organizationId, actorId: teamIds[1] ?? ownerId, action: "assigned", entityType: "task", entityId: null, summary: "Jordan Okoro assigned the Cedar intake prototype task" },
  ]);
}

export async function ensureTenantScope(userId: number): Promise<TenantScope> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  let membership = await db
    .select({ organizationId: organizationMembers.organizationId, role: organizationMembers.role, organizationName: organizations.name, primaryColor: organizations.primaryColor })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
    .where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.isActive, true)))
    .limit(1);
  if (!membership[0]) {
    const created = await db.insert(organizations).values({ name: "Elegex Operations", slug: `elegex-${userId}`, industry: "Professional services", createdBy: userId });
    const organizationId = Number(created[0].insertId);
    await db.insert(organizationMembers).values({ organizationId, userId, role: "owner", title: "Workspace Owner" });
    await seedDemoWorkspace(organizationId, userId);
    membership = await db
      .select({ organizationId: organizationMembers.organizationId, role: organizationMembers.role, organizationName: organizations.name, primaryColor: organizations.primaryColor })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
      .where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.isActive, true)))
      .limit(1);
  }
  return membership[0] as TenantScope;
}

export async function listWorkspaceMembers(organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db
    .select({ id: users.id, name: users.name, email: users.email, role: organizationMembers.role, title: organizationMembers.title })
    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .where(and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.isActive, true)))
    .orderBy(asc(users.name));
}

export async function getDashboard(organizationId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const scoped = (table: any) => and(eq(table.organizationId, organizationId), isNull(table.deletedAt));
  const [contactTotal] = await db.select({ total: count() }).from(contacts).where(scoped(contacts));
  const [projectRows, taskRows, caseRows] = await Promise.all([
    db.select({ status: projects.status, total: count() }).from(projects).where(scoped(projects)).groupBy(projects.status),
    db.select({ status: tasks.status, total: count() }).from(tasks).where(scoped(tasks)).groupBy(tasks.status),
    db.select({ status: cases.status, total: count() }).from(cases).where(scoped(cases)).groupBy(cases.status),
  ]);
  const activity = await db.select().from(activityLogs).where(eq(activityLogs.organizationId, organizationId)).orderBy(desc(activityLogs.createdAt)).limit(6);
  const upcoming = await db.select().from(tasks).where(and(scoped(tasks), sql`${tasks.dueDate} IS NOT NULL`)).orderBy(asc(tasks.dueDate)).limit(5);
  const unread = await db.select({ total: count() }).from(notifications).where(and(eq(notifications.organizationId, organizationId), eq(notifications.userId, userId), isNull(notifications.readAt)));
  return { contacts: contactTotal?.total ?? 0, projectRows, taskRows, caseRows, activity, upcoming, unread: unread[0]?.total ?? 0 };
}

type ListInput = { organizationId: number; query?: string; status?: string; page?: number; pageSize?: number };
const paging = (input: ListInput) => ({ limit: Math.min(input.pageSize ?? 10, 50), offset: ((input.page ?? 1) - 1) * Math.min(input.pageSize ?? 10, 50) });

export async function listContacts(input: ListInput) {
  const db = await getDb(); if (!db) throw new Error("Database is not available");
  const keyword = input.query ? `%${input.query}%` : undefined;
  const where = and(eq(contacts.organizationId, input.organizationId), isNull(contacts.deletedAt), input.status ? eq(contacts.status, input.status as any) : undefined, keyword ? or(like(contacts.name, keyword), like(contacts.company, keyword), like(contacts.email, keyword)) : undefined);
  const { limit, offset } = paging(input);
  const [rows, total] = await Promise.all([db.select().from(contacts).where(where).orderBy(desc(contacts.updatedAt)).limit(limit).offset(offset), db.select({ total: count() }).from(contacts).where(where)]);
  return { rows, total: total[0]?.total ?? 0 };
}

export async function listProjects(input: ListInput) {
  const db = await getDb(); if (!db) throw new Error("Database is not available");
  const keyword = input.query ? `%${input.query}%` : undefined;
  const where = and(eq(projects.organizationId, input.organizationId), isNull(projects.deletedAt), input.status ? eq(projects.status, input.status as any) : undefined, keyword ? or(like(projects.name, keyword), like(projects.code, keyword)) : undefined);
  const { limit, offset } = paging(input);
  const [rows, total] = await Promise.all([db.select().from(projects).where(where).orderBy(desc(projects.updatedAt)).limit(limit).offset(offset), db.select({ total: count() }).from(projects).where(where)]);
  return { rows, total: total[0]?.total ?? 0 };
}

export async function listCases(input: ListInput) {
  const db = await getDb(); if (!db) throw new Error("Database is not available");
  const keyword = input.query ? `%${input.query}%` : undefined;
  const where = and(eq(cases.organizationId, input.organizationId), isNull(cases.deletedAt), input.status ? eq(cases.status, input.status as any) : undefined, keyword ? or(like(cases.title, keyword), like(cases.reference, keyword)) : undefined);
  const { limit, offset } = paging(input);
  const [rows, total] = await Promise.all([db.select().from(cases).where(where).orderBy(desc(cases.updatedAt)).limit(limit).offset(offset), db.select({ total: count() }).from(cases).where(where)]);
  return { rows, total: total[0]?.total ?? 0 };
}

export async function listTasks(input: ListInput) {
  const db = await getDb(); if (!db) throw new Error("Database is not available");
  const keyword = input.query ? `%${input.query}%` : undefined;
  const where = and(eq(tasks.organizationId, input.organizationId), isNull(tasks.deletedAt), input.status ? eq(tasks.status, input.status as any) : undefined, keyword ? like(tasks.title, keyword) : undefined);
  const { limit, offset } = paging(input);
  const [rows, total] = await Promise.all([db.select().from(tasks).where(where).orderBy(asc(tasks.dueDate), desc(tasks.updatedAt)).limit(limit).offset(offset), db.select({ total: count() }).from(tasks).where(where)]);
  return { rows, total: total[0]?.total ?? 0 };
}

export async function getRecordDetail(organizationId: number, resource: "contacts" | "projects" | "cases", id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const table = { contacts, projects, cases }[resource] as any;
  const rows = await db.select().from(table).where(and(eq(table.id, id), eq(table.organizationId, organizationId), isNull(table.deletedAt))).limit(1);
  const record = rows[0];
  if (!record) return undefined;
  const relatedTasks = resource === "projects" ? await db.select().from(tasks).where(and(eq(tasks.organizationId, organizationId), eq(tasks.projectId, id), isNull(tasks.deletedAt))).orderBy(asc(tasks.dueDate)).limit(10) : [];
  const relatedDocuments = await listDocuments(organizationId, resource.slice(0, -1) as "contact" | "project" | "case", id);
  const relatedActivity = await db.select().from(activityLogs).where(and(eq(activityLogs.organizationId, organizationId), eq(activityLogs.entityId, id))).orderBy(desc(activityLogs.createdAt)).limit(10);
  return { record, relatedTasks, relatedDocuments, relatedActivity };
}

export async function createContact(organizationId: number, userId: number, input: { name: string; company?: string; email?: string; phone?: string; location?: string; status?: "lead" | "active" | "inactive"; notes?: string }) {
  const db = await getDb(); if (!db) throw new Error("Database is not available");
  const result = await db.insert(contacts).values({ ...input, organizationId, createdBy: userId, updatedBy: userId });
  const id = Number(result[0].insertId); await logActivity(organizationId, userId, "created", "contact", id, `Created contact ${input.name}`); return id;
}

export async function updateContact(organizationId: number, userId: number, id: number, input: { name?: string; company?: string; email?: string; phone?: string; location?: string; status?: "lead" | "active" | "inactive"; notes?: string }) {
  const db = await getDb(); if (!db) throw new Error("Database is not available");
  await db.update(contacts).set({ ...input, updatedBy: userId }).where(and(eq(contacts.id, id), eq(contacts.organizationId, organizationId), isNull(contacts.deletedAt))); await logActivity(organizationId, userId, "updated", "contact", id, "Updated a contact record");
}

export async function createProject(organizationId: number, userId: number, input: { name: string; code: string; contactId?: number; description?: string; status?: "planning" | "active" | "on_hold" | "complete" | "archived"; priority?: "low" | "medium" | "high" | "urgent"; dueDate?: Date; budget?: number }) {
  const db = await getDb(); if (!db) throw new Error("Database is not available");
  const result = await db.insert(projects).values({ ...input, organizationId, createdBy: userId, updatedBy: userId }); const id = Number(result[0].insertId); await logActivity(organizationId, userId, "created", "project", id, `Created project ${input.name}`); return id;
}

export async function updateProject(organizationId: number, userId: number, id: number, input: { name?: string; description?: string; status?: "planning" | "active" | "on_hold" | "complete" | "archived"; priority?: "low" | "medium" | "high" | "urgent"; progress?: number; dueDate?: Date; budget?: number }) {
  const db = await getDb(); if (!db) throw new Error("Database is not available"); await db.update(projects).set({ ...input, updatedBy: userId }).where(and(eq(projects.id, id), eq(projects.organizationId, organizationId), isNull(projects.deletedAt))); await logActivity(organizationId, userId, "updated", "project", id, "Updated a project record");
}

export async function createCase(organizationId: number, userId: number, input: { reference: string; title: string; summary?: string; contactId?: number; projectId?: number; severity?: "low" | "medium" | "high" | "critical"; ownerId?: number; dueDate?: Date }) {
  const db = await getDb(); if (!db) throw new Error("Database is not available"); const result = await db.insert(cases).values({ ...input, organizationId, createdBy: userId, updatedBy: userId }); const id = Number(result[0].insertId); await logActivity(organizationId, userId, "created", "case", id, `Created case ${input.reference}`); return id;
}

export async function updateCase(organizationId: number, userId: number, id: number, input: { title?: string; summary?: string; status?: "open" | "investigating" | "pending" | "resolved" | "closed"; severity?: "low" | "medium" | "high" | "critical"; ownerId?: number; dueDate?: Date }) {
  const db = await getDb(); if (!db) throw new Error("Database is not available"); await db.update(cases).set({ ...input, updatedBy: userId }).where(and(eq(cases.id, id), eq(cases.organizationId, organizationId), isNull(cases.deletedAt))); await logActivity(organizationId, userId, "updated", "case", id, "Updated a case record");
}

export async function createTask(organizationId: number, userId: number, input: { title: string; description?: string; projectId?: number; caseId?: number; priority?: "low" | "medium" | "high" | "urgent"; assigneeId?: number; dueDate?: Date }) {
  return withTransaction(async tx => {
    const result = await tx.insert(tasks).values({ ...input, organizationId, createdBy: userId, updatedBy: userId });
    const id = Number(result[0].insertId);
    if (input.assigneeId) await tx.insert(notifications).values({ organizationId, userId: input.assigneeId, type: "assignment", title: `Task assigned: ${input.title}`, description: "A task has been assigned to you.", href: "/tasks" });
    await tx.insert(activityLogs).values({ organizationId, actorId: userId, action: "assigned", entityType: "task", entityId: id, summary: `Assigned task ${input.title}` });
    return id;
  });
}

export async function updateTask(organizationId: number, userId: number, id: number, input: { title?: string; description?: string; projectId?: number; status?: "todo" | "in_progress" | "blocked" | "complete"; priority?: "low" | "medium" | "high" | "urgent"; assigneeId?: number; dueDate?: Date }) {
  const db = await getDb(); if (!db) throw new Error("Database is not available"); const completedAt = input.status === "complete" ? new Date() : undefined; await db.update(tasks).set({ ...input, ...(completedAt ? { completedAt } : {}), updatedBy: userId }).where(and(eq(tasks.id, id), eq(tasks.organizationId, organizationId), isNull(tasks.deletedAt))); if (input.assigneeId) await db.insert(notifications).values({ organizationId, userId: input.assigneeId, type: "assignment", title: "A task was reassigned to you", description: input.title ?? "Review the updated task assignment.", href: "/tasks" }); await logActivity(organizationId, userId, "updated", "task", id, "Updated a task");
}

export async function archiveRecord(organizationId: number, userId: number, resource: "contacts" | "projects" | "cases" | "tasks", id: number) {
  const db = await getDb(); if (!db) throw new Error("Database is not available"); const table = { contacts, projects, cases, tasks }[resource] as any; await db.update(table).set({ deletedAt: new Date(), updatedBy: userId }).where(and(eq(table.id, id), eq(table.organizationId, organizationId))); await logActivity(organizationId, userId, "archived", resource.slice(0, -1), id, `Archived a ${resource.slice(0, -1)} record`);
}

export async function getNotifications(organizationId: number, userId: number) {
  const db = await getDb(); if (!db) throw new Error("Database is not available"); return db.select().from(notifications).where(and(eq(notifications.organizationId, organizationId), eq(notifications.userId, userId))).orderBy(desc(notifications.createdAt)).limit(25);
}

export async function markNotificationRead(organizationId: number, userId: number, id: number) {
  const db = await getDb(); if (!db) throw new Error("Database is not available"); await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, id), eq(notifications.organizationId, organizationId), eq(notifications.userId, userId)));
}

export async function getAdminData(organizationId: number) {
  const db = await getDb(); if (!db) throw new Error("Database is not available");
  const [members, logs, settings] = await Promise.all([
    db.select({ membership: organizationMembers, user: users }).from(organizationMembers).innerJoin(users, eq(organizationMembers.userId, users.id)).where(eq(organizationMembers.organizationId, organizationId)).orderBy(asc(organizationMembers.role)),
    db.select().from(activityLogs).where(eq(activityLogs.organizationId, organizationId)).orderBy(desc(activityLogs.createdAt)).limit(50),
    db.select().from(appSettings).where(eq(appSettings.organizationId, organizationId)).limit(1),
  ]);
  return { members, logs, settings: settings[0] };
}

export async function updateMemberRole(organizationId: number, actorId: number, membershipId: number, role: Exclude<OrganizationRole, "owner">) {
  const db = await getDb(); if (!db) throw new Error("Database is not available"); await db.update(organizationMembers).set({ role }).where(and(eq(organizationMembers.id, membershipId), eq(organizationMembers.organizationId, organizationId))); await logActivity(organizationId, actorId, "updated", "member", membershipId, `Updated a member role to ${role}`);
}

export async function updateSettings(organizationId: number, userId: number, input: { name?: string; primaryColor?: string; timezone?: string; allowMemberInvites?: boolean; notificationDigest?: boolean }) {
  const db = await getDb(); if (!db) throw new Error("Database is not available"); const { name, primaryColor, timezone, ...settingFields } = input; if (name || primaryColor || timezone) await db.update(organizations).set({ ...(name ? { name } : {}), ...(primaryColor ? { primaryColor } : {}), ...(timezone ? { timezone } : {}) }).where(eq(organizations.id, organizationId)); if (Object.keys(settingFields).length) await db.update(appSettings).set({ ...settingFields, updatedBy: userId }).where(eq(appSettings.organizationId, organizationId)); await logActivity(organizationId, userId, "updated", "settings", organizationId, "Updated workspace settings");
}

export async function getSavedViews(organizationId: number, userId: number) {
  const db = await getDb(); if (!db) throw new Error("Database is not available"); return db.select().from(savedViews).where(and(eq(savedViews.organizationId, organizationId), or(eq(savedViews.userId, userId), eq(savedViews.isShared, true)))).orderBy(desc(savedViews.updatedAt));
}

export async function createSavedView(organizationId: number, userId: number, input: { name: string; resource: "contacts" | "projects" | "cases" | "tasks" | "reports"; filters: Record<string, unknown>; isShared?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(savedViews).values({ organizationId, userId, name: input.name, resource: input.resource, filters: input.filters, isShared: input.isShared ?? false });
  await logActivity(organizationId, userId, "created", "saved_view", Number(result[0].insertId), `Saved report view ${input.name}`);
  return Number(result[0].insertId);
}

export async function getReportRows(organizationId: number) {
  const db = await getDb(); if (!db) throw new Error("Database is not available"); return db.select({ code: projects.code, project: projects.name, status: projects.status, priority: projects.priority, progress: projects.progress, dueDate: projects.dueDate, budget: projects.budget, contact: contacts.name }).from(projects).leftJoin(contacts, eq(projects.contactId, contacts.id)).where(and(eq(projects.organizationId, organizationId), isNull(projects.deletedAt))).orderBy(desc(projects.updatedAt));
}

export async function createDocumentRecord(organizationId: number, userId: number, input: { projectId?: number; caseId?: number; contactId?: number; fileName: string; mimeType: string; sizeBytes: number; storageKey: string; storageUrl: string }) {
  const db = await getDb(); if (!db) throw new Error("Database is not available"); const result = await db.insert(documents).values({ ...input, organizationId, uploadedBy: userId }); const id = Number(result[0].insertId); await logActivity(organizationId, userId, "uploaded", "document", id, `Uploaded ${input.fileName}`); return id;
}

export async function listDocuments(organizationId: number, resource?: "contact" | "project" | "case", recordId?: number) {
  const db = await getDb(); if (!db) throw new Error("Database is not available");
  const relation = resource === "contact" ? eq(documents.contactId, recordId!) : resource === "project" ? eq(documents.projectId, recordId!) : resource === "case" ? eq(documents.caseId, recordId!) : undefined;
  return db.select().from(documents).where(and(eq(documents.organizationId, organizationId), relation)).orderBy(desc(documents.createdAt));
}

export async function resetDemoData(organizationId: number, userId: number) {
  const db = await getDb(); if (!db) throw new Error("Database is not available");
  await db.delete(documents).where(eq(documents.organizationId, organizationId)); await db.delete(notifications).where(eq(notifications.organizationId, organizationId)); await db.delete(savedViews).where(eq(savedViews.organizationId, organizationId)); await db.delete(activityLogs).where(eq(activityLogs.organizationId, organizationId)); await db.delete(tasks).where(eq(tasks.organizationId, organizationId)); await db.delete(cases).where(eq(cases.organizationId, organizationId)); await db.delete(projects).where(eq(projects.organizationId, organizationId)); await db.delete(contacts).where(eq(contacts.organizationId, organizationId)); await seedDemoWorkspace(organizationId, userId);
}
