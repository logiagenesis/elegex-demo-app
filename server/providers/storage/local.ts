import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { ENV } from "../../_core/env";

import type { StorageProvider } from "./types";
import { assertStorageKey } from "./validation";

const root = path.resolve(process.cwd(), "var", "uploads");

function localPath(key: string) {
  return path.resolve(root, assertStorageKey(key));
}

function assertLocalAllowed() {
  if (ENV.isProduction)
    throw new Error("Local storage is forbidden in production");
}

export const localStorageProvider: StorageProvider = {
  id: "local",
  async put({ key, body }) {
    assertLocalAllowed();
    const target = localPath(key);
    if (!target.startsWith(`${root}${path.sep}`))
      throw new Error("Invalid local storage path");
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, body);
  },
  async getSignedUrl(key) {
    assertLocalAllowed();
    return `local://${assertStorageKey(key)}`;
  },
  async delete(key) {
    assertLocalAllowed();
    await rm(localPath(key), { force: true });
  },
  async read(key) {
    assertLocalAllowed();
    try {
      return await readFile(localPath(key));
    } catch {
      return undefined;
    }
  },
};
