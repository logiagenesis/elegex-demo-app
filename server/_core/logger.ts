import pino from "pino";
import pinoHttp from "pino-http";

import { ENV } from "./env";

export const logger = pino({
  level: ENV.logLevel,
  transport: ENV.isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          colorize: true,
          ignore: "pid,hostname",
          translateTime: "SYS:standard",
        },
      },
  formatters: {
    level: label => {
      return { level: label };
    },
  },
});

export const httpLogger = pinoHttp({
  logger,
  customProps: (req, res) => {
    return {
      correlationId: req.headers["x-correlation-id"] || req.id,
    };
  },
  autoLogging: {
    ignore: req => {
      // Don't log Vite HMR polling or health checks
      return (
        req.url === "/__vite_ping" ||
        req.url?.startsWith("/@vite") ||
        req.url === "/healthz"
      );
    },
  },
});
