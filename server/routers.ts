import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";

import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import {
  createDemoPersonaSession,
  getAuthProviderInfo,
  listDemoPersonas,
} from "./providers/auth";
import { elegexRouter } from "./routers/elegex";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    provider: publicProcedure.query(() => getAuthProviderInfo()),
    demoPersonas: publicProcedure.query(() => listDemoPersonas()),
    demoLogin: publicProcedure
      .input(
        z.object({
          personaId: z.enum([
            "owner",
            "manager",
            "foreman",
            "electrician",
            "plumber",
            "tiler",
            "viewer",
          ]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const session = await createDemoPersonaSession(input.personaId);
        ctx.res.cookie(COOKIE_NAME, session.token, {
          ...getSessionCookieOptions(ctx.req),
          maxAge: 365 * 24 * 60 * 60 * 1000,
        });
        return { user: session.user };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  elegex: elegexRouter,
});

export type AppRouter = typeof appRouter;
