import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("production runtime dependency boundary", () => {
  it("loads Vite only through the development branch while retaining standalone static serving", async () => {
    const root = resolve(import.meta.dirname, "../..");
    const entrypoint = await readFile(
      resolve(root, "server/_core/index.ts"),
      "utf8"
    );
    const staticServer = await readFile(
      resolve(root, "server/_core/static.ts"),
      "utf8"
    );

    expect(entrypoint).toContain('import { serveStatic } from "./static"');
    expect(entrypoint).toContain('await import("./vite")');
    expect(entrypoint).not.toContain('from "./vite"');
    expect(staticServer).toContain("express.static(distPath)");
  });
});
