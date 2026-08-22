import { randomUUID } from "node:crypto";

import { and, asc, count, desc, eq, isNull, like, or, sql } from "drizzle-orm";

import {
  activityLogs,
  aiUsage,
  appSettings,
  callOutTypes,
  cases,
  contacts,
  documents,
  environmentReleases,
  integrationConnections,
  integrationEvents,
  invoiceLinks,
  jobEvidence,
  jobMaterials,
  jobVisits,
  jobs,
  monthlyOperationalSnapshots,
  notifications,
  organizationMembers,
  organizations,
  projects,
  quoteItems,
  quotes,
  releaseChecks,
  savedViews,
  syncLogs,
  tasks,
  type InsertUser,
  type OrganizationRole,
  users,
} from "../drizzle/schema";

import { ENV } from "./_core/env";
import { writeAuditEvent } from "./connectors/audit";
import { getDatabase, withTransaction } from "./connectors/database";
import { validateUpload } from "./providers/storage";
import { storagePut } from "./storage";

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
  await db
    .insert(users)
    .values(values)
    .onDuplicateKeyUpdate({
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
  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  return result[0];
}

export type TenantScope = {
  organizationId: number;
  role: OrganizationRole;
  organizationName: string;
  primaryColor: string;
};

export const canManageWorkspace = (role: OrganizationRole) =>
  ["owner", "admin"].includes(role);
export const canEditRecords = (role: OrganizationRole) => role !== "viewer";
export const canManageRecords = (role: OrganizationRole) =>
  ["owner", "admin", "manager"].includes(role);

async function logActivity(
  organizationId: number,
  actorId: number | null,
  action: string,
  entityType: string,
  entityId: number | null,
  summary: string
) {
  await writeAuditEvent({
    organizationId,
    actorId,
    action,
    entityType,
    entityId,
    summary,
  });
}

async function assertScopedEntity(
  client: any,
  table: any,
  organizationId: number,
  id: number | undefined,
  label: string,
  softDeleted = false
) {
  if (!id) return;
  const row = await client
    .select({ id: table.id })
    .from(table)
    .where(
      and(
        eq(table.id, id),
        eq(table.organizationId, organizationId),
        softDeleted ? isNull(table.deletedAt) : undefined
      )
    )
    .limit(1);
  if (!row[0]) throw new Error(`${label} is not available in this workspace`);
}

async function assertActiveWorkspaceMember(
  client: any,
  organizationId: number,
  userId: number | undefined,
  label: string
) {
  if (!userId) return;
  const row = await client
    .select({ id: organizationMembers.id })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.isActive, true)
      )
    )
    .limit(1);
  if (!row[0])
    throw new Error(`${label} must be an active member of this workspace`);
}

function assertSingleDocumentTarget(input: {
  projectId?: number;
  caseId?: number;
  contactId?: number;
}) {
  const targets = [input.projectId, input.caseId, input.contactId].filter(
    Boolean
  );
  if (targets.length > 1)
    throw new Error("A document can be attached to only one record at a time");
}

export async function validateDocumentTargets(
  organizationId: number,
  input: { projectId?: number; caseId?: number; contactId?: number }
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  assertSingleDocumentTarget(input);
  await assertScopedEntity(
    db,
    contacts,
    organizationId,
    input.contactId,
    "Contact",
    true
  );
  await assertScopedEntity(
    db,
    projects,
    organizationId,
    input.projectId,
    "Project",
    true
  );
  await assertScopedEntity(
    db,
    cases,
    organizationId,
    input.caseId,
    "Case",
    true
  );
}

async function seedDemoWorkspace(
  organizationId: number,
  ownerId: number,
  database?: any
) {
  const db = database ?? (await getDb());
  if (!db) return;
  const contactRows = await db
    .select({ total: count() })
    .from(contacts)
    .where(eq(contacts.organizationId, organizationId));
  if ((contactRows[0]?.total ?? 0) > 0) return;

  const now = Date.now();
  const date = (days: number) => new Date(now + days * 86_400_000);
  const team = [
    {
      openId: `elegex-${organizationId}-mila`,
      name: "Mila Petersen",
      email: "mila.petersen@elegex.demo",
      title: "Operations Manager",
      role: "manager" as const,
    },
    {
      openId: `elegex-${organizationId}-jordan`,
      name: "Jordan Okoro",
      email: "jordan.okoro@elegex.demo",
      title: "Project Lead",
      role: "member" as const,
    },
    {
      openId: `elegex-${organizationId}-sana`,
      name: "Sana Davids",
      email: "sana.davids@elegex.demo",
      title: "Finance Reviewer",
      role: "viewer" as const,
    },
  ];
  const teamIds: number[] = [];
  for (const teammate of team) {
    const existingMembers = await db
      .select({ membershipId: organizationMembers.id, userId: users.id })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(users.email, teammate.email)
        )
      )
      .orderBy(asc(organizationMembers.id));
    const [canonicalMember, ...duplicates] = existingMembers;
    for (const duplicate of duplicates) {
      await db
        .update(organizationMembers)
        .set({ isActive: false })
        .where(eq(organizationMembers.id, duplicate.membershipId));
    }
    let teammateId = canonicalMember?.userId;
    if (!teammateId) {
      await db
        .insert(users)
        .values({
          ...teammate,
          loginMethod: "demo",
          role: "user",
          lastSignedIn: new Date(),
        })
        .onDuplicateKeyUpdate({
          set: { name: teammate.name, email: teammate.email },
        });
      const teammateRow = await db
        .select()
        .from(users)
        .where(eq(users.openId, teammate.openId))
        .limit(1);
      teammateId = teammateRow[0]?.id;
    }
    if (teammateId) {
      teamIds.push(teammateId);
      await db
        .insert(organizationMembers)
        .values({
          organizationId,
          userId: teammateId,
          role: teammate.role,
          title: teammate.title,
        })
        .onDuplicateKeyUpdate({
          set: { title: teammate.title, role: teammate.role, isActive: true },
        });
    }
  }

  await db.insert(appSettings).values({
    organizationId,
    updatedBy: ownerId,
    locale: "en-ZA",
    currency: "ZAR",
    timezone: "Africa/Johannesburg",
    metadata: {
      tradeVocabulary: [
        "DB board",
        "COC",
        "SANS 10142",
        "load shedding",
        "Eskom",
        "fault finding",
        "geyser",
        "earth leakage",
      ],
      domain: "South African electrical field service",
    },
  });
  await db.insert(callOutTypes).values([
    {
      organizationId,
      name: "Standard electrical call-out",
      baseRate: 650,
      travelIncludedKm: 15,
      perKmRate: 8,
      appliesFrom: "07:00",
      appliesTo: "17:00",
    },
    {
      organizationId,
      name: "After-hours electrical emergency",
      baseRate: 1450,
      travelIncludedKm: 15,
      perKmRate: 10,
      appliesFrom: "17:00",
      appliesTo: "07:00",
    },
    {
      organizationId,
      name: "Load-shedding and backup-power fault finding",
      baseRate: 980,
      travelIncludedKm: 20,
      perKmRate: 8,
      appliesFrom: "07:00",
      appliesTo: "17:00",
    },
    {
      organizationId,
      name: "COC and SANS 10142 compliance inspection",
      baseRate: 1200,
      travelIncludedKm: 20,
      perKmRate: 8,
      appliesFrom: "07:00",
      appliesTo: "17:00",
    },
  ]);
  const contactValues = [
    {
      name: "Aisha Naidoo",
      company: "Northstar Properties",
      email: "aisha@northstar.demo",
      phone: "+27 21 555 0193",
      location: "Cape Town CBD",
      status: "active" as const,
      notes:
        "Primary portfolio contact. Prefers concise Friday updates and COC close-out packs.",
    },
    {
      name: "Lucas Mthembu",
      company: "Cedar Health Group",
      email: "lucas@cedarhealth.demo",
      phone: "+27 11 555 1224",
      location: "Sandton",
      status: "active" as const,
      notes:
        "Stakeholder for the digital intake programme and generator fault-finding workflow.",
    },
    {
      name: "Elena Meyer",
      company: "Helio Retail",
      email: "elena@helioretail.demo",
      phone: "+27 31 555 8900",
      location: "Umhlanga",
      status: "lead" as const,
      notes:
        "Exploring a phased DB board and emergency-lighting compliance rollout in Q4.",
    },
    {
      name: "Tendai Ncube",
      company: "Arbor Logistics",
      email: "tendai@arborlogistics.demo",
      phone: "+27 12 555 4371",
      location: "Centurion",
      status: "active" as const,
      notes:
        "Monthly steering review on the first Wednesday; includes load-shedding readiness reviews.",
    },
  ];
  await db.insert(contacts).values(
    contactValues.map(contact => ({
      ...contact,
      organizationId,
      createdBy: ownerId,
      updatedBy: ownerId,
    }))
  );
  const seededContacts = await db
    .select()
    .from(contacts)
    .where(eq(contacts.organizationId, organizationId))
    .orderBy(asc(contacts.id));

  const projectValues = [
    {
      name: "Harbourview Portfolio Transition",
      code: "HV-024",
      description:
        "Coordinate the operational transition across the Harbourview property portfolio.",
      status: "active" as const,
      priority: "high" as const,
      startDate: date(-33),
      dueDate: date(23),
      budget: 480000,
      progress: 72,
      contactId: seededContacts[0]?.id,
    },
    {
      name: "Cedar Digital Intake",
      code: "CD-118",
      description:
        "Design and launch a compliant client intake workflow for Cedar Health Group.",
      status: "active" as const,
      priority: "urgent" as const,
      startDate: date(-18),
      dueDate: date(12),
      budget: 365000,
      progress: 48,
      contactId: seededContacts[1]?.id,
    },
    {
      name: "Helio Store Standards",
      code: "HS-071",
      description:
        "Discovery engagement for a scalable retail standards programme.",
      status: "planning" as const,
      priority: "medium" as const,
      startDate: date(8),
      dueDate: date(56),
      budget: 275000,
      progress: 12,
      contactId: seededContacts[2]?.id,
    },
    {
      name: "Arbor Service Recovery",
      code: "AS-053",
      description:
        "Resolve service exceptions and establish a sustainable operating rhythm.",
      status: "on_hold" as const,
      priority: "high" as const,
      startDate: date(-45),
      dueDate: date(31),
      budget: 190000,
      progress: 36,
      contactId: seededContacts[3]?.id,
    },
  ];
  await db.insert(projects).values(
    projectValues.map(project => ({
      ...project,
      organizationId,
      createdBy: ownerId,
      updatedBy: ownerId,
    }))
  );
  const seededProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.organizationId, organizationId))
    .orderBy(asc(projects.id));

  const caseValues = [
    {
      reference: "CS-2041",
      title: "Harbourview stakeholder access review",
      summary: "Validate stakeholder access ahead of the phase-two handover.",
      status: "investigating" as const,
      severity: "high" as const,
      projectId: seededProjects[0]?.id,
      contactId: seededContacts[0]?.id,
      ownerId: teamIds[0] ?? ownerId,
      dueDate: date(3),
    },
    {
      reference: "CS-2042",
      title: "Cedar consent wording clarification",
      summary:
        "Confirm that the proposed wording complies with Cedar’s internal review standard.",
      status: "pending" as const,
      severity: "medium" as const,
      projectId: seededProjects[1]?.id,
      contactId: seededContacts[1]?.id,
      ownerId: ownerId,
      dueDate: date(6),
    },
    {
      reference: "CS-2043",
      title: "Arbor escalation response",
      summary:
        "Prepare the response package for the outstanding delivery escalation.",
      status: "open" as const,
      severity: "critical" as const,
      projectId: seededProjects[3]?.id,
      contactId: seededContacts[3]?.id,
      ownerId: teamIds[1] ?? ownerId,
      dueDate: date(-1),
    },
  ];
  await db.insert(cases).values(
    caseValues.map(item => ({
      ...item,
      organizationId,
      createdBy: ownerId,
      updatedBy: ownerId,
    }))
  );

  const taskValues = [
    {
      title: "Confirm access matrix with Northstar",
      description:
        "Close the remaining owner access questions before the readiness review.",
      status: "in_progress" as const,
      priority: "high" as const,
      projectId: seededProjects[0]?.id,
      assigneeId: teamIds[0] ?? ownerId,
      dueDate: date(1),
    },
    {
      title: "Prepare Cedar intake prototype",
      description: "Share the updated prototype with Cedar’s review team.",
      status: "todo" as const,
      priority: "urgent" as const,
      projectId: seededProjects[1]?.id,
      assigneeId: teamIds[1] ?? ownerId,
      dueDate: date(2),
    },
    {
      title: "Document Helio discovery outputs",
      description: "Consolidate workshop outputs into the planning brief.",
      status: "todo" as const,
      priority: "medium" as const,
      projectId: seededProjects[2]?.id,
      assigneeId: ownerId,
      dueDate: date(9),
    },
    {
      title: "Resolve Arbor service exception",
      description:
        "Align the response package and recovery timeline with the client.",
      status: "blocked" as const,
      priority: "urgent" as const,
      projectId: seededProjects[3]?.id,
      assigneeId: teamIds[1] ?? ownerId,
      dueDate: date(-1),
    },
    {
      title: "Review change log",
      description:
        "Confirm all logged changes are captured in the monthly operations update.",
      status: "complete" as const,
      priority: "low" as const,
      projectId: seededProjects[0]?.id,
      assigneeId: teamIds[0] ?? ownerId,
      dueDate: date(-4),
      completedAt: date(-2),
    },
  ];
  await db.insert(tasks).values(
    taskValues.map(task => ({
      ...task,
      organizationId,
      createdBy: ownerId,
      updatedBy: ownerId,
    }))
  );
  await db.insert(notifications).values([
    {
      organizationId,
      userId: ownerId,
      type: "assignment",
      title: "Cedar intake prototype is assigned to you",
      description: "Due in two days · Cedar Digital Intake",
      href: "/tasks",
    },
    {
      organizationId,
      userId: ownerId,
      type: "activity",
      title: "Northstar confirmed the transition review",
      description: "The project team added a new readiness update.",
      href: "/projects",
    },
    {
      organizationId,
      userId: ownerId,
      type: "system",
      title: "Your demo workspace is ready",
      description:
        "Explore live records, reports, and administration controls.",
      href: "/",
    },
  ]);
  await db.insert(savedViews).values({
    organizationId,
    userId: ownerId,
    name: "Priority delivery work",
    resource: "tasks",
    filters: {
      priority: ["high", "urgent"],
      status: ["todo", "in_progress", "blocked"],
    },
    isShared: true,
  });
  await db.insert(activityLogs).values([
    {
      organizationId,
      actorId: teamIds[0] ?? ownerId,
      action: "updated",
      entityType: "project",
      entityId: seededProjects[0]?.id,
      summary: "Mila Petersen updated Harbourview Portfolio Transition",
    },
    {
      organizationId,
      actorId: ownerId,
      action: "created",
      entityType: "case",
      entityId: null,
      summary: "A new case CS-2042 was logged for Cedar Health Group",
    },
    {
      organizationId,
      actorId: teamIds[1] ?? ownerId,
      action: "assigned",
      entityType: "task",
      entityId: null,
      summary: "Jordan Okoro assigned the Cedar intake prototype task",
    },
  ]);
}

