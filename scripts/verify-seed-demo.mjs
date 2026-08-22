import assert from "node:assert/strict";
import mysql from "mysql2/promise";
import { parseSeedEnvironment } from "./seed-config.mjs";

const { databaseUrl } = parseSeedEnvironment(process.env);
const pool = mysql.createPool(databaseUrl);

async function organizationScopedCount(table, organizationId) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM ${table} WHERE organizationId = ?`,
    [organizationId]
  );
  return Number(rows[0].total);
}

async function jobScopedCount(table, organizationId) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS total
       FROM ${table} child
       JOIN jobs job ON job.id = child.jobId
      WHERE job.organizationId = ?`,
    [organizationId]
  );
  return Number(rows[0].total);
}

try {
  const [organizations] = await pool.execute(
    "SELECT id FROM organizations WHERE slug = 'elegex-demo'"
  );
  assert.equal(
    organizations.length,
    1,
    "the deterministic demonstration organization must exist exactly once"
  );
  const organizationId = organizations[0].id;

  const [settingsRows] = await pool.execute(
    "SELECT locale, currency, timezone FROM appSettings WHERE organizationId = ?",
    [organizationId]
  );
  assert.deepEqual(settingsRows, [
    {
      locale: "en-ZA",
      currency: "ZAR",
      timezone: "Africa/Johannesburg",
    },
  ]);

  const expectedOrganizationCounts = {
    organizationMembers: 4,
    jobs: 36,
    quotes: 12,
    monthlyOperationalSnapshots: 6,
    environmentReleases: 3,
  };
  for (const [table, expected] of Object.entries(expectedOrganizationCounts)) {
    assert.equal(
      await organizationScopedCount(table, organizationId),
      expected,
      `${table} must retain its deterministic demo count after seeding`
    );
  }

  const expectedJobCounts = {
    jobVisits: 36,
    jobMaterials: 72,
    jobEvidence: 72,
    invoiceLinks: 23,
  };
  for (const [table, expected] of Object.entries(expectedJobCounts)) {
    assert.equal(
      await jobScopedCount(table, organizationId),
      expected,
      `${table} must retain its deterministic job-linked count after seeding`
    );
  }

  const [releaseCheckRows] = await pool.execute(
    `SELECT COUNT(*) AS total
       FROM releaseChecks releaseCheck
       JOIN environmentReleases releaseRecord ON releaseRecord.id = releaseCheck.releaseId
      WHERE releaseRecord.organizationId = ?`,
    [organizationId]
  );
  assert.equal(
    Number(releaseCheckRows[0].total),
    5,
    "the staging demonstration release must retain its five synthetic checks"
  );

  const [orphanedJobs] = await pool.execute(
    `SELECT COUNT(*) AS total
       FROM jobs
      WHERE organizationId = ?
        AND (contactId IS NULL OR createdBy IS NULL OR updatedBy IS NULL)`,
    [organizationId]
  );
  assert.equal(
    Number(orphanedJobs[0].total),
    0,
    "every seeded job must retain required ownership and contact references"
  );

  console.log("MariaDB demo seed verification passed.");
} finally {
  await pool.end();
}
