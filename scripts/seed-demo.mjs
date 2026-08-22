import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl)
  throw new Error(
    "DATABASE_URL is required to seed the Elegex demo workspace."
  );

const connection = await mysql.createConnection(databaseUrl);
const ownerOpenId =
  process.env.SEED_OPEN_ID || process.env.OWNER_OPEN_ID || "elegex-demo-owner";
const ownerName = process.env.SEED_OWNER_NAME || "Demo Workspace Owner";
const ownerEmail = process.env.SEED_OWNER_EMAIL || "owner@elegex.demo";

try {
  await connection.execute(
    "INSERT INTO users (openId, name, email, loginMethod, role) VALUES (?, ?, ?, 'demo', 'admin') ON DUPLICATE KEY UPDATE name = VALUES(name), email = VALUES(email)",
    [ownerOpenId, ownerName, ownerEmail]
  );
  const [[owner]] = await connection.execute(
    "SELECT id FROM users WHERE openId = ? LIMIT 1",
    [ownerOpenId]
  );
  const [existingOrganizations] = await connection.execute(
    "SELECT id FROM organizations WHERE slug = 'elegex-demo' LIMIT 1"
  );
  let organizationId;
  if (existingOrganizations.length) {
    organizationId = existingOrganizations[0].id;
  } else {
    const [result] = await connection.execute(
      "INSERT INTO organizations (name, slug, industry, primaryColor, timezone, createdBy) VALUES ('Elegex Operations', 'elegex-demo', 'Professional services', '#195FE6', 'Africa/Johannesburg', ?)",
      [owner.id]
    );
    organizationId = result.insertId;
  }
  await connection.execute(
    "INSERT INTO organizationMembers (organizationId, userId, role, title) VALUES (?, ?, 'owner', 'Workspace Owner') ON DUPLICATE KEY UPDATE title = VALUES(title), isActive = true",
    [organizationId, owner.id]
  );
  const team = [
    [
      "elegex-demo-mila",
      "Mila Petersen",
      "mila.petersen@elegex.demo",
      "manager",
      "Operations Manager",
    ],
    [
      "elegex-demo-jordan",
      "Jordan Okoro",
      "jordan.okoro@elegex.demo",
      "member",
      "Project Lead",
    ],
    [
      "elegex-demo-sana",
      "Sana Davids",
      "sana.davids@elegex.demo",
      "viewer",
      "Finance Reviewer",
    ],
  ];
  for (const [openId, name, email, role, title] of team) {
    await connection.execute(
      "INSERT INTO users (openId, name, email, loginMethod, role) VALUES (?, ?, ?, 'demo', 'user') ON DUPLICATE KEY UPDATE name = VALUES(name), email = VALUES(email)",
      [openId, name, email]
    );
    const [[user]] = await connection.execute(
      "SELECT id FROM users WHERE openId = ? LIMIT 1",
      [openId]
    );
    await connection.execute(
      "INSERT INTO organizationMembers (organizationId, userId, role, title) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE role = VALUES(role), title = VALUES(title), isActive = true",
      [organizationId, user.id, role, title]
    );
  }
  await connection.execute(
    "INSERT INTO appSettings (organizationId, updatedBy) VALUES (?, ?) ON DUPLICATE KEY UPDATE updatedBy = VALUES(updatedBy)",
    [organizationId, owner.id]
  );
  const [[existingContacts]] = await connection.execute(
    "SELECT COUNT(*) AS total FROM contacts WHERE organizationId = ?",
    [organizationId]
  );
  if (!existingContacts.total) {
    const contactRows = [
      [
        "Aisha Naidoo",
        "Northstar Properties",
        "aisha@northstar.demo",
        "+1 555 014 0193",
        "North District",
        "active",
        "Primary portfolio contact. Prefers concise Friday updates.",
      ],
      [
        "Lucas Mthembu",
        "Cedar Health Group",
        "lucas@cedarhealth.demo",
        "+1 555 014 1224",
        "South District",
        "active",
        "Stakeholder for the digital intake programme.",
      ],
      [
        "Elena Meyer",
        "Helio Retail",
        "elena@helioretail.demo",
        "+1 555 014 8900",
        "Central Quarter",
        "lead",
        "Exploring a phased service rollout in Q4.",
      ],
      [
        "Tendai Ncube",
        "Arbor Logistics",
        "tendai@arborlogistics.demo",
        "+1 555 014 4371",
        "East District",
        "active",
        "Monthly steering review on the first Wednesday.",
      ],
    ];
    for (const row of contactRows)
      await connection.execute(
        "INSERT INTO contacts (organizationId, name, company, email, phone, location, status, notes, createdBy, updatedBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [organizationId, ...row, owner.id, owner.id]
      );
    const [contacts] = await connection.execute(
      "SELECT id FROM contacts WHERE organizationId = ? ORDER BY id",
      [organizationId]
    );
    const projectRows = [
      [
        contacts[0].id,
        "Harbourview Portfolio Transition",
        "HV-024",
        "Coordinate the operational transition across the Harbourview property portfolio.",
        "active",
        "high",
        480000,
        72,
      ],
      [
        contacts[1].id,
        "Cedar Digital Intake",
        "CD-118",
        "Design and launch a compliant client intake workflow for Cedar Health Group.",
        "active",
        "urgent",
        365000,
        48,
      ],
      [
        contacts[2].id,
        "Helio Store Standards",
        "HS-071",
        "Discovery engagement for a scalable retail standards programme.",
        "planning",
        "medium",
        275000,
        12,
      ],
      [
        contacts[3].id,
        "Arbor Service Recovery",
        "AS-053",
        "Resolve service exceptions and establish a sustainable operating rhythm.",
        "on_hold",
        "high",
        190000,
        36,
      ],
    ];
    for (const row of projectRows)
      await connection.execute(
        "INSERT INTO projects (organizationId, contactId, name, code, description, status, priority, budget, progress, createdBy, updatedBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [organizationId, ...row, owner.id, owner.id]
      );
    const [projects] = await connection.execute(
      "SELECT id FROM projects WHERE organizationId = ? ORDER BY id",
      [organizationId]
    );
    const taskRows = [
      [
        projects[0].id,
        "Confirm access matrix with Northstar",
        "Close the remaining owner access questions before the readiness review.",
        "in_progress",
        "high",
      ],
      [
        projects[1].id,
        "Prepare Cedar intake prototype",
        "Share the updated prototype with Cedar’s review team.",
        "todo",
        "urgent",
      ],
      [
        projects[2].id,
        "Document Helio discovery outputs",
        "Consolidate workshop outputs into the planning brief.",
        "todo",
        "medium",
      ],
      [
        projects[3].id,
        "Resolve Arbor service exception",
        "Align the response package and recovery timeline with the client.",
        "blocked",
        "urgent",
      ],
    ];
    for (const row of taskRows)
      await connection.execute(
        "INSERT INTO tasks (organizationId, projectId, title, description, status, priority, assigneeId, createdBy, updatedBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [organizationId, ...row, owner.id, owner.id, owner.id]
      );
    await connection.execute(
      "INSERT INTO cases (organizationId, contactId, projectId, reference, title, summary, status, severity, ownerId, createdBy, updatedBy) VALUES (?, ?, ?, 'CS-2041', 'Harbourview stakeholder access review', 'Validate stakeholder access ahead of the phase-two handover.', 'investigating', 'high', ?, ?, ?)",
      [
        organizationId,
        contacts[0].id,
        projects[0].id,
        owner.id,
        owner.id,
        owner.id,
      ]
    );
    await connection.execute(
      "INSERT INTO activityLogs (organizationId, actorId, action, entityType, summary) VALUES (?, ?, 'seeded', 'workspace', 'Realistic Elegex demonstration workspace seeded')",
      [organizationId, owner.id]
    );
  }
  await connection.execute(
    "UPDATE tasks SET dueDate = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 3 DAY) WHERE organizationId = ? AND dueDate IS NULL",
    [organizationId]
  );
  const [[savedView]] = await connection.execute(
    "SELECT COUNT(*) AS total FROM savedViews WHERE organizationId = ?",
    [organizationId]
  );
  if (!savedView.total)
    await connection.execute(
      "INSERT INTO savedViews (organizationId, userId, name, resource, filters, isShared) VALUES (?, ?, 'Priority delivery work', 'reports', JSON_OBJECT('dataset', 'projects', 'priority', JSON_ARRAY('high', 'urgent')), true)",
      [organizationId, owner.id]
    );
  const [[notification]] = await connection.execute(
    "SELECT COUNT(*) AS total FROM notifications WHERE organizationId = ? AND userId = ?",
    [organizationId, owner.id]
  );
  if (!notification.total)
    await connection.execute(
      "INSERT INTO notifications (organizationId, userId, type, title, description, href) VALUES (?, ?, 'system', 'Your Elegex workspace is ready', 'Explore live records, reports, and administration controls.', '/')",
      [organizationId, owner.id]
    );
  const [[existingJobs]] = await connection.execute(
    "SELECT COUNT(*) AS total FROM jobs WHERE organizationId = ?",
    [organizationId]
  );
  if (!existingJobs.total) {
    const [contacts] = await connection.execute(
      "SELECT id FROM contacts WHERE organizationId = ? ORDER BY id",
      [organizationId]
    );
    const [members] = await connection.execute(
      "SELECT userId FROM organizationMembers WHERE organizationId = ? AND isActive = true ORDER BY id",
      [organizationId]
    );
    const templates = [
      [
        "DB board trip after storm",
        "Diagnose intermittent breaker trip and restore safe power to affected circuits.",
        "14 Summit Avenue, North District",
      ],
      [
        "Geyser thermostat replacement",
        "Assess heating fault, replace approved component, and capture safety evidence.",
        "3 Shoreline Road, Bayview",
      ],
      [
        "Kitchen plug-point fault",
        "Trace failed kitchen outlets and test circuit protection before handover.",
        "18 Market Street, Central Quarter",
      ],
      [
        "Pool pump isolation fault",
        "Investigate recurring pool pump trip and document recovery plan.",
        "42 Oak Avenue, Eastside",
      ],
      [
        "Emergency lighting compliance visit",
        "Complete scheduled emergency-lighting inspection and submit job-card evidence.",
        "9 Harbour Way, Waterfront",
      ],
      [
        "Extraction fan assessment",
        "Assess extraction fan replacement scope and capture pricing inputs.",
        "11 Main Road, West End",
      ],
    ];
    const now = new Date();
    for (let monthIndex = 0; monthIndex < 6; monthIndex += 1) {
      const period = new Date(
        now.getFullYear(),
        now.getMonth() - 5 + monthIndex,
        1,
        9,
        0,
        0
      );
      const currentMonth = monthIndex === 5;
      const previousMonth = monthIndex === 4;
      for (let sequence = 0; sequence < 6; sequence += 1) {
        const template =
          templates[(monthIndex * 2 + sequence) % templates.length];
        const start = new Date(
          period.getFullYear(),
          period.getMonth(),
          3 + sequence * 4,
          8 + (sequence % 3) * 2,
          0,
          0
        );
        const end = new Date(
          start.getTime() + (90 + (sequence % 3) * 30) * 60_000
        );
        const stage = currentMonth
          ? [
              "scheduled",
              "scheduled",
              "in_progress",
              "on_hold",
              "ready_for_invoicing",
              "cancelled",
            ][sequence]
          : previousMonth
            ? [
                "invoiced",
                "invoiced",
                "ready_for_invoicing",
                "invoiced",
                "on_hold",
                "cancelled",
              ][sequence]
            : [
                "invoiced",
                "invoiced",
                "invoiced",
                "invoiced",
                "invoiced",
                "cancelled",
              ][sequence];
        const jobNumber = `#${2011 + monthIndex * 6 + sequence}`;
        const completed = ["ready_for_invoicing", "invoiced"].includes(stage);
        const contact = contacts[(monthIndex + sequence) % contacts.length];
        const foreman =
          members[(monthIndex + sequence) % members.length] || owner;
        const [result] = await connection.execute(
          "INSERT INTO jobs (organizationId, contactId, jobNumber, title, description, serviceAddress, stage, priority, foremanId, scheduledStart, scheduledEnd, checkInAt, checkOutAt, geoStatus, holdReason, cancelReason, completedAt, readyForInvoiceAt, createdBy, updatedBy, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            organizationId,
            contact.id,
            jobNumber,
            template[0],
            `${template[1]} Synthetic demonstration history for the Elegex field-service workspace.`,
            template[2],
            stage,
            sequence === 2
              ? "urgent"
              : sequence === 3
                ? "critical"
                : sequence === 0
                  ? "routine"
                  : "standard",
            foreman.userId || owner.id,
            start,
            end,
            completed ? new Date(start.getTime() + 4 * 60_000) : null,
            completed ? new Date(end.getTime() - 3 * 60_000) : null,
            sequence === 3 && currentMonth
              ? "flagged"
              : completed
                ? "verified"
                : "pending",
            stage === "on_hold" ? "Awaiting specialist part approval" : null,
            stage === "cancelled"
              ? "Duplicate request confirmed by office"
              : null,
            completed ? new Date(end.getTime() - 3 * 60_000) : null,
            ["ready_for_invoicing", "invoiced"].includes(stage)
              ? new Date(end.getTime() + 12 * 60_000)
              : null,
            owner.id,
            owner.id,
            new Date(start.getTime() - 3 * 86_400_000),
          ]
        );
        const jobId = result.insertId;
        const foremanId = foreman.userId || owner.id;
        await connection.execute(
          "INSERT INTO jobVisits (organizationId, jobId, foremanId, scheduledStart, scheduledEnd, status, travelMinutes, geoStatus, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            organizationId,
            jobId,
            foremanId,
            start,
            end,
            stage === "scheduled"
              ? "scheduled"
              : stage === "in_progress"
                ? "on_site"
                : stage === "cancelled"
                  ? "cancelled"
                  : "complete",
            25 + (sequence % 3) * 10,
            completed ? "verified" : "pending",
            "Synthetic demonstration dispatch record.",
          ]
        );
        await connection.execute(
          "INSERT INTO jobMaterials (organizationId, jobId, description, quantity, unit, source, unitPrice) VALUES (?, ?, ?, ?, 'each', 'catalog', ?), (?, ?, 'Standard call-out', 1, 'visit', 'catalog', 650)",
          [
            organizationId,
            jobId,
            `Service component ${sequence + 1}`,
            1 + (sequence % 3),
            95 + sequence * 55,
            organizationId,
            jobId,
          ]
        );
        await connection.execute(
          "INSERT INTO jobEvidence (organizationId, jobId, evidenceType, title, capturedBy, capturedAt, syncStatus, metadata) VALUES (?, ?, 'before_photo', ?, ?, ?, 'synced', JSON_OBJECT('demo', true, 'label', 'Synthetic evidence metadata')), (?, ?, ?, ?, ?, ?, ?, JSON_OBJECT('demo', true, 'stage', ?))",
          [
            organizationId,
            jobId,
            `Before condition · ${jobNumber}`,
            foremanId,
            start,
            organizationId,
            jobId,
            completed ? "signature" : "note",
            completed
              ? `Client sign-off · ${jobNumber}`
              : `Office note · ${jobNumber}`,
            foremanId,
            end,
            stage === "in_progress" ? "pending_upload" : "synced",
            stage,
          ]
        );
        if (sequence === 1 || sequence === 5) {
          const quoteStatus =
            sequence === 5
              ? "needs_pricing"
              : monthIndex < 4
                ? "accepted"
                : "sent";
          const [quote] = await connection.execute(
            "INSERT INTO quotes (organizationId, jobId, quoteNumber, status, assessedAt, sentAt, respondedAt, validUntil, total, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
              organizationId,
              jobId,
              `QT-${2601 + monthIndex * 6 + sequence}`,
              quoteStatus,
              end,
              sequence === 1 ? new Date(end.getTime() + 86_400_000) : null,
              monthIndex < 4 && sequence === 1
                ? new Date(end.getTime() + 3 * 86_400_000)
                : null,
              new Date(end.getTime() + 14 * 86_400_000),
              1280 + monthIndex * 110 + sequence * 70,
              owner.id,
            ]
          );
          await connection.execute(
            "INSERT INTO quoteItems (quoteId, description, quantity, unitPrice, total, source) VALUES (?, 'Assessment and installation labour', 1, 850, 850, 'catalog'), (?, 'Service component', 1, 430, 430, 'free_text')",
            [quote.insertId, quote.insertId]
          );
        }
        if (stage === "invoiced")
          await connection.execute(
            "INSERT INTO invoiceLinks (organizationId, jobId, externalInvoiceNumber, linkedBy, linkedAt, notes) VALUES (?, ?, ?, ?, ?, ?)",
            [
              organizationId,
              jobId,
              `INV-${8701 + monthIndex * 6 + sequence}`,
              owner.id,
              new Date(end.getTime() + 2 * 86_400_000),
              "Synthetic accounting link used for demonstration.",
            ]
          );
        await connection.execute(
          "INSERT INTO activityLogs (organizationId, actorId, action, entityType, entityId, summary, createdAt) VALUES (?, ?, 'scheduled', 'job', ?, ?, ?), (?, ?, ?, 'job', ?, ?, ?)",
          [
            organizationId,
            owner.id,
            jobId,
            `${jobNumber} scheduled with assigned foreman`,
            new Date(start.getTime() - 2 * 86_400_000),
            organizationId,
            foremanId,
            completed ? "completed" : "updated",
            jobId,
            completed
              ? `${jobNumber} completed with field evidence recorded`
              : `${jobNumber} remains ${stage.replace(/_/g, " ")}`,
            end,
          ]
        );
      }
      await connection.execute(
        "INSERT INTO monthlyOperationalSnapshots (organizationId, periodStart, jobsCompleted, jobsInProgress, jobsOnHold, quotesSent, quotesAccepted, invoicesLinked, invoicedValue, firstVisitResolutionRate, customerSatisfactionIndex) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          organizationId,
          period,
          19 + monthIndex * 2,
          currentMonth ? 6 : 3,
          1 + (monthIndex % 3),
          9 + monthIndex,
          5 + monthIndex,
          16 + monthIndex * 2,
          128000 + monthIndex * 18500,
          82 + (monthIndex % 4),
          88 + (monthIndex % 5),
        ]
      );
    }
    const releases = [
      ["development", "v2.8.0-dev.14", "a12d5f7"],
      ["staging", "v2.8.0-rc.3", "c8f3a10"],
      ["production", "v2.7.4", "9db41e2"],
    ];
    for (const [environment, version, commitSha] of releases) {
      const [release] = await connection.execute(
        "INSERT INTO environmentReleases (organizationId, environment, version, commitSha, status, deployedBy, rollbackVersion, notes) VALUES (?, ?, ?, ?, 'healthy', ?, 'prior-version', 'Synthetic release evidence for the unified demo.')",
        [organizationId, environment, version, commitSha, owner.id]
      );
      if (environment === "staging")
        for (const [category, checkName] of [
          ["database", "Migration history reviewed"],
          ["api", "Protected contract suite"],
          ["ui", "Desktop and mobile smoke path"],
          ["security", "Tenant scope and RBAC gate"],
          ["observability", "Database connector health"],
        ])
          await connection.execute(
            "INSERT INTO releaseChecks (releaseId, category, checkName, status, evidence) VALUES (?, ?, ?, 'passed', 'Synthetic release evidence seeded for the demonstration workspace.')",
            [release.insertId, category, checkName]
          );
    }
  }
  console.log(
    `Elegex demonstration workspace is ready (organization ${organizationId}).`
  );
} finally {
  connection.destroy();
}