export const DEMO_DATA_EXPECTATIONS = {
  months: 6,
  jobs: 36,
  visits: 36,
  materials: 72,
  evidence: 72,
  quotes: 12,
  invoices: 23,
  snapshots: 6,
  releaseRecords: 3,
} as const;

/**
 * Canonical post-reset relationships for the synthetic tenant. Keeping this
 * alongside the seed constants makes the admin reset contract reviewable and
 * testable without relying on generated primary-key values.
 */
export const DEMO_RESET_RELATIONSHIPS = {
  contacts: 4,
  projects: 4,
  cases: 3,
  tasks: 5,
  documents: 36,
  notifications: 3,
  savedViews: 1,
  auditSeedRecords: 4,
  jobVisitsPerJob: 1,
  materialsPerJob: 2,
  evidencePerJob: 2,
  quoteItemsPerQuote: 2,
  releaseChecksPerRelease: 5,
} as const;

export type DemoReseedSnapshot = {
  organizationId: number;
  contacts: number;
  projects: number;
  cases: number;
  tasks: number;
  documents: number;
  notifications: number;
  savedViews: number;
  jobs: number;
  visits: number;
  materials: number;
  evidence: number;
  quotes: number;
  invoices: number;
  snapshots: number;
  releaseRecords: number;
  quoteItems: number;
  releaseChecks: number;
  tenantIds: number[];
};

/** Returns whether a post-reset audit snapshot exactly satisfies the seeded tenant contract. */
export function hasDeterministicDemoReseed(snapshot: DemoReseedSnapshot) {
  const expected = DEMO_DATA_EXPECTATIONS;
  const relationships = DEMO_RESET_RELATIONSHIPS;
  return (
    snapshot.organizationId > 0 &&
    snapshot.contacts === relationships.contacts &&
    snapshot.projects === relationships.projects &&
    snapshot.cases === relationships.cases &&
    snapshot.tasks === relationships.tasks &&
    snapshot.documents === relationships.documents &&
    snapshot.notifications === relationships.notifications &&
    snapshot.savedViews === relationships.savedViews &&
    snapshot.jobs === expected.jobs &&
    snapshot.visits === expected.visits &&
    snapshot.materials === expected.materials &&
    snapshot.evidence === expected.evidence &&
    snapshot.quotes === expected.quotes &&
    snapshot.invoices === expected.invoices &&
    snapshot.snapshots === expected.snapshots &&
    snapshot.releaseRecords === expected.releaseRecords &&
    snapshot.quoteItems ===
      expected.quotes * relationships.quoteItemsPerQuote &&
    snapshot.releaseChecks ===
      expected.releaseRecords * relationships.releaseChecksPerRelease &&
    snapshot.tenantIds.length > 0 &&
    snapshot.tenantIds.every(tenantId => tenantId === snapshot.organizationId)
  );
}

/**
 * Adds a clearly synthetic six-month field-service history to a tenant. This is
 * deliberately deterministic, repeatable demonstration content—not customer data.
 */
async function seedFieldServiceDemo(
  organizationId: number,
  ownerId: number,
  database?: any
) {
  const db = database ?? (await getDb());
  if (!db) return;
  const existing = await db
    .select({ total: count() })
    .from(jobs)
    .where(eq(jobs.organizationId, organizationId));
  if ((existing[0]?.total ?? 0) > 0) return;

  const tenantContacts = await db
    .select()
    .from(contacts)
    .where(eq(contacts.organizationId, organizationId))
    .orderBy(asc(contacts.id));
  const tenantMembers = await listWorkspaceMembers(organizationId, db);
  const foremanIds = (
    tenantMembers as Array<{ id: number; role: OrganizationRole }>
  )
    .filter(member =>
      ["owner", "admin", "manager", "member"].includes(member.role)
    )
    .map(member => member.id);
  const contactRows = tenantContacts.length ? tenantContacts : [];
  if (!contactRows.length) return;

  const serviceTemplates = [
    [
      "DB board trip after storm",
      "Diagnose an intermittent DB board breaker trip, complete fault finding, and restore safe power to affected circuits.",
      "14 Summit Avenue, Cape Town CBD",
    ],
    [
      "Geyser thermostat replacement",
      "Assess the geyser heating fault, replace the approved component, and capture electrical safety evidence.",
      "3 Shoreline Road, Umhlanga",
    ],
    [
      "Kitchen plug-point fault",
      "Trace failed kitchen plug points and test earth-leakage protection before handover.",
      "18 Market Street, Sandton",
    ],
    [
      "Pool pump isolation fault",
      "Investigate a recurring pool-pump trip, verify isolation, and document the recovery plan.",
      "42 Oak Avenue, Centurion",
    ],
    [
      "Emergency lighting and COC compliance visit",
      "Complete the scheduled emergency-lighting inspection and submit COC/SANS 10142 job-card evidence.",
      "9 Harbour Way, Cape Town CBD",
    ],
    [
      "Load-shedding backup supply assessment",
      "Assess backup supply and essential-circuit resilience during load shedding; capture commercial inputs.",
      "11 Main Road, Sandton",
    ],
  ] as const;
  const materials = [
    "DB board circuit breaker 20A",
    "SANS-approved 2.5 mm cable",
    "Geyser element 3 kW",
    "Weatherproof isolator",
    "LED emergency fitting",
    "Earth-leakage test component",
  ];
  const documentTemplates = [
    {
      documentType: "job_card" as const,
      retentionYears: 7,
      classificationLevel: "internal" as const,
      label: "Job Card",
    },
    {
      documentType: "photo_evidence" as const,
      retentionYears: 3,
      classificationLevel: "confidential" as const,
      label: "Photo Evidence Register",
    },
    {
      documentType: "material_list" as const,
      retentionYears: 7,
      classificationLevel: "internal" as const,
      label: "Material List",
    },
    {
      documentType: "compliance_cert" as const,
      retentionYears: 10,
      classificationLevel: "restricted" as const,
      label: "SANS 10142 Compliance Record",
    },
    {
      documentType: "coc" as const,
      retentionYears: 10,
      classificationLevel: "restricted" as const,
      label: "Certificate of Compliance",
    },
    {
      documentType: "quote" as const,
      retentionYears: 7,
      classificationLevel: "confidential" as const,
      label: "Field Quote Summary",
    },
  ];
  const now = new Date();
  const monthStarts = Array.from(
    { length: DEMO_DATA_EXPECTATIONS.months },
    (_, index) => {
      const month = new Date(
        now.getFullYear(),
        now.getMonth() - 5 + index,
        1,
        9,
        0,
        0
      );
      return month;
    }
  );

  for (let monthIndex = 0; monthIndex < monthStarts.length; monthIndex += 1) {
    const periodStart = monthStarts[monthIndex]!;
    const currentMonth = monthIndex === monthStarts.length - 1;
    const previousMonth = monthIndex === monthStarts.length - 2;
    for (let sequence = 0; sequence < 6; sequence += 1) {
      const template =
        serviceTemplates[(monthIndex * 2 + sequence) % serviceTemplates.length];
      const contact =
        contactRows[(monthIndex + sequence) % contactRows.length]!;
      const foremanId =
        foremanIds[(monthIndex + sequence) % Math.max(foremanIds.length, 1)] ??
        ownerId;
      const scheduledStart = new Date(
        periodStart.getFullYear(),
        periodStart.getMonth(),
        3 + sequence * 4,
        8 + (sequence % 3) * 2,
        0,
        0
      );
      const scheduledEnd = new Date(
        scheduledStart.getTime() + (90 + (sequence % 3) * 30) * 60_000
      );
      const stage = currentMonth
        ? (
            [
              "scheduled",
              "scheduled",
              "in_progress",
              "on_hold",
              "ready_for_invoicing",
              "cancelled",
            ] as const
          )[sequence]
        : previousMonth
          ? (
              [
                "invoiced",
                "invoiced",
                "ready_for_invoicing",
                "invoiced",
                "on_hold",
                "cancelled",
              ] as const
            )[sequence]
          : (
              [
                "invoiced",
                "invoiced",
                "invoiced",
                "invoiced",
                "invoiced",
                "cancelled",
              ] as const
            )[sequence];
      const jobNumber = `#${2011 + monthIndex * 6 + sequence}`;
      const isCompleted = ["ready_for_invoicing", "invoiced"].includes(stage);
      const insert = await db.insert(jobs).values({
        organizationId,
        contactId: contact.id,
        jobNumber,
        title: template[0],
        description: `${template[1]} Synthetic demonstration history for the Elegex field-service workspace.`,
        serviceAddress: template[2],
        stage,
        priority:
          sequence === 2
            ? "urgent"
            : sequence === 3
              ? "critical"
              : sequence === 0
                ? "routine"
                : "standard",
        foremanId,
        scheduledStart,
        scheduledEnd,
        checkInAt: isCompleted
          ? new Date(scheduledStart.getTime() + 4 * 60_000)
          : null,
        checkOutAt: isCompleted
          ? new Date(scheduledEnd.getTime() - 3 * 60_000)
          : null,
        geoStatus:
          sequence === 3 && currentMonth
            ? "flagged"
            : isCompleted
              ? "verified"
              : "pending",
        holdReason:
          stage === "on_hold" ? "Awaiting specialist part approval" : null,
        cancelReason:
          stage === "cancelled"
            ? "Duplicate request confirmed by office"
            : null,
        completedAt: isCompleted
          ? new Date(scheduledEnd.getTime() - 3 * 60_000)
          : null,
        readyForInvoiceAt: ["ready_for_invoicing", "invoiced"].includes(stage)
          ? new Date(scheduledEnd.getTime() + 12 * 60_000)
          : null,
        createdBy: ownerId,
        updatedBy: ownerId,
        createdAt: new Date(scheduledStart.getTime() - 3 * 86_400_000),
      });
      const jobId = Number(insert[0].insertId);
      await db.insert(jobVisits).values({
        organizationId,
        jobId,
        foremanId,
        scheduledStart,
        scheduledEnd,
        status:
          stage === "scheduled"
            ? "scheduled"
            : stage === "in_progress"
              ? "on_site"
              : stage === "cancelled"
                ? "cancelled"
                : "complete",
        travelMinutes: 25 + (sequence % 3) * 10,
        geoStatus:
          sequence === 3 && currentMonth
            ? "flagged"
            : isCompleted
              ? "verified"
              : "pending",
        notes: "Synthetic demonstration dispatch record.",
      });
      await db.insert(jobMaterials).values([
        {
          organizationId,
          jobId,
          description: materials[(sequence + monthIndex) % materials.length]!,
          quantity: 1 + (sequence % 3),
          unit: "each",
          source: sequence % 2 ? "catalog" : "free_text",
          unitPrice: 95 + sequence * 55,
        },
        {
          organizationId,
          jobId,
          description: "Standard call-out",
          quantity: 1,
          unit: "visit",
          source: "catalog",
          unitPrice: 650,
        },
      ]);
      await db.insert(jobEvidence).values([
        {
          organizationId,
          jobId,
          evidenceType: "before_photo",
          title: `Before condition · ${jobNumber}`,
          capturedBy: foremanId,
          capturedAt: scheduledStart,
          syncStatus: "synced",
          metadata: {
            demo: true,
            device: "Foreman mobile",
            label: "Synthetic evidence metadata",
          },
        },
        {
          organizationId,
          jobId,
          evidenceType: isCompleted ? "signature" : "note",
          title: isCompleted
            ? `Client sign-off · ${jobNumber}`
            : `Office note · ${jobNumber}`,
          capturedBy: foremanId,
          capturedAt: scheduledEnd,
          syncStatus: stage === "in_progress" ? "pending_upload" : "synced",
          metadata: { demo: true, status: stage },
        },
      ]);
      const documentTemplate =
        documentTemplates[(monthIndex + sequence) % documentTemplates.length]!;
      const documentContent = `ELEGEX SYNTHETIC DEMONSTRATION DOCUMENT\n\nDocument: ${documentTemplate.label}\nJob: ${jobNumber}\nStatus: ${stage}\nScheduled (UTC): ${scheduledStart.toISOString()}\nService address: ${template[2]}\n\nThis tenant-scoped artifact is generated deterministically for the six-month demonstration corpus. It does not contain customer data.`;
      const documentArtifact = await storagePut(
        `elegex/${organizationId}/demo-documents/${jobNumber.replace("#", "")}-${documentTemplate.documentType}.txt`,
        documentContent,
        "text/plain"
      );
      await db.insert(documents).values({
        organizationId,
        contactId: contact.id,
        documentType: documentTemplate.documentType,
        retentionYears: documentTemplate.retentionYears,
        classificationLevel: documentTemplate.classificationLevel,
        fileName: `${documentTemplate.label} ${jobNumber}.txt`,
        mimeType: "text/plain",
        sizeBytes: Buffer.byteLength(documentContent),
        storageKey: documentArtifact.key,
        storageUrl: documentArtifact.url,
        uploadedBy: ownerId,
        createdAt: scheduledEnd,
      });
      if (sequence === 1 || sequence === 5) {
        const quoteInsert = await db.insert(quotes).values({
          organizationId,
          jobId,
          quoteNumber: `QT-${2601 + monthIndex * 6 + sequence}`,
          status:
            sequence === 5
              ? "needs_pricing"
              : monthIndex < 4
                ? "accepted"
                : "sent",
          assessedAt: scheduledEnd,
          sentAt:
            sequence === 1
              ? new Date(scheduledEnd.getTime() + 86_400_000)
              : null,
          respondedAt:
            monthIndex < 4 && sequence === 1
              ? new Date(scheduledEnd.getTime() + 3 * 86_400_000)
              : null,
          validUntil: new Date(scheduledEnd.getTime() + 14 * 86_400_000),
          total: 1280 + monthIndex * 110 + sequence * 70,
          createdBy: ownerId,
        });
        const quoteId = Number(quoteInsert[0].insertId);
        await db.insert(quoteItems).values([
          {
            quoteId,
            description: "Assessment and installation labour",
            quantity: 1,
            unitPrice: 850,
            total: 850,
            source: "catalog",
          },
          {
            quoteId,
            description: materials[(sequence + 1) % materials.length]!,
            quantity: 1,
            unitPrice: 430,
            total: 430,
            source: "free_text",
          },
        ]);
      }
      if (stage === "invoiced")
        await db.insert(invoiceLinks).values({
          organizationId,
          jobId,
          externalInvoiceNumber: `INV-${8701 + monthIndex * 6 + sequence}`,
          linkedBy: ownerId,
          linkedAt: new Date(scheduledEnd.getTime() + 2 * 86_400_000),
          notes: "Synthetic QuickBooks link used for demonstration.",
        });
      await db.insert(activityLogs).values([
        {
          organizationId,
          actorId: ownerId,
          action: "scheduled",
          entityType: "job",
          entityId: jobId,
          summary: `${jobNumber} scheduled with assigned foreman`,
          createdAt: new Date(scheduledStart.getTime() - 2 * 86_400_000),
        },
        {
          organizationId,
          actorId: foremanId,
          action: isCompleted ? "completed" : "updated",
          entityType: "job",
          entityId: jobId,
          summary: isCompleted
            ? `${jobNumber} completed with field evidence recorded`
            : `${jobNumber} remains ${stage.replace(/_/g, " ")}`,
          createdAt: scheduledEnd,
        },
      ]);
    }
    await db
      .insert(monthlyOperationalSnapshots)
      .values({
        organizationId,
        periodStart,
        jobsCompleted: 19 + monthIndex * 2,
        jobsInProgress: currentMonth ? 6 : 3,
        jobsOnHold: 1 + (monthIndex % 3),
        quotesSent: 9 + monthIndex,
        quotesAccepted: 5 + monthIndex,
        invoicesLinked: 16 + monthIndex * 2,
        invoicedValue: 128000 + monthIndex * 18500,
        firstVisitResolutionRate: 82 + (monthIndex % 4),
        customerSatisfactionIndex: 88 + (monthIndex % 5),
      })
      .onDuplicateKeyUpdate({
        set: {
          jobsCompleted: 19 + monthIndex * 2,
          jobsInProgress: currentMonth ? 6 : 3,
          jobsOnHold: 1 + (monthIndex % 3),
          quotesSent: 9 + monthIndex,
          quotesAccepted: 5 + monthIndex,
          invoicesLinked: 16 + monthIndex * 2,
          invoicedValue: 128000 + monthIndex * 18500,
          firstVisitResolutionRate: 82 + (monthIndex % 4),
          customerSatisfactionIndex: 88 + (monthIndex % 5),
        },
      });
  }
  await db
    .insert(integrationConnections)
    .values([
      {
        organizationId,
        provider: "database",
        name: "Primary operations database",
        status: "active",
        configuration: { dialect: "mysql", environment: "demo" },
        secretReference: "DATABASE_URL",
        createdBy: ownerId,
        lastValidatedAt: new Date(),
      },
      {
        organizationId,
        provider: "webhook",
        name: "Accounting invoice handoff",
        status: "active",
        configuration: {
          eventTypes: ["invoice.linked", "job.ready_for_invoicing"],
          mode: "outbox",
        },
        secretReference: "ACCOUNTING_WEBHOOK_URL",
        createdBy: ownerId,
        lastValidatedAt: new Date(),
      },
    ])
    .onDuplicateKeyUpdate({
      set: { status: "active", lastValidatedAt: new Date(), lastError: null },
    });
  const releaseRows = [
    [
      "development",
      "v2.8.0-dev.14",
      "a12d5f7",
      "v2.8.0-dev.13",
      "Synthetic development release record for demo validation.",
    ],
    [
      "staging",
      "v2.8.0-rc.3",
      "c8f3a10",
      "v2.8.0-rc.2",
      "Synthetic staging candidate with field-service migration and release evidence.",
    ],
    [
      "production",
      "v2.7.4",
      "9db41e2",
      "v2.7.3",
      "Synthetic production baseline retained for release comparison.",
    ],
  ] as const;
  for (const release of releaseRows) {
    const inserted = await db.insert(environmentReleases).values({
      organizationId,
      environment: release[0],
      version: release[1],
      commitSha: release[2],
      status: "healthy",
      rollbackVersion: release[3],
      notes: release[4],
      deployedBy: ownerId,
    });
    const releaseId = Number(inserted[0].insertId);
    await db.insert(releaseChecks).values([
      {
        releaseId,
        category: "database",
        checkName: "Migration history reviewed",
        status: "passed",
        evidence:
          "Additive tenant-scoped migrations inspected before application.",
      },
      {
        releaseId,
        category: "api",
        checkName: "Protected contract suite",
        status: "passed",
        evidence:
          "Role and contract verification recorded in the demo release workflow.",
      },
      {
        releaseId,
        category: "ui",
        checkName: "Desktop and mobile smoke path",
        status: "passed",
        evidence:
          "Office dashboard, job register, dispatch, and reporting reviewed.",
      },
      {
        releaseId,
        category: "security",
        checkName: "Tenant scope and RBAC gate",
        status: "passed",
        evidence:
          "Server resolves membership scope before protected operations.",
      },
      {
        releaseId,
        category: "observability",
        checkName: "Database connector health",
        status: "passed",
        evidence: "Readiness connector completed synthetic release probe.",
      },
    ]);
  }
  await db.insert(activityLogs).values({
    organizationId,
    actorId: ownerId,
    action: "seeded",
    entityType: "field_service_demo",
    entityId: null,
    summary:
      "Synthetic six-month Elegex field-service demonstration history seeded",
  });
}

