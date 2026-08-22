import { COOKIE_NAME, UNAUTHED_ERR_MSG } from "@shared/const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";

import App from "./App";
import { startLogin } from "./const";

import { trpc } from "@/lib/trpc";
import "./index.css";

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/service-worker.js");
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) =>
        error instanceof TRPCClientError && error.message === UNAUTHED_ERR_MSG
          ? false
          : failureCount < 2,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 0 },
  },
});

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  startLogin();
};

function reportClientApiError(kind: "query" | "mutation", error: unknown) {
  if (import.meta.env.DEV) {
    console.error(`[API ${kind} error]`, error);
    return;
  }

  const message = error instanceof Error ? error.message : "Unknown API error";
  void fetch("/api/client-errors", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      errorId: `api-${kind}`,
      message,
      path: window.location.pathname,
    }),
  }).catch(() => undefined);
}

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    reportClientApiError("query", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    reportClientApiError("mutation", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      headers() {
        // Browser fallback for cookie-restricted embedded contexts. The regular
        // signed cookie flow remains authoritative server-side.
        try {
          const raw =
            sessionStorage.getItem("elegex-session-token") ??
            sessionStorage.getItem("manus-cookie");
          if (raw && !sessionStorage.getItem("elegex-session-token")) {
            sessionStorage.setItem("elegex-session-token", raw);
          }
          if (raw) {
            const prefix = `${COOKIE_NAME}=`;
            const pair = raw.split(";").find(s => s.trim().startsWith(prefix));
            const token = pair?.trim().slice(prefix.length);
            if (token) {
              return { Authorization: `Bearer ${token}` };
            }
          }
        } catch {
          // sessionStorage unavailable
        }
        return {};
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
