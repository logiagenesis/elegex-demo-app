import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required for MariaDB integration verification."
  );
}

const pool = mysql.createPool(databaseUrl);
const journalUrl = new URL("../drizzle/meta/_journal.json", import.meta.url);
const journal = JSON.parse(await readFile(journalUrl, "utf8"));
const expectedMigrationCount = journal.entries.length;
const testTag = `ci-${randomUUID().slice(0, 8)}`;
let primaryOrganizationId;
let secondaryOrganizationId;
let contactId;
let clientId;
let siteId;
let jobId;

async function scalar(sql, parameters = []) {
  const [rows] = await pool.execute(sql, parameters);
  return rows[0];
}

try {
  const migrationRow = await scalar(
    "SELECT COUNT(*) AS total FROM __drizzle_migrations"
  );
  assert.equal(
    Number(migrationRow.total),
    expectedMigrationCount,
    "all committed migrations must apply"
  );

  const requiredColumns = await scalar(
    `SELECT COUNT(*) AS total
       FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND ((table_name = 'jobs' AND column_name IN ('clientId', 'siteId', 'callOutTypeId'))
          OR (table_name = 'appSettings' AND column_name IN ('locale', 'currency', 'timezone'))
          OR (table_name = 'documents' AND column_name IN ('documentType', 'retentionYears', 'classificationLevel')))`
  );
  assert.equal(Number(requiredColumns.total), 9, "required columns must exist");

  const [organizationResult] = await pool.execute(
    "INSERT INTO organizations (name, slug, createdBy) VALUES (?, ?, ?)",
    [`${testTag} primary`, `${testTag}-primary`, 1]
  );
  primaryOrganizationId = organizationResult.insertId;

  const [secondaryOrganizationResult] = await pool.execute(
    "INSERT INTO organizations (name, slug, createdBy) VALUES (?, ?, ?)",
    [`${testTag} secondary`, `${testTag}-secondary`, 1]
  );
  secondaryOrganizationId = secondaryOrganizationResult.insertId;

  const [contactResult] = await pool.execute(
    "INSERT INTO contacts (organizationId, name, createdBy, updatedBy) VALUES (?, ?, ?, ?)",
    [primaryOrganizationId, `${testTag} contact`, 1, 1]
  );
  contactId = contactResult.insertId;

  const [clientResult] = await pool.execute(
    "INSERT INTO clients (organizationId, name, createdBy, updatedBy) VALUES (?, ?, ?, ?)",
    [primaryOrganizationId, `${testTag} client`, 1, 1]
  );
  clientId = clientResult.insertId;

  const [siteResult] = await pool.execute(
    "INSERT INTO sites (organizationId, clientId, contactId, name, address) VALUES (?, ?, ?, ?, ?)",
    [
      primaryOrganizationId,
      clientId,
      contactId,
      `${testTag} site`,
      "1 Test Street",
    ]
  );
  siteId = siteResult.insertId;

  const [jobResult] = await pool.execute(
    `INSERT INTO jobs
      (organizationId, clientId, siteId, contactId, jobNumber, title, description, serviceAddress, createdBy, updatedBy)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      primaryOrganizationId,
      clientId,
      siteId,
      contactId,
      "#900001",
      `${testTag} job`,
      "Disposable integration-test job",
      "1 Test Street",
      1,
      1,
    ]
  );
  jobId = jobResult.insertId;

  const crossTenantRow = await scalar(
    "SELECT COUNT(*) AS total FROM jobs WHERE organizationId = ? AND id = ?",
    [secondaryOrganizationId, jobId]
  );
  assert.equal(
    Number(crossTenantRow.total),
    0,
    "tenant-scoped job query must not expose another tenant's job"
  );

  await assert.rejects(
    pool.execute(
      `INSERT INTO jobs
        (organizationId, clientId, contactId, jobNumber, title, description, serviceAddress, createdBy, updatedBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        primaryOrganizationId,
        999999999,
        contactId,
        "#900002",
        `${testTag} invalid FK`,
        "This insert must be rejected by MariaDB",
        "1 Test Street",
        1,
        1,
      ]
    ),
    /foreign key/i,
    "MariaDB must enforce jobs.clientId foreign keys"
  );

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      "INSERT INTO clients (organizationId, name, createdBy, updatedBy) VALUES (?, ?, ?, ?)",
      [primaryOrganizationId, `${testTag} rollback`, 1, 1]
    );
    await connection.rollback();
  } finally {
    connection.release();
  }
  const rollbackRow = await scalar(
    "SELECT COUNT(*) AS total FROM clients WHERE organizationId = ? AND name = ?",
    [primaryOrganizationId, `${testTag} rollback`]
  );
  assert.equal(
    Number(rollbackRow.total),
    0,
    "rolled-back writes must not persist"
  );

  const idempotencyKey = randomUUID();
  const idempotencyResults = await Promise.allSettled([
    pool.execute(
      "INSERT INTO syncLogs (organizationId, idempotencyKey, mutationType) VALUES (?, ?, ?)",
      [primaryOrganizationId, idempotencyKey, "integration-test"]
    ),
    pool.execute(
      "INSERT INTO syncLogs (organizationId, idempotencyKey, mutationType) VALUES (?, ?, ?)",
      [primaryOrganizationId, idempotencyKey, "integration-test"]
    ),
  ]);
  assert.equal(
    idempotencyResults.filter(result => result.status === "fulfilled").length,
    1,
    "exactly one concurrent idempotency claim must succeed"
  );
  assert.equal(
    idempotencyResults.filter(result => result.status === "rejected").length,
    1,
    "duplicate idempotency claim must be rejected"
  );

  console.log("MariaDB migration and integrity verification passed.");
} finally {
  if (primaryOrganizationId) {
    await pool.execute("DELETE FROM syncLogs WHERE organizationId = ?", [
      primaryOrganizationId,
    ]);
    if (jobId) await pool.execute("DELETE FROM jobs WHERE id = ?", [jobId]);
    if (siteId) await pool.execute("DELETE FROM sites WHERE id = ?", [siteId]);
    if (clientId)
      await pool.execute("DELETE FROM clients WHERE id = ?", [clientId]);
    if (contactId)
      await pool.execute("DELETE FROM contacts WHERE id = ?", [contactId]);
    await pool.execute("DELETE FROM organizations WHERE id = ?", [
      primaryOrganizationId,
    ]);
  }
  if (secondaryOrganizationId) {
    await pool.execute("DELETE FROM organizations WHERE id = ?", [
      secondaryOrganizationId,
    ]);
  }
  await pool.end();
}