export async function ensureTenantScope(userId: number): Promise<TenantScope> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  let membership = await db
    .select({
      organizationId: organizationMembers.organizationId,
      role: organizationMembers.role,
      organizationName: organizations.name,
      primaryColor: organizations.primaryColor,
    })
    .from(organizationMembers)
    .innerJoin(
      organizations,
      eq(organizationMembers.organizationId, organizations.id)
    )
    .where(
      and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.isActive, true)
      )
    )
    .limit(1);
  if (!membership[0]) {
    const created = await db.insert(organizations).values({
      name: "Elegex Operations",
      slug: `elegex-${userId}`,
      industry: "Professional services",
      createdBy: userId,
    });
    const organizationId = Number(created[0].insertId);
    await db.insert(organizationMembers).values({
      organizationId,
      userId,
      role: "owner",
      title: "Workspace Owner",
    });
    await seedDemoWorkspace(organizationId, userId);
    membership = await db
      .select({
        organizationId: organizationMembers.organizationId,
        role: organizationMembers.role,
        organizationName: organizations.name,
        primaryColor: organizations.primaryColor,
      })
      .from(organizationMembers)
      .innerJoin(
        organizations,
        eq(organizationMembers.organizationId, organizations.id)
      )
      .where(
        and(
          eq(organizationMembers.userId, userId),
          eq(organizationMembers.isActive, true)
        )
      )
      .limit(1);
  }
  await seedFieldServiceDemo(membership[0]!.organizationId, userId);
  return membership[0] as TenantScope;
}

export async function canUserReadStorageKey(
  userId: number,
  storageKey: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const membership = await db
    .select({ organizationId: organizationMembers.organizationId })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.isActive, true)
      )
    )
    .limit(1);
  const organizationId = membership[0]?.organizationId;
  if (!organizationId) return false;

  const document = await db
    .select({ id: documents.id })
    .from(documents)
    .where(
      and(
        eq(documents.organizationId, organizationId),
        eq(documents.storageKey, storageKey)
      )
    )
    .limit(1);
  if (document[0]) return true;

  const evidence = await db
    .select({ id: jobEvidence.id })
    .from(jobEvidence)
    .where(
      and(
        eq(jobEvidence.organizationId, organizationId),
        sql`JSON_UNQUOTE(JSON_EXTRACT(${jobEvidence.metadata}, '$.storageKey')) = ${storageKey}`
      )
    )
    .limit(1);
  return Boolean(evidence[0]);
}

export function dedupeWorkspaceMembers<T extends { email?: string | null }>(
  members: T[]
) {
  const seen = new Set<string>();
  return members.filter(member => {
    const email = member.email?.trim().toLowerCase();
    if (!email) return true;
    if (seen.has(email)) return false;
    seen.add(email);
    return true;
  });
}

export function dedupeAdminMembers<
  T extends { user: { email?: string | null } },
>(members: T[]) {
  const seen = new Set<string>();
  return members.filter(member => {
    const email = member.user.email?.trim().toLowerCase();
    if (!email) return true;
    if (seen.has(email)) return false;
    seen.add(email);
    return true;
  });
}

export async function listWorkspaceMembers(
  organizationId: number,
  database?: any
) {
  const db = database ?? (await getDb());
  if (!db) throw new Error("Database is not available");
  const members = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: organizationMembers.role,
      title: organizationMembers.title,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.isActive, true)
      )
    )
    .orderBy(asc(users.name));
  return dedupeWorkspaceMembers(members);
}

export async function getDashboard(organizationId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const scoped = (table: any) =>
    and(eq(table.organizationId, organizationId), isNull(table.deletedAt));
  const [contactTotal] = await db
    .select({ total: count() })
    .from(contacts)
    .where(scoped(contacts));
  const [projectRows, taskRows, caseRows] = await Promise.all([
    db
      .select({ status: projects.status, total: count() })
      .from(projects)
      .where(scoped(projects))
      .groupBy(projects.status),
    db
      .select({ status: tasks.status, total: count() })
      .from(tasks)
      .where(scoped(tasks))
      .groupBy(tasks.status),
    db
      .select({ status: cases.status, total: count() })
      .from(cases)
      .where(scoped(cases))
      .groupBy(cases.status),
  ]);
  const activity = await db
    .select()
    .from(activityLogs)
    .where(eq(activityLogs.organizationId, organizationId))
    .orderBy(desc(activityLogs.createdAt))
    .limit(6);
  const upcoming = await db
    .select()
    .from(tasks)
    .where(and(scoped(tasks), sql`${tasks.dueDate} IS NOT NULL`))
    .orderBy(asc(tasks.dueDate))
    .limit(5);
  const unread = await db
    .select({ total: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.organizationId, organizationId),
        eq(notifications.userId, userId),
        isNull(notifications.readAt)
      )
    );
  return {
    contacts: contactTotal?.total ?? 0,
    projectRows,
    taskRows,
    caseRows,
    activity,
    upcoming,
    unread: unread[0]?.total ?? 0,
  };
}

type ListInput = {
  organizationId: number;
  query?: string;
  status?: string;
  page?: number;
  pageSize?: number;
};
const paging = (input: ListInput) => ({
  limit: Math.min(input.pageSize ?? 10, 50),
  offset: ((input.page ?? 1) - 1) * Math.min(input.pageSize ?? 10, 50),
});

