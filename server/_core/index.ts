import "dotenv/config";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { logger, httpLogger } from "./logger";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { apiNotFoundHandler } from "./apiFallback";
import { assertFieldServiceSchema } from "../connectors/database";
import { startOutboxWorker, stopOutboxWorker } from "../connectors/worker";
import { ENV } from "./env";

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

  // 1. Structured logging
  app.use(httpLogger);

  // 2. HTTP Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
            "https://maps.googleapis.com",
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://fonts.googleapis.com",
          ],
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
        },
      },
      crossOriginEmbedderPolicy: false, // Required for some third-party integrations
    })
  );

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

  app.use(globalLimiter);
  app.use("/api/oauth", authLimiter);

  // 4. Payload sizing - strict 1MB limit for standard JSON to prevent DoS
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: true }));
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
  const shutdown = async (signal: string) => {
    logger.info(`[Server] Received ${signal}. Starting graceful shutdown...`);

    // 1. Stop accepting new connections
    server.close(async err => {
      if (err) {
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
