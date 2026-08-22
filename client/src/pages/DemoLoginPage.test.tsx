// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const setLocation = vi.fn();
const mutate = vi.fn();

vi.mock("wouter", () => ({
  useLocation: () => ["/login", setLocation],
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    auth: {
      demoPersonas: {
        useQuery: () => ({
          data: [
            {
              id: "foreman",
              name: "Riley Chen",
              role: "member",
              title: "Field Foreman",
              description: "Mobile field-work persona.",
            },
          ],
          isError: false,
          isLoading: false,
        }),
      },
      demoLogin: {
        useMutation: (options: { onSuccess: () => void }) => ({
          mutate: (input: unknown) => {
            mutate(input);
            options.onSuccess();
          },
          isPending: false,
          error: null,
        }),
      },
    },
  },
}));

import DemoLoginPage from "./DemoLoginPage";

describe("DemoLoginPage", () => {
  it("sends a signed-in persona to the workspace rather than the public landing", async () => {
    const user = userEvent.setup();
    render(<DemoLoginPage />);

    await user.click(screen.getByText("Riley Chen"));

    await waitFor(() => expect(setLocation).toHaveBeenCalledWith("/app"));
    expect(setLocation).not.toHaveBeenCalledWith("/");
    expect(mutate).toHaveBeenCalledWith({ personaId: "foreman" });
  });
});