export async function listContacts(input: ListInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const keyword = input.query ? `%${input.query}%` : undefined;
  const where = and(
    eq(contacts.organizationId, input.organizationId),
    isNull(contacts.deletedAt),
    input.status ? eq(contacts.status, input.status as any) : undefined,
    keyword
      ? or(
          like(contacts.name, keyword),
          like(contacts.company, keyword),
          like(contacts.email, keyword)
        )
      : undefined
  );
  const { limit, offset } = paging(input);
  const [rows, total] = await Promise.all([
    db
      .select()
      .from(contacts)
      .where(where)
      .orderBy(desc(contacts.updatedAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(contacts).where(where),
  ]);
  return { rows, total: total[0]?.total ?? 0 };
}

export async function listProjects(input: ListInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const keyword = input.query ? `%${input.query}%` : undefined;
  const where = and(
    eq(projects.organizationId, input.organizationId),
    isNull(projects.deletedAt),
    input.status ? eq(projects.status, input.status as any) : undefined,
    keyword
      ? or(like(projects.name, keyword), like(projects.code, keyword))
      : undefined
  );
  const { limit, offset } = paging(input);
  const [rows, total] = await Promise.all([
    db
      .select()
      .from(projects)
      .where(where)
      .orderBy(desc(projects.updatedAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(projects).where(where),
  ]);
  return { rows, total: total[0]?.total ?? 0 };
}

export async function listCases(input: ListInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const keyword = input.query ? `%${input.query}%` : undefined;
  const where = and(
    eq(cases.organizationId, input.organizationId),
    isNull(cases.deletedAt),
    input.status ? eq(cases.status, input.status as any) : undefined,
    keyword
      ? or(like(cases.title, keyword), like(cases.reference, keyword))
      : undefined
  );
  const { limit, offset } = paging(input);
  const [rows, total] = await Promise.all([
    db
      .select()
      .from(cases)
      .where(where)
      .orderBy(desc(cases.updatedAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(cases).where(where),
  ]);
  return { rows, total: total[0]?.total ?? 0 };
}

export async function listTasks(input: ListInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const keyword = input.query ? `%${input.query}%` : undefined;
  const where = and(
    eq(tasks.organizationId, input.organizationId),
    isNull(tasks.deletedAt),
    input.status ? eq(tasks.status, input.status as any) : undefined,
    keyword ? like(tasks.title, keyword) : undefined
  );
  const { limit, offset } = paging(input);
  const [rows, total] = await Promise.all([
    db
      .select()
      .from(tasks)
      .where(where)
      .orderBy(asc(tasks.dueDate), desc(tasks.updatedAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(tasks).where(where),
  ]);
  return { rows, total: total[0]?.total ?? 0 };
}

export async function getRecordDetail(
  organizationId: number,
  resource: "contacts" | "projects" | "cases",
  id: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const table = { contacts, projects, cases }[resource] as any;
  const rows = await db
    .select()
    .from(table)
    .where(
      and(
        eq(table.id, id),
        eq(table.organizationId, organizationId),
        isNull(table.deletedAt)
      )
    )
    .limit(1);
  const record = rows[0];
  if (!record) return undefined;
  const relatedTasks =
    resource === "projects"
      ? await db
          .select()
          .from(tasks)
          .where(
            and(
              eq(tasks.organizationId, organizationId),
              eq(tasks.projectId, id),
              isNull(tasks.deletedAt)
            )
          )
          .orderBy(asc(tasks.dueDate))
          .limit(10)
      : [];
  const relatedDocuments = await listDocuments(
    organizationId,
    resource.slice(0, -1) as "contact" | "project" | "case",
    id
  );
  const relatedActivity = await db
    .select()
    .from(activityLogs)
    .where(
      and(
        eq(activityLogs.organizationId, organizationId),
        eq(activityLogs.entityId, id)
      )
    )
    .orderBy(desc(activityLogs.createdAt))
    .limit(10);
  return { record, relatedTasks, relatedDocuments, relatedActivity };
}

export async function createContact(
  organizationId: number,
  userId: number,
  input: {
    name: string;
    company?: string;
    email?: string;
    phone?: string;
    location?: string;
    status?: "lead" | "active" | "inactive";
    notes?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db
    .insert(contacts)
    .values({ ...input, organizationId, createdBy: userId, updatedBy: userId });
  const id = Number(result[0].insertId);
  await logActivity(
    organizationId,
    userId,
    "created",
    "contact",
    id,
    `Created contact ${input.name}`
  );
  return id;
}

export async function updateContact(
  organizationId: number,
  userId: number,
  id: number,
  input: {
    name?: string;
    company?: string;
    email?: string;
    phone?: string;
    location?: string;
    status?: "lead" | "active" | "inactive";
    notes?: string;
  }
) {
  return withTransaction(async tx => {
    await assertScopedEntity(tx, contacts, organizationId, id, "Contact", true);
    await tx
      .update(contacts)
      .set({ ...input, updatedBy: userId })
      .where(
        and(
          eq(contacts.id, id),
          eq(contacts.organizationId, organizationId),
          isNull(contacts.deletedAt)
        )
      );
    await tx.insert(activityLogs).values({
      organizationId,
      actorId: userId,
      action: "updated",
      entityType: "contact",
      entityId: id,
      summary: "Updated a contact record",
    });
  });
}

export async function createProject(
  organizationId: number,
  userId: number,
  input: {
    name: string;
    code: string;
    contactId?: number;
    description?: string;
    status?: "planning" | "active" | "on_hold" | "complete" | "archived";
    priority?: "low" | "medium" | "high" | "urgent";
    dueDate?: Date;
    budget?: number;
  }
) {
  return withTransaction(async tx => {
    await assertScopedEntity(
      tx,
      contacts,
      organizationId,
      input.contactId,
      "Contact",
      true
    );
    const result = await tx.insert(projects).values({
      ...input,
      organizationId,
      createdBy: userId,
      updatedBy: userId,
    });
    const id = Number(result[0].insertId);
    await tx.insert(activityLogs).values({
      organizationId,
      actorId: userId,
      action: "created",
      entityType: "project",
      entityId: id,
      summary: `Created project ${input.name}`,
    });
    return id;
  });
}

export async function updateProject(
  organizationId: number,
  userId: number,
  id: number,
  input: {
    name?: string;
    description?: string;
    status?: "planning" | "active" | "on_hold" | "complete" | "archived";
    priority?: "low" | "medium" | "high" | "urgent";
    progress?: number;
    dueDate?: Date;
    budget?: number;
  }
) {
  return withTransaction(async tx => {
    await assertScopedEntity(tx, projects, organizationId, id, "Project", true);
    await tx
      .update(projects)
      .set({ ...input, updatedBy: userId })
      .where(
        and(
          eq(projects.id, id),
          eq(projects.organizationId, organizationId),
          isNull(projects.deletedAt)
        )
      );
    await tx.insert(activityLogs).values({
      organizationId,
      actorId: userId,
      action: "updated",
      entityType: "project",
      entityId: id,
      summary: "Updated a project record",
    });
  });
}

export async function createCase(
  organizationId: number,
  userId: number,
  input: {
    reference: string;
    title: string;
    summary?: string;
    contactId?: number;
    projectId?: number;
    severity?: "low" | "medium" | "high" | "critical";
    ownerId?: number;
    dueDate?: Date;
  }
) {
  return withTransaction(async tx => {
    await assertScopedEntity(
      tx,
      contacts,
      organizationId,
      input.contactId,
      "Contact",
      true
    );
    await assertScopedEntity(
      tx,
      projects,
      organizationId,
      input.projectId,
      "Project",
      true
    );
    await assertActiveWorkspaceMember(
      tx,
      organizationId,
      input.ownerId,
      "Case owner"
    );
    const result = await tx.insert(cases).values({
      ...input,
      organizationId,
      createdBy: userId,
      updatedBy: userId,
    });
    const id = Number(result[0].insertId);
    await tx.insert(activityLogs).values({
      organizationId,
      actorId: userId,
      action: "created",
      entityType: "case",
      entityId: id,
      summary: `Created case ${input.reference}`,
    });
    return id;
  });
}

export async function updateCase(
  organizationId: number,
  userId: number,
  id: number,
  input: {
    title?: string;
    summary?: string;
    status?: "open" | "investigating" | "pending" | "resolved" | "closed";
    severity?: "low" | "medium" | "high" | "critical";
    ownerId?: number;
    dueDate?: Date;
  }
) {
  return withTransaction(async tx => {
    await assertScopedEntity(tx, cases, organizationId, id, "Case", true);
    await assertActiveWorkspaceMember(
      tx,
      organizationId,
      input.ownerId,
      "Case owner"
    );
    await tx
      .update(cases)
      .set({ ...input, updatedBy: userId })
      .where(
        and(
          eq(cases.id, id),
          eq(cases.organizationId, organizationId),
          isNull(cases.deletedAt)
        )
      );
    await tx.insert(activityLogs).values({
      organizationId,
      actorId: userId,
      action: "updated",
      entityType: "case",
      entityId: id,
      summary: "Updated a case record",
    });
  });
}

export async function createTask(
  organizationId: number,
  userId: number,
  input: {
    title: string;
    description?: string;
    projectId?: number;
    caseId?: number;
    priority?: "low" | "medium" | "high" | "urgent";
    assigneeId?: number;
    dueDate?: Date;
  }
) {
  return withTransaction(async tx => {
    await assertScopedEntity(
      tx,
      projects,
      organizationId,
      input.projectId,
      "Project",
      true
    );
    await assertScopedEntity(
      tx,
      cases,
      organizationId,
      input.caseId,
      "Case",
      true
    );
    await assertActiveWorkspaceMember(
      tx,
      organizationId,
      input.assigneeId,
      "Assignee"
    );
    const result = await tx.insert(tasks).values({
      ...input,
      organizationId,
      createdBy: userId,
      updatedBy: userId,
    });
    const id = Number(result[0].insertId);
    if (input.assigneeId)
      await tx.insert(notifications).values({
        organizationId,
        userId: input.assigneeId,
        type: "assignment",
        title: `Task assigned: ${input.title}`,
        description: "A task has been assigned to you.",
        href: "/tasks",
      });
    await tx.insert(activityLogs).values({
      organizationId,
      actorId: userId,
      action: "assigned",
      entityType: "task",
      entityId: id,
      summary: `Assigned task ${input.title}`,
    });
    return id;
  });
}

export async function updateTask(
  organizationId: number,
  userId: number,
  id: number,
  input: {
    title?: string;
    description?: string;
    projectId?: number;
    status?: "todo" | "in_progress" | "blocked" | "complete";
    priority?: "low" | "medium" | "high" | "urgent";
    assigneeId?: number;
    dueDate?: Date;
  }
) {
  return withTransaction(async tx => {
    await assertScopedEntity(tx, tasks, organizationId, id, "Task", true);
    await assertScopedEntity(
      tx,
      projects,
      organizationId,
      input.projectId,
      "Project",
      true
    );
    await assertActiveWorkspaceMember(
      tx,
      organizationId,
      input.assigneeId,
      "Assignee"
    );
    const completedAt =
      input.status === "complete"
        ? new Date()
        : input.status
          ? null
          : undefined;
    await tx
      .update(tasks)
      .set({
        ...input,
        ...(completedAt !== undefined ? { completedAt } : {}),
        updatedBy: userId,
      })
      .where(
        and(
          eq(tasks.id, id),
          eq(tasks.organizationId, organizationId),
          isNull(tasks.deletedAt)
        )
      );
    if (input.assigneeId)
      await tx.insert(notifications).values({
        organizationId,
        userId: input.assigneeId,
        type: "assignment",
        title: "A task was reassigned to you",
        description: input.title ?? "Review the updated task assignment.",
        href: "/tasks",
      });
    await tx.insert(activityLogs).values({
      organizationId,
      actorId: userId,
      action: "updated",
      entityType: "task",
      entityId: id,
      summary: "Updated a task",
    });
  });
}

export async function archiveRecord(
  organizationId: number,
  userId: number,
  resource: "contacts" | "projects" | "cases" | "tasks",
  id: number
) {
  return withTransaction(async tx => {
    const table = { contacts, projects, cases, tasks }[resource] as any;
    await assertScopedEntity(
      tx,
      table,
      organizationId,
      id,
      resource.slice(0, -1),
      true
    );
    await tx
      .update(table)
      .set({ deletedAt: new Date(), updatedBy: userId })
      .where(
        and(
          eq(table.id, id),
          eq(table.organizationId, organizationId),
          isNull(table.deletedAt)
        )
      );
    await tx.insert(activityLogs).values({
      organizationId,
      actorId: userId,
      action: "archived",
      entityType: resource.slice(0, -1),
      entityId: id,
      summary: `Archived a ${resource.slice(0, -1)} record`,
    });
  });
}

export async function getNotifications(organizationId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.organizationId, organizationId),
        eq(notifications.userId, userId)
      )
    )
    .orderBy(desc(notifications.createdAt))
    .limit(25);
}

export async function markNotificationRead(
  organizationId: number,
  userId: number,
  id: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, id),
        eq(notifications.organizationId, organizationId),
        eq(notifications.userId, userId)
      )
    );
}

export async function getAdminData(organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const [members, logs, settings] = await Promise.all([
    db
      .select({ membership: organizationMembers, user: users })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.isActive, true)
        )
      )
      .orderBy(asc(organizationMembers.role)),
    db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.organizationId, organizationId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(50),
    db
      .select()
      .from(appSettings)
      .where(eq(appSettings.organizationId, organizationId))
      .limit(1),
  ]);
  return { members: dedupeAdminMembers(members), logs, settings: settings[0] };
}

