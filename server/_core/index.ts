import "dotenv/config";
import { createServer, type IncomingMessage, type ServerResponse } from "http";
import net from "net";
import { randomBytes } from "node:crypto";

import { createExpressMiddleware } from "@trpc/server/adapters/express";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

import {
  assertFieldServiceSchema,
  checkDatabaseHealth,
} from "../connectors/database";
import { startOutboxWorker, stopOutboxWorker } from "../connectors/worker";
import { appRouter } from "../routers";

import { apiNotFoundHandler } from "./apiFallback";
import { registerBodyParsers } from "./bodyParser";
import { createContext } from "./context";
import { ENV } from "./env";
import { logger, httpLogger } from "./logger";
import { registerOAuthRoutes } from "./oauth";
import {
  metricsMiddleware,
  metricsText,
  requestIdMiddleware,
} from "./observability";
import { registerStorageProxy } from "./storageProxy";
import { serveStatic } from "./static";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  await assertFieldServiceSchema();
  const app = express();
  const server = createServer(app);
  app.set("trust proxy", ENV.trustProxyHops);

  app.use(requestIdMiddleware);
  app.use(metricsMiddleware);
  // 1. Structured logging
  app.use(httpLogger);

  // 2. HTTP Security Headers
  app.use(
    (
      _req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      res.locals.cspNonce = randomBytes(16).toString("base64");
      next();
    }
  );
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            (_req: IncomingMessage, res: ServerResponse) =>
              `'nonce-${(res as unknown as express.Response).locals.cspNonce as string}'`,
            "https://maps.googleapis.com",
          ],
          styleSrc: [
            "'self'",
            ...(ENV.isDevelopment ? ["'unsafe-inline'"] : []),
            "https://fonts.googleapis.com",
          ],
          styleSrcAttr: ["'unsafe-inline'"],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
          imgSrc: [
            "'self'",
            "data:",
            "https://maps.gstatic.com",
            "https://maps.googleapis.com",
            "https://*.manus.space",
            "https://*.manuscdn.com",
          ],
          connectSrc: [
            "'self'",
            "https://*.manus.space",
            "https://*.manuscdn.com",
            "https://maps.googleapis.com",
          ],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false, // Required for some third-party integrations
      referrerPolicy: { policy: "no-referrer" },
    })
  );
  app.use((_req, res, next) => {
    res.setHeader(
      "Permissions-Policy",
      "camera=(), geolocation=(self), microphone=(), payment=()"
    );
    next();
  });

  // 3. Rate Limiting
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    message: { error: "Too many requests, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const authLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // strict limit for auth routes
    message: { error: "Too many authentication attempts." },
  });
  const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: {
      error: "Too many upload attempts. Please wait before retrying.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(globalLimiter);
  app.use("/api/oauth", authLimiter);
  app.use(
    [
      "/api/trpc/elegex.documents.upload",
      "/api/trpc/elegex.fieldService.foreman.evidence",
    ],
    uploadLimiter
  );

  const healthHandler = (_req: express.Request, res: express.Response) => {
    res.status(200).json({ status: "ok" });
  };
  const readinessHandler = async (
    _req: express.Request,
    res: express.Response
  ) => {
    try {
      const readiness = await checkDatabaseHealth();
      res.status(200).json({ status: "ready", database: readiness.healthy });
    } catch (error) {
      logger.warn({ err: error }, "Readiness probe failed");
      res.status(503).json({ status: "not_ready" });
    }
  };
  app.get(["/health", "/healthz"], healthHandler);
  app.get(["/ready", "/readyz"], readinessHandler);
  app.get("/metrics", (req, res) => {
    if (
      ENV.metricsBearerToken &&
      req.get("authorization") !== `Bearer ${ENV.metricsBearerToken}`
    ) {
      res.status(401).json({ error: "metrics authorization required" });
      return;
    }
    res.type("text/plain; version=0.0.4").send(metricsText());
  });

  registerBodyParsers(app);
  app.post("/api/client-errors", (req, res) => {
    const body = req.body as {
      errorId?: unknown;
      message?: unknown;
      path?: unknown;
    };
    const errorId =
      typeof body.errorId === "string" ? body.errorId.slice(0, 80) : "unknown";
    const message =
      typeof body.message === "string" ? body.message.slice(0, 500) : "unknown";
    const path =
      typeof body.path === "string" ? body.path.slice(0, 240) : "unknown";
    logger.error(
      { errorId, message, path, requestId: req.id },
      "Client recovery boundary captured an error"
    );
    res.status(202).json({ accepted: true, errorId });
  });
  app.get("/sitemap.xml", (req, res) => {
    const origin = `${req.protocol}://${req.get("host")}`;
    res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${origin}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
</urlset>`);
  });
  app.use(
    [
      "/app",
      "/jobs",
      "/field",
      "/dispatch",
      "/projects",
      "/cases",
      "/contacts",
      "/tasks",
      "/documents",
      "/reports",
      "/staging",
      "/notifications",
      "/admin",
      "/settings",
      "/login",
    ],
    (_req, res, next) => {
      res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
      next();
    }
  );
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // Keep API faults JSON-shaped. Without this guard an unmatched `/api/*`
  // request would reach Vite's SPA fallback and cause client JSON parsers to
  // receive `<!doctype html>`.
  app.use("/api", apiNotFoundHandler);
  // development mode uses Vite, production mode uses static files
  if (ENV.isDevelopment) {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = ENV.port;

  // In production, bind exactly to the configured port to ensure LB health checks pass.
  // Port drift causes silent failure in orchestrated environments.
  let port = preferredPort;
  if (!ENV.isProduction) {
    port = await findAvailablePort(preferredPort);
    if (port !== preferredPort) {
      logger.warn(`Port ${preferredPort} is busy, using port ${port} instead`);
    }
  }

  server.listen(port, () => {
    logger.info(`Server running on http://localhost:${port}/`);
    startOutboxWorker();
  });

  // Graceful shutdown handling
  let shutdownStarted = false;
  const shutdown = async (signal: string) => {
    if (shutdownStarted) {
      logger.warn(
        `[Server] Ignoring repeated ${signal} during graceful shutdown.`
      );
      return;
    }
    shutdownStarted = true;
    logger.info(`[Server] Received ${signal}. Starting graceful shutdown...`);

    // 1. Stop accepting new connections
    server.close(async err => {
      if (
        err &&
        (err as NodeJS.ErrnoException).code !== "ERR_SERVER_NOT_RUNNING"
      ) {
        logger.error({ err }, "[Server] Error closing server");
      } else {
        logger.info("[Server] HTTP server closed.");
      }

      try {
        // 2. Stop background workers
        stopOutboxWorker();

        // 3. Close database pool
        const { closeDatabase } = await import("../connectors/database");
        await closeDatabase();

        logger.info("[Server] Graceful shutdown complete.");
        process.exit(0);
      } catch (e) {
        logger.error({ err: e }, "[Server] Error during shutdown");
        process.exit(1);
      }
    });

    // Force shutdown after 10 seconds if connections are hanging
    setTimeout(() => {
      logger.fatal("[Server] Forcefully shutting down after 10s timeout.");
      process.exit(1);
    }, 10000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

startServer().catch(err => {
  logger.fatal({ err }, "Failed to start server");
  process.exit(1);
});
