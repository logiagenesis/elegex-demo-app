import { z } from "zod";

const seedEnvironmentSchema = z.object({
  DATABASE_URL: z
    .string()
    .url("DATABASE_URL must be a valid connection string for demo seeding"),
  SEED_OPEN_ID: z.string().min(1).optional(),
  OWNER_OPEN_ID: z.string().min(1).optional(),
  SEED_OWNER_NAME: z.string().min(1).optional(),
  SEED_OWNER_EMAIL: z.string().email().optional(),
});

export function parseSeedEnvironment(raw) {
  const parsed = seedEnvironmentSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map(issue => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid demo seed configuration: ${issues}`);
  }

  return {
    databaseUrl: parsed.data.DATABASE_URL,
    ownerOpenId:
      parsed.data.SEED_OPEN_ID ??
      parsed.data.OWNER_OPEN_ID ??
      "elegex-demo-owner",
    ownerName: parsed.data.SEED_OWNER_NAME ?? "Demo Workspace Owner",
    ownerEmail: parsed.data.SEED_OWNER_EMAIL ?? "owner@elegex.demo",
  };
}
