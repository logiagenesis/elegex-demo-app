import { z } from "zod";
import { router, publicProcedure } from "../../_core/trpc";
import { getDatabase } from "../../connectors/database";
import { jobs, clients } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// Simple API Key authentication for external integrations
const requireApiKey = publicProcedure.use(async ({ ctx, next }) => {
  const authHeader = ctx.req?.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Missing or invalid authorization header",
    });
  }

  const token = authHeader.split(" ")[1];
  // In a real implementation, this would validate against a hashed key in the database
  // For the demo boundary, we accept a configured master key
  const { ENV } = await import("../../_core/env");
  if (!ENV.apiMasterKey || token !== ENV.apiMasterKey) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid API key",
    });
  }

  return next({
    ctx: {
      ...ctx,
      // Default to the first organization for the demo API
      organizationId: 1,
    },
  });
});

export const v1Router = router({
  jobs: router({
    list: requireApiKey
      .input(
        z.object({
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ ctx, input }) => {
        const db = await getDatabase();
        const results = await db
          .select()
          .from(jobs)
          .where(eq(jobs.organizationId, ctx.organizationId))
          .limit(input.limit)
          .offset(input.offset);

        return {
          data: results,
          meta: {
            limit: input.limit,
            offset: input.offset,
          },
        };
      }),

    get: requireApiKey
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDatabase();
        const [job] = await db.select().from(jobs).where(eq(jobs.id, input.id));

        if (!job || job.organizationId !== ctx.organizationId) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Job not found",
          });
        }

        return job;
      }),
  }),

  clients: router({
    list: requireApiKey
      .input(
        z.object({
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ ctx, input }) => {
        const db = await getDatabase();
        const results = await db
          .select()
          .from(clients)
          .where(eq(clients.organizationId, ctx.organizationId))
          .limit(input.limit)
          .offset(input.offset);

        return {
          data: results,
          meta: {
            limit: input.limit,
            offset: input.offset,
          },
        };
      }),
  }),
});
