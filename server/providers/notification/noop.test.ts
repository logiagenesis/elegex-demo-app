import { describe, expect, it } from "vitest";
import { noopNotificationProvider } from "./noop";

describe("no-op notification provider", () => {
  it("does not claim delivery when operational notifications are disabled", async () => {
    await expect(
      noopNotificationProvider.send({
        title: "Deployment check",
        content: "No external delivery should occur.",
      })
    ).resolves.toBe(false);
  });
});
