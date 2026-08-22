import { readFile } from "node:fs/promises";

const auditPath = new URL(
  "../docs/audit/self-audit-2026-08-22.md",
  import.meta.url
);
const audit = await readFile(auditPath, "utf8");

const requiredSections = [
  "# Elegex Release Self-Audit and Gap Register",
  "## Release decision",
  "## Verified release controls",
  "## Python-grade comparison",
  "## Required release sequence",
];

const missingSections = requiredSections.filter(
  section => !audit.includes(section)
);

if (missingSections.length) {
  throw new Error(
    `Release evidence is missing required section(s): ${missingSections.join(", ")}`
  );
}

const allowedStatuses = new Set(["DONE", "PARTIAL", "NOT STARTED", "BLOCKED"]);
const statuses = [...audit.matchAll(/\*\*([A-Z ]+)\*\*/g)].map(([, status]) =>
  status.trim()
);
const invalidStatuses = statuses.filter(status => !allowedStatuses.has(status));

if (invalidStatuses.length) {
  throw new Error(
    `Release evidence contains invalid status value(s): ${[...new Set(invalidStatuses)].join(", ")}`
  );
}

if (
  !/\|\s*Public-review repository exposure\s*\|\s*\*\*PARTIAL\*\*/.test(audit)
) {
  throw new Error(
    "Release evidence must explicitly record the approved public-review repository posture."
  );
}

console.log("Release evidence structure and status vocabulary are valid.");
