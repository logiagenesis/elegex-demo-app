import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required to seed the Elegex demo workspace.");

const connection = await mysql.createConnection(databaseUrl);
const ownerOpenId = process.env.SEED_OPEN_ID || process.env.OWNER_OPEN_ID || "elegex-demo-owner";
const ownerName = process.env.SEED_OWNER_NAME || "Demo Workspace Owner";
const ownerEmail = process.env.SEED_OWNER_EMAIL || "owner@elegex.demo";

try {
  await connection.execute(
    "INSERT INTO users (openId, name, email, loginMethod, role) VALUES (?, ?, ?, 'demo', 'admin') ON DUPLICATE KEY UPDATE name = VALUES(name), email = VALUES(email)",
    [ownerOpenId, ownerName, ownerEmail],
  );
  const [[owner]] = await connection.execute("SELECT id FROM users WHERE openId = ? LIMIT 1", [ownerOpenId]);
  const [existingOrganizations] = await connection.execute("SELECT id FROM organizations WHERE slug = 'elegex-demo' LIMIT 1");
  let organizationId;
  if (existingOrganizations.length) {
    organizationId = existingOrganizations[0].id;
  } else {
    const [result] = await connection.execute(
      "INSERT INTO organizations (name, slug, industry, primaryColor, timezone, createdBy) VALUES ('Elegex Operations', 'elegex-demo', 'Professional services', '#195FE6', 'Africa/Johannesburg', ?)",
      [owner.id],
    );
    organizationId = result.insertId;
  }
  await connection.execute(
    "INSERT INTO organizationMembers (organizationId, userId, role, title) VALUES (?, ?, 'owner', 'Workspace Owner') ON DUPLICATE KEY UPDATE title = VALUES(title), isActive = true",
    [organizationId, owner.id],
  );
  const team = [
    ["elegex-demo-mila", "Mila Petersen", "mila.petersen@elegex.demo", "manager", "Operations Manager"],
    ["elegex-demo-jordan", "Jordan Okoro", "jordan.okoro@elegex.demo", "member", "Project Lead"],
    ["elegex-demo-sana", "Sana Davids", "sana.davids@elegex.demo", "viewer", "Finance Reviewer"],
  ];
  for (const [openId, name, email, role, title] of team) {
    await connection.execute("INSERT INTO users (openId, name, email, loginMethod, role) VALUES (?, ?, ?, 'demo', 'user') ON DUPLICATE KEY UPDATE name = VALUES(name), email = VALUES(email)", [openId, name, email]);
    const [[user]] = await connection.execute("SELECT id FROM users WHERE openId = ? LIMIT 1", [openId]);
    await connection.execute("INSERT INTO organizationMembers (organizationId, userId, role, title) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE role = VALUES(role), title = VALUES(title), isActive = true", [organizationId, user.id, role, title]);
  }
  await connection.execute("INSERT INTO appSettings (organizationId, updatedBy) VALUES (?, ?) ON DUPLICATE KEY UPDATE updatedBy = VALUES(updatedBy)", [organizationId, owner.id]);
  const [[existingContacts]] = await connection.execute("SELECT COUNT(*) AS total FROM contacts WHERE organizationId = ?", [organizationId]);
  if (!existingContacts.total) {
    const contactRows = [
      ["Aisha Naidoo", "Northstar Properties", "aisha@northstarproperties.co.za", "+27 21 555 0193", "Cape Town", "active", "Primary portfolio contact. Prefers concise Friday updates."],
      ["Lucas Mthembu", "Cedar Health Group", "lucas@cedarhealth.co.za", "+27 31 880 1224", "Durban", "active", "Stakeholder for the digital intake programme."],
      ["Elena Meyer", "Helio Retail", "elena@helioretail.co.za", "+27 11 322 8900", "Johannesburg", "lead", "Exploring a phased service rollout in Q4."],
      ["Tendai Ncube", "Arbor Logistics", "tendai@arborlogistics.co.za", "+27 21 742 4371", "Cape Town", "active", "Monthly steering review on the first Wednesday."],
    ];
    for (const row of contactRows) await connection.execute("INSERT INTO contacts (organizationId, name, company, email, phone, location, status, notes, createdBy, updatedBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [organizationId, ...row, owner.id, owner.id]);
    const [contacts] = await connection.execute("SELECT id FROM contacts WHERE organizationId = ? ORDER BY id", [organizationId]);
    const projectRows = [
      [contacts[0].id, "Harbourview Portfolio Transition", "HV-024", "Coordinate the operational transition across the Harbourview property portfolio.", "active", "high", 480000, 72],
      [contacts[1].id, "Cedar Digital Intake", "CD-118", "Design and launch a compliant client intake workflow for Cedar Health Group.", "active", "urgent", 365000, 48],
      [contacts[2].id, "Helio Store Standards", "HS-071", "Discovery engagement for a scalable retail standards programme.", "planning", "medium", 275000, 12],
      [contacts[3].id, "Arbor Service Recovery", "AS-053", "Resolve service exceptions and establish a sustainable operating rhythm.", "on_hold", "high", 190000, 36],
    ];
    for (const row of projectRows) await connection.execute("INSERT INTO projects (organizationId, contactId, name, code, description, status, priority, budget, progress, createdBy, updatedBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [organizationId, ...row, owner.id, owner.id]);
    const [projects] = await connection.execute("SELECT id FROM projects WHERE organizationId = ? ORDER BY id", [organizationId]);
    const taskRows = [
      [projects[0].id, "Confirm access matrix with Northstar", "Close the remaining owner access questions before the readiness review.", "in_progress", "high"],
      [projects[1].id, "Prepare Cedar intake prototype", "Share the updated prototype with Cedar’s review team.", "todo", "urgent"],
      [projects[2].id, "Document Helio discovery outputs", "Consolidate workshop outputs into the planning brief.", "todo", "medium"],
      [projects[3].id, "Resolve Arbor service exception", "Align the response package and recovery timeline with the client.", "blocked", "urgent"],
    ];
    for (const row of taskRows) await connection.execute("INSERT INTO tasks (organizationId, projectId, title, description, status, priority, assigneeId, createdBy, updatedBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [organizationId, ...row, owner.id, owner.id, owner.id]);
    await connection.execute("INSERT INTO cases (organizationId, contactId, projectId, reference, title, summary, status, severity, ownerId, createdBy, updatedBy) VALUES (?, ?, ?, 'CS-2041', 'Harbourview stakeholder access review', 'Validate stakeholder access ahead of the phase-two handover.', 'investigating', 'high', ?, ?, ?)", [organizationId, contacts[0].id, projects[0].id, owner.id, owner.id, owner.id]);
    await connection.execute("INSERT INTO activityLogs (organizationId, actorId, action, entityType, summary) VALUES (?, ?, 'seeded', 'workspace', 'Realistic Elegex demonstration workspace seeded')", [organizationId, owner.id]);
  }
  await connection.execute("UPDATE tasks SET dueDate = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 3 DAY) WHERE organizationId = ? AND dueDate IS NULL", [organizationId]);
  const [[savedView]] = await connection.execute("SELECT COUNT(*) AS total FROM savedViews WHERE organizationId = ?", [organizationId]);
  if (!savedView.total) await connection.execute("INSERT INTO savedViews (organizationId, userId, name, resource, filters, isShared) VALUES (?, ?, 'Priority delivery work', 'reports', JSON_OBJECT('dataset', 'projects', 'priority', JSON_ARRAY('high', 'urgent')), true)", [organizationId, owner.id]);
  const [[notification]] = await connection.execute("SELECT COUNT(*) AS total FROM notifications WHERE organizationId = ? AND userId = ?", [organizationId, owner.id]);
  if (!notification.total) await connection.execute("INSERT INTO notifications (organizationId, userId, type, title, description, href) VALUES (?, ?, 'system', 'Your Elegex workspace is ready', 'Explore live records, reports, and administration controls.', '/')", [organizationId, owner.id]);
  console.log(`Elegex demonstration workspace is ready (organization ${organizationId}).`);
} finally {
  connection.destroy();
}