export async function getOrganizationSettings(organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const [settings, callOuts] = await Promise.all([
    db
      .select()
      .from(appSettings)
      .where(eq(appSettings.organizationId, organizationId))
      .limit(1),
    db
      .select()
      .from(callOutTypes)
      .where(eq(callOutTypes.organizationId, organizationId))
      .orderBy(asc(callOutTypes.appliesFrom), asc(callOutTypes.name)),
  ]);
  return { settings: settings[0], callOutTypes: callOuts };
}

export async function updateMemberRole(
  organizationId: number,
  actorId: number,
  membershipId: number,
  role: Exclude<OrganizationRole, "owner">
) {
  return withTransaction(async tx => {
    const membership = await tx
      .select({ role: organizationMembers.role })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.id, membershipId),
          eq(organizationMembers.organizationId, organizationId)
        )
      )
      .limit(1);
    if (!membership[0]) throw new Error("Workspace member is not available");
    if (membership[0].role === "owner")
      throw new Error("The workspace owner role cannot be reassigned");
    await tx
      .update(organizationMembers)
      .set({ role })
      .where(
        and(
          eq(organizationMembers.id, membershipId),
          eq(organizationMembers.organizationId, organizationId)
        )
      );
    await tx.insert(activityLogs).values({
      organizationId,
      actorId,
      action: "updated",
      entityType: "member",
      entityId: membershipId,
      summary: `Updated a member role to ${role}`,
    });
  });
}

