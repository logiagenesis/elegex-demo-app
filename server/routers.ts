import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";

import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
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
  publicContractor: router({
    profile: publicProcedure
      .input(z.object({ slug: z.string().trim().min(3).max(120) }))
      .query(async ({ input }) => {
        const profile = await db.getPublicContractorProfile(input.slug);
        if (!profile) return null;
        return {
          slug: profile.slug,
          displayName: profile.displayName,
          summary: profile.summary,
          serviceAreas: profile.serviceAreas,
          services: profile.services,
          bookingEnabled: profile.bookingEnabled,
          publicContactEmail: profile.publicContactEmail,
          publicContactPhone: profile.publicContactPhone,
        };
      }),
    requestBooking: publicProcedure
      .input(
        z.object({
          slug: z.string().trim().min(3).max(120),
          customerName: z.string().trim().min(2).max(160),
          email: z.string().email().optional(),
          phone: z.string().trim().min(5).max(50).optional(),
          serviceType: z.string().trim().min(2).max(120),
          address: z.string().trim().min(5).max(360),
          description: z.string().trim().min(5).max(4000),
          preferredStart: z.date().optional(),
          preferredEnd: z.date().optional(),
          consentToContact: z.literal(true),
        })
      )
      .mutation(async ({ input }) => {
        const profile = await db.getPublicContractorProfile(input.slug);
        const { slug: _slug, ...request } = input;
        return db.createBookingRequest(profile, request);
      }),
  }),
  elegex: elegexRouter,
});

export type AppRouter = typeof appRouter;
