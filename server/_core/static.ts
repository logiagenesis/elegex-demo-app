import fs from "fs";
import path from "path";

import express, { type Express } from "express";

import { ENV } from "./env";

export function serveStatic(app: Express) {
  const distPath = ENV.isDevelopment
    ? path.resolve(import.meta.dirname, "../..", "dist", "public")
    : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));
  app.use((_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