export async function updateSettings(
  organizationId: number,
  userId: number,
  input: {
    name?: string;
    primaryColor?: string;
    timezone?: string;
    locale?: string;
    currency?: string;
    tradeVocabulary?: string[];
    allowMemberInvites?: boolean;
    notificationDigest?: boolean;
    aiOptIn?: boolean;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const { name, primaryColor, tradeVocabulary, ...settingFields } = input;
  if (name || primaryColor)
    await db
      .update(organizations)
      .set({
        ...(name ? { name } : {}),
        ...(primaryColor ? { primaryColor } : {}),
      })
      .where(eq(organizations.id, organizationId));
  if (Object.keys(settingFields).length || tradeVocabulary) {
    const existing = await db
      .select({ metadata: appSettings.metadata })
      .from(appSettings)
      .where(eq(appSettings.organizationId, organizationId))
      .limit(1);
    const existingMetadata = (existing[0]?.metadata ?? {}) as Record<
      string,
      unknown
    >;
    const metadata = tradeVocabulary
      ? { ...existingMetadata, tradeVocabulary }
      : existing[0]?.metadata;
    await db
      .insert(appSettings)
      .values({
        organizationId,
        ...settingFields,
        ...(metadata ? { metadata } : {}),
        updatedBy: userId,
      })
      .onDuplicateKeyUpdate({
        set: {
          ...settingFields,
          ...(tradeVocabulary ? { metadata } : {}),
          updatedBy: userId,
        },
      });
  }
  await logActivity(
    organizationId,
    userId,
    "updated",
    "settings",
    organizationId,
    "Updated workspace settings"
  );
}

export async function getSavedViews(organizationId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db
    .select()
    .from(savedViews)
    .where(
      and(
        eq(savedViews.organizationId, organizationId),
        or(eq(savedViews.userId, userId), eq(savedViews.isShared, true))
      )
    )
    .orderBy(desc(savedViews.updatedAt));
}

export async function createSavedView(
  organizationId: number,
  userId: number,
  input: {
    name: string;
    resource: "contacts" | "projects" | "cases" | "tasks" | "reports";
    filters: Record<string, unknown>;
    isShared?: boolean;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(savedViews).values({
    organizationId,
    userId,
    name: input.name,
    resource: input.resource,
    filters: input.filters,
    isShared: input.isShared ?? false,
  });
  await logActivity(
    organizationId,
    userId,
    "created",
    "saved_view",
    Number(result[0].insertId),
    `Saved report view ${input.name}`
  );
  return Number(result[0].insertId);
}

export async function getReportRows(organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db
    .select({
      code: projects.code,
      project: projects.name,
      status: projects.status,
      priority: projects.priority,
      progress: projects.progress,
      dueDate: projects.dueDate,
      budget: projects.budget,
      contact: contacts.name,
    })
    .from(projects)
    .leftJoin(contacts, eq(projects.contactId, contacts.id))
    .where(
      and(
        eq(projects.organizationId, organizationId),
        isNull(projects.deletedAt)
      )
    )
    .orderBy(desc(projects.updatedAt));
}

export async function getFieldServiceDashboard(organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const scoped = and(
    eq(jobs.organizationId, organizationId),
    isNull(jobs.deletedAt)
  );
  const [
    stageRows,
    currentJobs,
    snapshotRows,
    quoteRows,
    invoiceReadyRows,
    recentActivity,
    organizationSettings,
    callOuts,
  ] = await Promise.all([
    db
      .select({ stage: jobs.stage, total: count() })
      .from(jobs)
      .where(scoped)
      .groupBy(jobs.stage),
    db
      .select({ job: jobs, contact: contacts })
      .from(jobs)
      .innerJoin(contacts, eq(jobs.contactId, contacts.id))
      .where(scoped)
      .orderBy(desc(jobs.scheduledStart))
      .limit(8),
    db
      .select()
      .from(monthlyOperationalSnapshots)
      .where(eq(monthlyOperationalSnapshots.organizationId, organizationId))
      .orderBy(asc(monthlyOperationalSnapshots.periodStart))
      .limit(6),
    db
      .select({ status: quotes.status, total: count() })
      .from(quotes)
      .where(eq(quotes.organizationId, organizationId))
      .groupBy(quotes.status),
    db
      .select({ job: jobs, contact: contacts })
      .from(jobs)
      .innerJoin(contacts, eq(jobs.contactId, contacts.id))
      .where(and(scoped, eq(jobs.stage, "ready_for_invoicing")))
      .orderBy(asc(jobs.readyForInvoiceAt))
      .limit(8),
    db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.organizationId, organizationId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(12),
    db
      .select()
      .from(appSettings)
      .where(eq(appSettings.organizationId, organizationId))
      .limit(1),
    db
      .select()
      .from(callOutTypes)
      .where(eq(callOutTypes.organizationId, organizationId))
      .orderBy(asc(callOutTypes.appliesFrom), asc(callOutTypes.name)),
  ]);
  return {
    stageRows,
    currentJobs,
    snapshots: snapshotRows,
    quoteRows,
    invoiceReadyRows,
    recentActivity,
    settings: organizationSettings[0],
    callOutTypes: callOuts,
  };
}

export async function listJobs(input: {
  organizationId: number;
  query?: string;
  stage?: string;
  foremanId?: number;
  page?: number;
  pageSize?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const keyword = input.query ? `%${input.query}%` : undefined;
  const where = and(
    eq(jobs.organizationId, input.organizationId),
    isNull(jobs.deletedAt),
    input.stage ? eq(jobs.stage, input.stage as any) : undefined,
    input.foremanId ? eq(jobs.foremanId, input.foremanId) : undefined,
    keyword
      ? or(
          like(jobs.jobNumber, keyword),
          like(jobs.title, keyword),
          like(jobs.serviceAddress, keyword)
        )
      : undefined
  );
  const { limit, offset } = paging({
    organizationId: input.organizationId,
    page: input.page,
    pageSize: input.pageSize,
  });
  const [rows, total] = await Promise.all([
    db
      .select({ job: jobs, contact: contacts, foreman: users })
      .from(jobs)
      .innerJoin(contacts, eq(jobs.contactId, contacts.id))
      .leftJoin(users, eq(jobs.foremanId, users.id))
      .where(where)
      .orderBy(desc(jobs.scheduledStart))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(jobs).where(where),
  ]);
  return { rows, total: total[0]?.total ?? 0 };
}

export async function getJobDetail(organizationId: number, jobId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const row = await db
    .select({ job: jobs, contact: contacts, foreman: users })
    .from(jobs)
    .innerJoin(contacts, eq(jobs.contactId, contacts.id))
    .leftJoin(users, eq(jobs.foremanId, users.id))
    .where(
      and(
        eq(jobs.organizationId, organizationId),
        eq(jobs.id, jobId),
        isNull(jobs.deletedAt)
      )
    )
    .limit(1);
  if (!row[0]) return undefined;
  const [visits, materials, evidence, quoteRows, invoices, activity] =
    await Promise.all([
      db
        .select()
        .from(jobVisits)
        .where(
          and(
            eq(jobVisits.organizationId, organizationId),
            eq(jobVisits.jobId, jobId)
          )
        )
        .orderBy(desc(jobVisits.scheduledStart)),
      db
        .select()
        .from(jobMaterials)
        .where(
          and(
            eq(jobMaterials.organizationId, organizationId),
            eq(jobMaterials.jobId, jobId)
          )
        ),
      db
        .select()
        .from(jobEvidence)
        .where(
          and(
            eq(jobEvidence.organizationId, organizationId),
            eq(jobEvidence.jobId, jobId)
          )
        )
        .orderBy(desc(jobEvidence.capturedAt)),
      db
        .select()
        .from(quotes)
        .where(
          and(
            eq(quotes.organizationId, organizationId),
            eq(quotes.jobId, jobId)
          )
        )
        .orderBy(desc(quotes.createdAt)),
      db
        .select()
        .from(invoiceLinks)
        .where(
          and(
            eq(invoiceLinks.organizationId, organizationId),
            eq(invoiceLinks.jobId, jobId)
          )
        )
        .orderBy(desc(invoiceLinks.linkedAt)),
      db
        .select()
        .from(activityLogs)
        .where(
          and(
            eq(activityLogs.organizationId, organizationId),
            eq(activityLogs.entityType, "job"),
            eq(activityLogs.entityId, jobId)
          )
        )
        .orderBy(desc(activityLogs.createdAt)),
    ]);
  return {
    ...row[0],
    visits,
    materials,
    evidence,
    quotes: quoteRows,
    invoices,
    activity,
  };
}

type DemoEvidenceDocumentInput = {
  evidenceType: string;
  evidenceTitle: string;
  capturedAt: Date;
  jobNumber: string;
  jobTitle: string;
  serviceAddress: string;
  contactName: string;
};

type DemoEvidenceCorpusCandidate = {
  id: number;
  evidenceType: string;
  storageUrl?: string | null;
  metadata?: unknown;
};

export function selectDemoEvidenceCorpus<T extends DemoEvidenceCorpusCandidate>(
  evidence: T[]
) {
  const seeded = evidence.filter(candidate => {
    const metadata =
      candidate.metadata && typeof candidate.metadata === "object"
        ? (candidate.metadata as Record<string, unknown>)
        : {};
    return metadata.demo === true;
  });
  const linked = seeded.filter(candidate => Boolean(candidate.storageUrl));
  const beforeCondition = seeded.filter(
    candidate => candidate.evidenceType === "before_photo"
  );
  const signOff = seeded.filter(
    candidate => candidate.evidenceType === "signature"
  );
  const unique = new Map<number, T>();
  for (const candidate of [...linked, ...beforeCondition, ...signOff]) {
    unique.set(candidate.id, candidate);
    if (unique.size === 60) break;
  }
  return Array.from(unique.values());
}

function escapeDemoDocumentHtml(value: string) {
  return value.replace(/[&<>'"]/g, character => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character] ?? character;
  });
}

/**
 * Produces a clearly labelled, tenant-scoped demonstration artefact for seeded
 * field evidence. It is deliberately not used for customer evidence.
 */
export function buildDemoEvidenceDocument(input: DemoEvidenceDocumentInput) {
  const isSignOff = input.evidenceType === "signature";
  const heading = isSignOff
    ? "Client completion sign-off"
    : "Before-condition record";
  const purpose = isSignOff
    ? "Confirms that the representative reviewed the completed demonstration service and received the handover summary."
    : "Records the visible pre-work condition and planned safety controls before demonstration work starts.";
  const detailRows = isSignOff
    ? [
        ["Representative", `${input.contactName} (demo contact)`],
        [
          "Outcome reviewed",
          "Work area left safe; handover notes acknowledged",
        ],
        [
          "Client acknowledgement",
          "Completion summary accepted for demo workflow",
        ],
        ["Signature method", "Typed client sign-off — synthetic demonstration"],
      ]
    : [
        [
          "Observed condition",
          "Existing installation visually inspected before intervention",
        ],
        [
          "Work-area controls",
          "Access verified; isolation and safe-work controls planned",
        ],
        [
          "Photo reference",
          "Before-condition capture is represented by this controlled demo record",
        ],
        [
          "Handover dependency",
          "Any change to condition requires office review before invoicing",
        ],
      ];
  const rows = detailRows
    .map(
      ([label, value]) =>
        `<tr><th>${escapeDemoDocumentHtml(label!)}</th><td>${escapeDemoDocumentHtml(value!)}</td></tr>`
    )
    .join("");
  const captureTime = input.capturedAt
    .toISOString()
    .replace("T", " ")
    .replace(".000Z", " UTC");
  const job = `${input.jobNumber} — ${input.jobTitle}`;

  return {
    fileName: `${isSignOff ? "Client-sign-off" : "Before-condition"}-${input.jobNumber.replace("#", "")}.html`,
    documentType: isSignOff
      ? ("job_card" as const)
      : ("photo_evidence" as const),
    retentionYears: isSignOff ? 7 : 3,
    html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeDemoDocumentHtml(heading)} — ${escapeDemoDocumentHtml(input.jobNumber)}</title><style>body{margin:0;background:#eef2f7;color:#18263e;font:15px/1.55 Arial,sans-serif}.page{max-width:820px;margin:32px auto;background:#fff;padding:48px;box-shadow:0 8px 28px #15294a18}.brand{color:#195fe6;font-weight:800;letter-spacing:.16em}.tag{display:inline-block;margin-top:18px;padding:5px 10px;border-radius:999px;background:#e7f8ef;color:#167244;font-size:12px;font-weight:700}.eyebrow{margin:30px 0 6px;color:#5f7090;font-size:11px;font-weight:800;letter-spacing:.14em}h1{margin:0;font-size:32px;line-height:1.15}h2{margin:28px 0 10px;font-size:18px}.lead{color:#50617f;font-size:16px}table{width:100%;border-collapse:collapse;margin-top:14px}th,td{padding:13px 12px;border:1px solid #e5eaf1;text-align:left;vertical-align:top}th{width:32%;background:#f7f9fc;color:#50617f;font-size:12px;text-transform:uppercase;letter-spacing:.06em}.notice{margin-top:28px;padding:15px 16px;border-left:4px solid #195fe6;background:#eef4ff;color:#34435f}.footer{margin-top:38px;color:#7a879e;font-size:12px;border-top:1px solid #e5eaf1;padding-top:16px}@media print{body{background:#fff}.page{margin:0;box-shadow:none}}</style></head><body><main class="page"><div class="brand">ELEGEX OPERATIONS</div><div class="tag">SYNCED DEMO EVIDENCE</div><p class="eyebrow">FIELD EVIDENCE / ${isSignOff ? "CLIENT HANDOVER" : "SITE CONDITION"}</p><h1>${escapeDemoDocumentHtml(heading)}</h1><p class="lead">${escapeDemoDocumentHtml(purpose)}</p><h2>Service reference</h2><table><tr><th>Job</th><td>${escapeDemoDocumentHtml(job)}</td></tr><tr><th>Service address</th><td>${escapeDemoDocumentHtml(input.serviceAddress)}</td></tr><tr><th>Captured</th><td>${escapeDemoDocumentHtml(captureTime)}</td></tr><tr><th>Evidence label</th><td>${escapeDemoDocumentHtml(input.evidenceTitle)}</td></tr>${rows}</table><aside class="notice"><strong>Demonstration record.</strong> This is a detailed, tenant-scoped example document created for the Elegex demonstration workspace. It contains no customer data and is not a legal certificate, invoice, or production client signature.</aside><p class="footer">Generated by Elegex Operations · immutable demo evidence reference · ${escapeDemoDocumentHtml(input.jobNumber)}</p></main></body></html>`,
  };
}

function demoEvidenceMetadata(value: unknown) {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

async function ensureDemoEvidenceRegisterRecord(
  db: any,
  organizationId: number,
  uploadedBy: number,
  row: { evidence: any; job: any; contact: any },
  document: ReturnType<typeof buildDemoEvidenceDocument>,
  storageKey: string,
  storageUrl: string
) {
  const existing = await db
    .select({ id: documents.id })
    .from(documents)
    .where(
      and(
        eq(documents.organizationId, organizationId),
        eq(documents.storageKey, storageKey)
      )
    )
    .limit(1);
  if (existing[0]) return false;
  await db.insert(documents).values({
    organizationId,
    contactId: row.contact.id,
    documentType: document.documentType,
    retentionYears: document.retentionYears,
    classificationLevel: "internal",
    fileName: document.fileName,
    mimeType: "text/html",
    sizeBytes: Buffer.byteLength(document.html),
    storageKey,
    storageUrl,
    uploadedBy,
    createdAt: row.evidence.capturedAt,
  });
  return true;
}

async function materializeDemoEvidenceDocument(
  db: any,
  organizationId: number,
  uploadedBy: number,
  row: { evidence: any; job: any; contact: any }
) {
  const metadata = demoEvidenceMetadata(row.evidence.metadata);
  if (metadata.demo !== true)
    throw new Error(
      "Only seeded demo evidence can be materialized as a demo document"
    );
  const document = buildDemoEvidenceDocument({
    evidenceType: row.evidence.evidenceType,
    evidenceTitle: row.evidence.title,
    capturedAt: row.evidence.capturedAt,
    jobNumber: row.job.jobNumber,
    jobTitle: row.job.title,
    serviceAddress: row.job.serviceAddress,
    contactName: row.contact.name ?? "Client representative",
  });
  const existingKey =
    typeof metadata.storageKey === "string" ? metadata.storageKey : undefined;
  if (row.evidence.storageUrl && existingKey) {
    const createdRecord = await ensureDemoEvidenceRegisterRecord(
      db,
      organizationId,
      uploadedBy,
      row,
      document,
      existingKey,
      row.evidence.storageUrl
    );
    return {
      url: row.evidence.storageUrl,
      title: row.evidence.title,
      createdArtifact: false,
      createdRecord,
    };
  }
  const artifact = await storagePut(
    `elegex/${organizationId}/demo-evidence/${row.job.id}-${row.evidence.id}-${randomUUID()}.html`,
    document.html,
    "text/html; charset=utf-8"
  );
  await db
    .update(jobEvidence)
    .set({
      storageUrl: artifact.url,
      metadata: {
        ...metadata,
        storageKey: artifact.key,
        demoDocument: true,
        fileName: document.fileName,
      },
    })
    .where(
      and(
        eq(jobEvidence.organizationId, organizationId),
        eq(jobEvidence.id, row.evidence.id)
      )
    );
  const createdRecord = await ensureDemoEvidenceRegisterRecord(
    db,
    organizationId,
    uploadedBy,
    row,
    document,
    artifact.key,
    artifact.url
  );
  return {
    url: artifact.url,
    title: row.evidence.title,
    createdArtifact: true,
    createdRecord,
  };
}

export async function openDemoEvidenceDocument(
  organizationId: number,
  evidenceId: number,
  openedBy: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db
    .select({ evidence: jobEvidence, job: jobs, contact: contacts })
    .from(jobEvidence)
    .innerJoin(jobs, eq(jobEvidence.jobId, jobs.id))
    .innerJoin(contacts, eq(jobs.contactId, contacts.id))
    .where(
      and(
        eq(jobEvidence.organizationId, organizationId),
        eq(jobEvidence.id, evidenceId),
        eq(jobs.organizationId, organizationId)
      )
    )
    .limit(1);
  const row = result[0];
  if (!row) throw new Error("Evidence is not available in this workspace");
  if (row.evidence.storageUrl)
    return { url: row.evidence.storageUrl, title: row.evidence.title };

  return materializeDemoEvidenceDocument(db, organizationId, openedBy, row);
}

export async function materializeDemoEvidenceCorpus(
  organizationId: number,
  uploadedBy: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .select({ evidence: jobEvidence, job: jobs, contact: contacts })
    .from(jobEvidence)
    .innerJoin(jobs, eq(jobEvidence.jobId, jobs.id))
    .innerJoin(contacts, eq(jobs.contactId, contacts.id))
    .where(
      and(
        eq(jobEvidence.organizationId, organizationId),
        eq(jobs.organizationId, organizationId)
      )
    )
    .orderBy(asc(jobEvidence.capturedAt), asc(jobEvidence.id));
  const selected = selectDemoEvidenceCorpus(
    rows.map(row => ({
      ...row,
      id: row.evidence.id,
      evidenceType: row.evidence.evidenceType,
      storageUrl: row.evidence.storageUrl,
      metadata: row.evidence.metadata,
    }))
  );
  let createdArtifacts = 0;
  let createdRecords = 0;
  for (const candidate of selected) {
    const result = await materializeDemoEvidenceDocument(
      db,
      organizationId,
      uploadedBy,
      candidate
    );
    if (result.createdArtifact) createdArtifacts += 1;
    if (result.createdRecord) createdRecords += 1;
  }
  return {
    target: selected.length,
    createdArtifacts,
    createdRecords,
  };
}

export async function listDispatchVisits(
  organizationId: number,
  start?: Date,
  end?: Date
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const where = and(
    eq(jobVisits.organizationId, organizationId),
    eq(jobs.organizationId, organizationId),
    isNull(jobs.deletedAt),
    start ? sql`${jobVisits.scheduledStart} >= ${start}` : undefined,
    end ? sql`${jobVisits.scheduledStart} <= ${end}` : undefined
  );
  return db
    .select({ visit: jobVisits, job: jobs, contact: contacts, foreman: users })
    .from(jobVisits)
    .innerJoin(jobs, eq(jobVisits.jobId, jobs.id))
    .innerJoin(contacts, eq(jobs.contactId, contacts.id))
    .leftJoin(users, eq(jobVisits.foremanId, users.id))
    .where(where)
    .orderBy(asc(jobVisits.scheduledStart));
}

export async function getFieldServiceReports(organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const [
    snapshots,
    stageRows,
    quoteRows,
    readyForInvoice,
    invoiceRows,
    organizationSettings,
  ] = await Promise.all([
    db
      .select()
      .from(monthlyOperationalSnapshots)
      .where(eq(monthlyOperationalSnapshots.organizationId, organizationId))
      .orderBy(asc(monthlyOperationalSnapshots.periodStart)),
    db
      .select({ stage: jobs.stage, total: count() })
      .from(jobs)
      .where(
        and(eq(jobs.organizationId, organizationId), isNull(jobs.deletedAt))
      )
      .groupBy(jobs.stage),
    db
      .select({
        status: quotes.status,
        total: count(),
        value: sql<number>`COALESCE(SUM(${quotes.total}), 0)`,
      })
      .from(quotes)
      .where(eq(quotes.organizationId, organizationId))
      .groupBy(quotes.status),
    db
      .select({ job: jobs, contact: contacts })
      .from(jobs)
      .innerJoin(contacts, eq(jobs.contactId, contacts.id))
      .where(
        and(
          eq(jobs.organizationId, organizationId),
          isNull(jobs.deletedAt),
          eq(jobs.stage, "ready_for_invoicing")
        )
      )
      .orderBy(asc(jobs.readyForInvoiceAt)),
    db
      .select({
        total: count(),
        value: sql<number>`COALESCE(SUM(${quotes.total}), 0)`,
      })
      .from(invoiceLinks)
      .leftJoin(jobs, eq(invoiceLinks.jobId, jobs.id))
      .leftJoin(quotes, eq(quotes.jobId, jobs.id))
      .where(
        and(
          eq(invoiceLinks.organizationId, organizationId),
          eq(invoiceLinks.status, "linked")
        )
      ),
    db
      .select()
      .from(appSettings)
      .where(eq(appSettings.organizationId, organizationId))
      .limit(1),
  ]);
  return {
    snapshots,
    stageRows,
    quoteRows,
    readyForInvoice,
    invoiceRows: invoiceRows[0],
    settings: organizationSettings[0],
  };
}

export async function getStagingReadiness(organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const releases = await db
    .select()
    .from(environmentReleases)
    .where(eq(environmentReleases.organizationId, organizationId))
    .orderBy(desc(environmentReleases.deployedAt));
  const checks = releases.length
    ? await db
        .select()
        .from(releaseChecks)
        .where(eq(releaseChecks.releaseId, releases[0]!.id))
        .orderBy(asc(releaseChecks.category))
    : [];
  return { releases, checks };
}

export async function createJob(
  organizationId: number,
  userId: number,
  input: {
    jobNumber: string;
    title: string;
    description: string;
    contactId: number;
    serviceAddress: string;
    priority?: "routine" | "standard" | "urgent" | "critical";
    foremanId?: number;
    scheduledStart?: Date;
    scheduledEnd?: Date;
  }
) {
  return withTransaction(async tx => {
    await assertScopedEntity(
      tx,
      contacts,
      organizationId,
      input.contactId,
      "Contact",
      true
    );
    await assertActiveWorkspaceMember(
      tx,
      organizationId,
      input.foremanId,
      "Assigned foreman"
    );
    if (
      input.scheduledStart &&
      input.scheduledEnd &&
      input.scheduledEnd <= input.scheduledStart
    )
      throw new Error("Scheduled end must be after scheduled start");
    const result = await tx.insert(jobs).values({
      ...input,
      organizationId,
      stage: "scheduled",
      createdBy: userId,
      updatedBy: userId,
    });
    const id = Number(result[0].insertId);
    if (input.foremanId && input.scheduledStart && input.scheduledEnd)
      await tx.insert(jobVisits).values({
        organizationId,
        jobId: id,
        foremanId: input.foremanId,
        scheduledStart: input.scheduledStart,
        scheduledEnd: input.scheduledEnd,
        status: "scheduled",
        notes: "Created from office dispatch.",
      });
    await tx.insert(activityLogs).values({
      organizationId,
      actorId: userId,
      action: "created",
      entityType: "job",
      entityId: id,
      summary: `${input.jobNumber} created and added to dispatch`,
    });
    return id;
  });
}

const jobStageTransitions: Record<string, string[]> = {
  scheduled: ["in_progress", "on_hold", "cancelled"],
  in_progress: ["on_hold", "ready_for_invoicing", "cancelled"],
  on_hold: ["scheduled", "in_progress", "cancelled"],
  ready_for_invoicing: ["invoiced", "in_progress", "cancelled"],
  invoiced: [],
  cancelled: [],
};
export const FOREMAN_TIME_CORRECTION_WINDOW_MS = 24 * 60 * 60 * 1000;

export function assertForemanTimeWindow(occurredAt: Date, now = new Date()) {
  if (occurredAt.getTime() < now.getTime() - FOREMAN_TIME_CORRECTION_WINDOW_MS)
    throw new Error(
      "Field time corrections may not be backdated by more than 24 hours"
    );
  if (occurredAt.getTime() > now.getTime() + 5 * 60 * 1000)
    throw new Error(
      "Field time cannot be recorded more than five minutes in the future"
    );
}

export function publicForemanQuoteResponse(
  quoteId: number,
  quoteNumber: string,
  status:
    "draft" | "needs_pricing" | "sent" | "accepted" | "declined" | "expired"
) {
  return { quoteId, quoteNumber, status };
}

export function normalizeInvoiceReference(invoiceNumber: string) {
  const normalized = invoiceNumber.trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9/_-]{2,79}$/.test(normalized))
    throw new Error(
      "Invoice reference must contain 3–80 letters, numbers, hyphens, underscores, or slashes"
    );
  return normalized;
}

export async function transitionJobStage(
  organizationId: number,
  userId: number,
  jobId: number,
  stage:
    | "scheduled"
    | "in_progress"
    | "on_hold"
    | "ready_for_invoicing"
    | "invoiced"
    | "cancelled",
  reason?: string
) {
  return withTransaction(async tx => {
    const rows = await tx
      .select({ stage: jobs.stage })
      .from(jobs)
      .where(
        and(
          eq(jobs.organizationId, organizationId),
          eq(jobs.id, jobId),
          isNull(jobs.deletedAt)
        )
      )
      .limit(1);
    const from = rows[0]?.stage;
    if (!from) throw new Error("Job not found in this workspace");
    if (!jobStageTransitions[from].includes(stage))
      throw new Error(`A job cannot move from ${from} to ${stage}`);
    if (["on_hold", "cancelled"].includes(stage) && !reason?.trim())
      throw new Error("A hold or cancellation reason is required");
    const now = new Date();
    await tx
      .update(jobs)
      .set({
        stage,
        updatedBy: userId,
        ...(stage === "on_hold" ? { holdReason: reason } : {}),
        ...(stage === "cancelled" ? { cancelReason: reason } : {}),
        ...(stage === "ready_for_invoicing"
          ? { readyForInvoiceAt: now, completedAt: now }
          : {}),
      })
      .where(and(eq(jobs.organizationId, organizationId), eq(jobs.id, jobId)));
    await tx.insert(activityLogs).values({
      organizationId,
      actorId: userId,
      action: "stage_changed",
      entityType: "job",
      entityId: jobId,
      summary: `Job stage changed from ${from.replace(/_/g, " ")} to ${stage.replace(/_/g, " ")}`,
    });
  });
}

export async function linkExternalInvoice(
  organizationId: number,
  userId: number,
  jobId: number,
  invoiceNumber: string
) {
  return withTransaction(async tx => {
    const job = await tx
      .select({ stage: jobs.stage })
      .from(jobs)
      .where(
        and(
          eq(jobs.id, jobId),
          eq(jobs.organizationId, organizationId),
          isNull(jobs.deletedAt)
        )
      )
      .limit(1);
    if (!job[0]) throw new Error("Job is not available in this workspace");
    if (job[0].stage !== "ready_for_invoicing")
      throw new Error(
        "Only invoice-ready jobs can be linked to an external invoice"
      );
    const activeLink = await tx
      .select({ id: invoiceLinks.id })
      .from(invoiceLinks)
      .where(
        and(
          eq(invoiceLinks.organizationId, organizationId),
          eq(invoiceLinks.jobId, jobId),
          eq(invoiceLinks.status, "linked")
        )
      )
      .limit(1);
    if (activeLink[0])
      throw new Error("This job already has an active external invoice link");
    const normalizedInvoiceNumber = normalizeInvoiceReference(invoiceNumber);
    await tx.insert(invoiceLinks).values({
      organizationId,
      jobId,
      externalInvoiceNumber: normalizedInvoiceNumber,
      linkedBy: userId,
      notes: "Linked from office workflow.",
    });
    await tx
      .update(jobs)
      .set({ stage: "invoiced", updatedBy: userId })
      .where(and(eq(jobs.organizationId, organizationId), eq(jobs.id, jobId)));
    await tx.insert(activityLogs).values({
      organizationId,
      actorId: userId,
      action: "invoice_linked",
      entityType: "job",
      entityId: jobId,
      summary: `External invoice ${normalizedInvoiceNumber} linked to job`,
    });
  });
}

export async function archiveJob(
  organizationId: number,
  userId: number,
  jobId: number
) {
  return withTransaction(async tx => {
    const job = await tx
      .select({ stage: jobs.stage })
      .from(jobs)
      .where(
        and(
          eq(jobs.organizationId, organizationId),
          eq(jobs.id, jobId),
          isNull(jobs.deletedAt)
        )
      )
      .limit(1);
    if (!job[0]) throw new Error("Job is not available in this workspace");
    if (["ready_for_invoicing", "invoiced"].includes(job[0].stage))
      throw new Error(
        "Completed or invoiced jobs are retained and cannot be deleted"
      );
    await tx
      .update(jobs)
      .set({ deletedAt: new Date(), updatedBy: userId })
      .where(and(eq(jobs.organizationId, organizationId), eq(jobs.id, jobId)));
    await tx.insert(activityLogs).values({
      organizationId,
      actorId: userId,
      action: "archived",
      entityType: "job",
      entityId: jobId,
      summary: "Job archived before completion",
    });
  });
}

async function assertAssignedForeman(
  tx: any,
  organizationId: number,
  userId: number,
  jobId: number
) {
  const row = await tx
    .select({ id: jobs.id, stage: jobs.stage, foremanId: jobs.foremanId })
    .from(jobs)
    .where(
      and(
        eq(jobs.id, jobId),
        eq(jobs.organizationId, organizationId),
        isNull(jobs.deletedAt)
      )
    )
    .limit(1);
  if (!row[0]) throw new Error("Job is not available in this workspace");
  if (row[0].foremanId !== userId)
    throw new Error("This job is not assigned to the current foreman");
  return row[0];
}

async function hasForemanConsent(
  tx: any,
  organizationId: number,
  jobId: number
) {
  const consent = await tx
    .select({ id: jobEvidence.id })
    .from(jobEvidence)
    .where(
      and(
        eq(jobEvidence.organizationId, organizationId),
        eq(jobEvidence.jobId, jobId),
        eq(jobEvidence.evidenceType, "signature")
      )
    )
    .limit(1);
  return Boolean(consent[0]);
}

async function hasCompletionEvidence(
  tx: any,
  organizationId: number,
  jobId: number
) {
  const evidence = await tx
    .select({ id: jobEvidence.id })
    .from(jobEvidence)
    .where(
      and(
        eq(jobEvidence.organizationId, organizationId),
        eq(jobEvidence.jobId, jobId)
      )
    )
    .limit(1);
  return Boolean(evidence[0]);
}

export async function getForemanToday(organizationId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .select({
      job: {
        id: jobs.id,
        jobNumber: jobs.jobNumber,
        title: jobs.title,
        description: jobs.description,
        serviceAddress: jobs.serviceAddress,
        stage: jobs.stage,
        priority: jobs.priority,
        scheduledStart: jobs.scheduledStart,
        scheduledEnd: jobs.scheduledEnd,
        checkInAt: jobs.checkInAt,
        checkOutAt: jobs.checkOutAt,
        geoStatus: jobs.geoStatus,
        holdReason: jobs.holdReason,
        cancelReason: jobs.cancelReason,
        completedAt: jobs.completedAt,
      },
      contact: { id: contacts.id, name: contacts.name, phone: contacts.phone },
      visit: jobVisits,
    })
    .from(jobs)
    .innerJoin(contacts, eq(jobs.contactId, contacts.id))
    .leftJoin(
      jobVisits,
      and(
        eq(jobVisits.jobId, jobs.id),
        eq(jobVisits.organizationId, organizationId),
        eq(jobVisits.foremanId, userId)
      )
    )
    .where(
      and(
        eq(jobs.organizationId, organizationId),
        eq(jobs.foremanId, userId),
        isNull(jobs.deletedAt),
        or(
          eq(jobs.stage, "scheduled"),
          eq(jobs.stage, "in_progress"),
          eq(jobs.stage, "on_hold")
        )
      )
    )
    .orderBy(asc(jobs.scheduledStart));
  return rows;
}

export async function recordForemanConsent(
  organizationId: number,
  userId: number,
  jobId: number,
  signerName: string,
  idempotencyKey?: string
) {
  const capturedAt = new Date();
  return withTransaction(async tx => {
    if (await checkIdempotency(tx, organizationId, idempotencyKey, "consent"))
      return { duplicate: true as const };
    await assertAssignedForeman(tx, organizationId, userId, jobId);
    const artifact = await storagePut(
      `elegex/${organizationId}/foreman-consent/${jobId}-${randomUUID()}.txt`,
      `ELEGEX FIELD CONSENT\n\nJob ID: ${jobId}\nOrganization ID: ${organizationId}\nTyped signature: ${signerName}\nCaptured at (UTC): ${capturedAt.toISOString()}\n\nThis immutable synthetic demo artifact records a typed consent acknowledgement.`,
      "text/plain"
    );
    const result = await tx.insert(jobEvidence).values({
      organizationId,
      jobId,
      evidenceType: "signature",
      title: `Typed consent signature: ${signerName}`,
      storageUrl: artifact.url,
      capturedBy: userId,
      capturedAt,
      syncStatus: "synced",
      metadata: {
        workflow: "foreman_consent",
        signatureMethod: "typed_name",
        signerName,
        capturedAt: capturedAt.toISOString(),
        storageKey: artifact.key,
      },
    });
    await tx.insert(activityLogs).values({
      organizationId,
      actorId: userId,
      action: "consent_recorded",
      entityType: "job",
      entityId: jobId,
      summary: `Consent recorded for field visit by ${signerName}`,
    });
    return Number(result[0].insertId);
  });
}

async function checkIdempotency(
  tx: any,
  organizationId: number,
  idempotencyKey: string | undefined,
  mutationType: string
) {
  if (!idempotencyKey) return false;

  // A single INSERT IGNORE is the concurrency-safe claim operation. The unique
  // (organizationId, idempotencyKey) index ensures that only one transaction can
  // execute the associated business mutation, even if a mobile queue is replayed.
  const result = await tx
    .insert(syncLogs)
    .values({ organizationId, idempotencyKey, mutationType })
    .onDuplicateKeyUpdate({
      set: { idempotencyKey: sql`${syncLogs.idempotencyKey}` },
    });
  return Number(result[0].affectedRows) === 0;
}

export async function foremanCheckIn(
  organizationId: number,
  userId: number,
  jobId: number,
  idempotencyKey?: string,
  occurredAt = new Date()
) {
  return withTransaction(async tx => {
    if (await checkIdempotency(tx, organizationId, idempotencyKey, "checkIn"))
      return;
    const job = await assertAssignedForeman(tx, organizationId, userId, jobId);
    if (!["scheduled", "on_hold", "in_progress"].includes(job.stage))
      throw new Error("This job cannot be checked in from its current stage");
    if (!(await hasForemanConsent(tx, organizationId, jobId)))
      throw new Error("Customer consent must be recorded before check-in");
    assertForemanTimeWindow(occurredAt);
    await tx
      .update(jobs)
      .set({
        stage: "in_progress",
        checkInAt: occurredAt,
        geoStatus: "manual_override",
        updatedBy: userId,
      })
      .where(and(eq(jobs.id, jobId), eq(jobs.organizationId, organizationId)));
    await tx
      .update(jobVisits)
      .set({ status: "on_site", geoStatus: "manual_override" })
      .where(
        and(
          eq(jobVisits.organizationId, organizationId),
          eq(jobVisits.jobId, jobId),
          eq(jobVisits.foremanId, userId)
        )
      );
    await tx.insert(activityLogs).values({
      organizationId,
      actorId: userId,
      action: "checked_in",
      entityType: "job",
      entityId: jobId,
      summary: "Foreman checked in on site",
    });
  });
}

export async function addForemanMaterial(
  organizationId: number,
  userId: number,
  input: {
    jobId: number;
    description: string;
    quantity: number;
    unit: string;
    idempotencyKey?: string;
  }
) {
  return withTransaction(async tx => {
    if (
      await checkIdempotency(
        tx,
        organizationId,
        input.idempotencyKey,
        "material"
      )
    )
      return 0;
    const job = await assertAssignedForeman(
      tx,
      organizationId,
      userId,
      input.jobId
    );
    if (job.stage !== "in_progress")
      throw new Error(
        "Materials can only be recorded during an active field visit"
      );
    const result = await tx.insert(jobMaterials).values({
      organizationId,
      jobId: input.jobId,
      description: input.description,
      quantity: input.quantity,
      unit: input.unit,
      source: "free_text",
      unitPrice: 0,
    });
    await tx.insert(activityLogs).values({
      organizationId,
      actorId: userId,
      action: "material_recorded",
      entityType: "job",
      entityId: input.jobId,
      summary: `Field material recorded: ${input.description}`,
    });
    return Number(result[0].insertId);
  });
}

export async function captureForemanEvidence(
  organizationId: number,
  userId: number,
  input: {
    jobId: number;
    evidenceType:
      "before_photo" | "after_photo" | "note" | "job_card" | "signature";
    title: string;
    note?: string;
    media?: { fileName: string; mimeType: string; bytes: Buffer };
    idempotencyKey?: string;
  }
) {
  return withTransaction(async tx => {
    if (
      await checkIdempotency(
        tx,
        organizationId,
        input.idempotencyKey,
        "evidence"
      )
    )
      return 0;
    const job = await assertAssignedForeman(
      tx,
      organizationId,
      userId,
      input.jobId
    );
    if (job.stage !== "in_progress")
      throw new Error(
        "Evidence can only be recorded during an active field visit"
      );
    const fieldMedia = input.media;
    const artifact = fieldMedia
      ? await (async () => {
          await validateUpload(
            fieldMedia.bytes,
            fieldMedia.mimeType,
            fieldMedia.fileName
          );
          return storagePut(
            `elegex/${organizationId}/foreman-evidence/${job.id}-${randomUUID()}-${fieldMedia.fileName}`,
            fieldMedia.bytes,
            fieldMedia.mimeType
          );
        })()
      : null;
    const result = await tx.insert(jobEvidence).values({
      organizationId,
      jobId: input.jobId,
      evidenceType: input.evidenceType,
      title: input.title,
      storageUrl: artifact?.url,
      capturedBy: userId,
      syncStatus: "synced",
      metadata: {
        workflow: "foreman_capture",
        note: input.note || null,
        ...(artifact ? { storageKey: artifact.key, mediaUploaded: true } : {}),
      },
    });
    await tx.insert(activityLogs).values({
      organizationId,
      actorId: userId,
      action: "evidence_captured",
      entityType: "job",
      entityId: input.jobId,
      summary: `Field evidence captured: ${input.title}`,
    });
    return Number(result[0].insertId);
  });
}

export async function captureForemanQuote(
  organizationId: number,
  userId: number,
  input: {
    jobId: number;
    quoteNumber: string;
    idempotencyKey?: string;
  }
) {
  return withTransaction(async tx => {
    if (
      await checkIdempotency(tx, organizationId, input.idempotencyKey, "quote")
    )
      return { duplicate: true as const };
    const job = await assertAssignedForeman(
      tx,
      organizationId,
      userId,
      input.jobId
    );
    if (job.stage !== "in_progress")
      throw new Error(
        "Quotes can only be captured during an active field visit"
      );
    const result = await tx.insert(quotes).values({
      organizationId,
      jobId: input.jobId,
      quoteNumber: input.quoteNumber,
      status: "draft",
      assessedAt: new Date(),
      total: 0,
      createdBy: userId,
    });
    const quoteId = Number(result[0].insertId);
    await tx.insert(quoteItems).values({
      quoteId,
      description: "Field scope awaiting office commercial review",
      quantity: 1,
      unitPrice: 0,
      total: 0,
      source: "free_text",
    });
    await tx.insert(activityLogs).values({
      organizationId,
      actorId: userId,
      action: "quote_captured",
      entityType: "job",
      entityId: input.jobId,
      summary: `Field quote ${input.quoteNumber} captured as draft`,
    });
    return publicForemanQuoteResponse(quoteId, input.quoteNumber, "draft");
  });
}

export async function foremanCompleteJob(
  organizationId: number,
  userId: number,
  jobId: number,
  idempotencyKey?: string,
  completedAt = new Date(),
  exceptionReason?: string
) {
  return withTransaction(async tx => {
    if (
      await checkIdempotency(tx, organizationId, idempotencyKey, "completeJob")
    )
      return;
    const job = await assertAssignedForeman(tx, organizationId, userId, jobId);
    if (job.stage !== "in_progress")
      throw new Error(
        "Only an in-progress job can be completed from the foreman workflow"
      );
    if (
      !(await hasCompletionEvidence(tx, organizationId, jobId)) &&
      !exceptionReason?.trim()
    )
      throw new Error(
        "Capture field evidence or record a completion exception reason before handoff"
      );
    assertForemanTimeWindow(completedAt);
    await tx
      .update(jobs)
      .set({
        stage: "ready_for_invoicing",
        checkOutAt: completedAt,
        completedAt,
        readyForInvoiceAt: completedAt,
        updatedBy: userId,
      })
      .where(and(eq(jobs.id, jobId), eq(jobs.organizationId, organizationId)));
    await tx
      .update(jobVisits)
      .set({ status: "complete" })
      .where(
        and(
          eq(jobVisits.organizationId, organizationId),
          eq(jobVisits.jobId, jobId),
          eq(jobVisits.foremanId, userId)
        )
      );
    await tx.insert(activityLogs).values({
      organizationId,
      actorId: userId,
      action: "foreman_completed",
      entityType: "job",
      entityId: jobId,
      summary: exceptionReason?.trim()
        ? `Foreman completed job with documented exception: ${exceptionReason.trim()}`
        : "Foreman completed job and submitted it for invoicing review",
      metadata: { completionException: exceptionReason?.trim() || null },
    });
  });
}

export async function createDocumentRecord(
  organizationId: number,
  userId: number,
  input: {
    projectId?: number;
    caseId?: number;
    contactId?: number;
    documentType?:
      | "coc"
      | "quote"
      | "invoice"
      | "job_card"
      | "photo_evidence"
      | "material_list"
      | "compliance_cert"
      | "site_report";
    retentionYears?: number;
    classificationLevel?: "public" | "internal" | "confidential" | "restricted";
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    storageKey: string;
    storageUrl: string;
  }
) {
  return withTransaction(async tx => {
    assertSingleDocumentTarget(input);
    await assertScopedEntity(
      tx,
      contacts,
      organizationId,
      input.contactId,
      "Contact",
      true
    );
    await assertScopedEntity(
      tx,
      projects,
      organizationId,
      input.projectId,
      "Project",
      true
    );
    await assertScopedEntity(
      tx,
      cases,
      organizationId,
      input.caseId,
      "Case",
      true
    );
    const result = await tx.insert(documents).values({
      documentType: input.documentType ?? "site_report",
      retentionYears: input.retentionYears ?? 7,
      classificationLevel: input.classificationLevel ?? "internal",
      ...input,
      organizationId,
      uploadedBy: userId,
    });
    const id = Number(result[0].insertId);
    await tx.insert(activityLogs).values({
      organizationId,
      actorId: userId,
      action: "uploaded",
      entityType: "document",
      entityId: id,
      summary: `Uploaded ${input.fileName}`,
    });
    return id;
  });
}

/**
 * Recognizes both the vendor-neutral current storage route and the retained
 * legacy compatibility route. The object key remains mandatory so arbitrary
 * external URLs never become downloadable application documents.
 */
export function isManagedStorageUrl(url?: string | null) {
  return Boolean(
    url && (url.startsWith("/storage/") || url.startsWith("/manus-storage/"))
  );
}

export function getDocumentHealth(document: {
  storageKey?: string | null;
  storageUrl?: string | null;
}) {
  return document.storageKey && isManagedStorageUrl(document.storageUrl)
    ? ("available" as const)
    : ("unavailable" as const);
}

export async function listDocuments(
  organizationId: number,
  resource?: "contact" | "project" | "case",
  recordId?: number,
  documentType?:
    | "coc"
    | "quote"
    | "invoice"
    | "job_card"
    | "photo_evidence"
    | "material_list"
    | "compliance_cert"
    | "site_report"
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  if (Boolean(resource) !== Boolean(recordId))
    throw new Error(
      "Document resource and record ID must be supplied together"
    );
  const relation =
    resource === "contact"
      ? eq(documents.contactId, recordId!)
      : resource === "project"
        ? eq(documents.projectId, recordId!)
        : resource === "case"
          ? eq(documents.caseId, recordId!)
          : undefined;
  const rows = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.organizationId, organizationId),
        relation,
        documentType ? eq(documents.documentType, documentType) : undefined
      )
    )
    .orderBy(desc(documents.createdAt));
  return rows.map(document => ({
    ...document,
    health: getDocumentHealth(document),
  }));
}

