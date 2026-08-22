// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  auth: {
    loading: false,
    user: null as null | { id: number; name: string },
    logout: vi.fn(),
  },
  startLogin: vi.fn(),
  workspace: { role: "owner", organizationName: "Elegex Operations" },
}));

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => state.auth }));
vi.mock("@/const", () => ({ startLogin: state.startLogin }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    elegex: {
      workspace: { current: { useQuery: () => ({ data: state.workspace }) } },
    },
  },
}));

import DashboardLayout from "./DashboardLayout";

describe("DashboardLayout rendered interactions", () => {
  beforeEach(() => {
    class TestResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    Object.defineProperty(window, "ResizeObserver", {
      writable: true,
      value: TestResizeObserver,
    });
    Object.defineProperty(globalThis, "ResizeObserver", {
      writable: true,
      value: TestResizeObserver,
    });
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    state.auth.loading = false;
    state.auth.user = null;
    state.auth.logout.mockReset();
    state.startLogin.mockReset();
    state.workspace = { role: "owner", organizationName: "Elegex Operations" };
    window.history.replaceState({}, "", "/");
  });

  it("renders a public recovery shell and invokes the real sign-in action", async () => {
    render(
      <DashboardLayout>
        <div>Protected child</div>
      </DashboardLayout>
    );
    expect(screen.getByTestId("public-entry")).toBeTruthy();
    await userEvent.click(
      screen.getByRole("button", { name: "Continue with Manus" })
    );
    expect(state.startLogin).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Protected child")).toBeNull();
  });

  it("renders authenticated navigation and changes the active browser route on user action", async () => {
    state.auth.user = { id: 1, name: "Elegex user" };
    render(
      <DashboardLayout>
        <div>Workspace body</div>
      </DashboardLayout>
    );
    expect(screen.getByText("Workspace body")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Administration" })).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Jobs" }));
    expect(window.location.pathname).toBe("/jobs");
    await userEvent.click(
      screen.getAllByRole("button", { name: "Commercial reporting" })[0]
    );
    expect(window.location.pathname).toBe("/reports");
  });

  it("hides privileged controls from a non-administrative workspace role", () => {
    state.auth.user = { id: 1, name: "Elegex user" };
    state.workspace = { role: "member", organizationName: "Elegex Operations" };
    render(
      <DashboardLayout>
        <div>Workspace body</div>
      </DashboardLayout>
    );
    expect(screen.queryByRole("button", { name: "Administration" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Staging readiness" })
    ).toBeNull();
  });
});