export type DemoResetDependencies = {
  database?: any;
  seedWorkspace?: (organizationId: number, userId: number) => Promise<void>;
  seedFieldService?: (organizationId: number, userId: number) => Promise<void>;
};

export async function resetDemoData(
  organizationId: number,
  userId: number,
  dependencies: DemoResetDependencies = {}
) {
  const reset = async (db: any) => {
    const releases = await db
      .select({ id: environmentReleases.id })
      .from(environmentReleases)
      .where(eq(environmentReleases.organizationId, organizationId));
    const tenantQuotes = await db
      .select({ id: quotes.id })
      .from(quotes)
      .where(eq(quotes.organizationId, organizationId));
    for (const release of releases)
      await db
        .delete(releaseChecks)
        .where(eq(releaseChecks.releaseId, release.id));
    for (const quote of tenantQuotes)
      await db.delete(quoteItems).where(eq(quoteItems.quoteId, quote.id));
    await db
      .delete(integrationEvents)
      .where(eq(integrationEvents.organizationId, organizationId));
    await db
      .delete(integrationConnections)
      .where(eq(integrationConnections.organizationId, organizationId));
    await db
      .delete(environmentReleases)
      .where(eq(environmentReleases.organizationId, organizationId));
    await db
      .delete(invoiceLinks)
      .where(eq(invoiceLinks.organizationId, organizationId));
    await db
      .delete(jobEvidence)
      .where(eq(jobEvidence.organizationId, organizationId));
    await db
      .delete(jobMaterials)
      .where(eq(jobMaterials.organizationId, organizationId));
    await db
      .delete(jobVisits)
      .where(eq(jobVisits.organizationId, organizationId));
    await db.delete(quotes).where(eq(quotes.organizationId, organizationId));
    await db
      .delete(monthlyOperationalSnapshots)
      .where(eq(monthlyOperationalSnapshots.organizationId, organizationId));
    await db.delete(jobs).where(eq(jobs.organizationId, organizationId));
    await db
      .delete(documents)
      .where(eq(documents.organizationId, organizationId));
    await db
      .delete(notifications)
      .where(eq(notifications.organizationId, organizationId));
    await db
      .delete(savedViews)
      .where(eq(savedViews.organizationId, organizationId));
    await db
      .delete(activityLogs)
      .where(eq(activityLogs.organizationId, organizationId));
    await db.delete(tasks).where(eq(tasks.organizationId, organizationId));
    await db.delete(cases).where(eq(cases.organizationId, organizationId));
    await db
      .delete(projects)
      .where(eq(projects.organizationId, organizationId));
    await db
      .delete(contacts)
      .where(eq(contacts.organizationId, organizationId));
    await db
      .delete(appSettings)
      .where(eq(appSettings.organizationId, organizationId));
    if (dependencies.seedWorkspace)
      await dependencies.seedWorkspace(organizationId, userId);
    else await seedDemoWorkspace(organizationId, userId, db);
    if (dependencies.seedFieldService)
      await dependencies.seedFieldService(organizationId, userId);
    else await seedFieldServiceDemo(organizationId, userId, db);
  };
  if (dependencies.database) {
    if (typeof dependencies.database.transaction === "function")
      return dependencies.database.transaction(reset);
    return reset(dependencies.database);
  }
  return withTransaction(reset);
}

export type DemoPersonaSeed = {
  openId: string;
  name: string;
  email: string;
  role: OrganizationRole;
  title: string;
};

/** Creates or restores a real, role-scoped user in the isolated synthetic demo tenant. */
export async function ensureDemoPersona(persona: DemoPersonaSeed) {
  await upsertUser({
    openId: "demo:owner",
    name: "Alex Morgan",
    email: "owner@demo.elegex.app",
    loginMethod: "demo",
  });
  const owner = await getUserByOpenId("demo:owner");
  if (!owner) throw new Error("Demo owner could not be provisioned");
  const tenant = await ensureTenantScope(owner.id);

  await upsertUser({
    openId: persona.openId,
    name: persona.name,
    email: persona.email,
    loginMethod: "demo",
  });
  const user = await getUserByOpenId(persona.openId);
  if (!user) throw new Error("Demo persona could not be provisioned");

  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db
    .insert(organizationMembers)
    .values({
      organizationId: tenant.organizationId,
      userId: user.id,
      role: persona.role,
      title: persona.title,
      isActive: true,
    })
    .onDuplicateKeyUpdate({
      set: { role: persona.role, title: persona.title, isActive: true },
    });
  return user;
}

export type AiUsageRecord = {
  organizationId: number;
  userId: number;
  feature: "job_summary" | "quote_draft" | "evidence_caption";
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostMicros: number;
  requestId?: string | null;
};

export async function recordAiUsage(record: AiUsageRecord) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(aiUsage).values(record);
  await logActivity(
    record.organizationId,
    record.userId,
    "generated",
    "ai_draft",
    null,
    `Generated a human-review-required ${record.feature.replace("_", " ")} draft`
  );
}

export async function getAiTokenUsageLast24Hours(organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .select({
      tokens: sql<number>`coalesce(sum(${aiUsage.inputTokens} + ${aiUsage.outputTokens}), 0)`,
    })
    .from(aiUsage)
    .where(
      and(
        eq(aiUsage.organizationId, organizationId),
        sql`${aiUsage.createdAt} >= date_sub(now(), interval 1 day)`
      )
    );
  return Number(rows[0]?.tokens ?? 0);
}
