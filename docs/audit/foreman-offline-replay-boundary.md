# Foreman Offline Replay Boundary

## Implemented behavior

The foreman job card persists each operational action to a browser-local IndexedDB queue before attempting a tenant-scoped tRPC replay. Every queue entry carries its generated UUID into the matching server procedure as the idempotency key. The supported operations are typed consent, check-in, material capture, evidence capture, quote capture, and completion handoff. Dependency links preserve the order between a newly queued consent and check-in, and between a newly queued check-in and downstream actions.

| Concern              | Implemented contract                                                                            | Evidence                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Local durability     | A field action is saved in IndexedDB before dispatch.                                           | `SyncQueue.enqueue()` regression coverage.                             |
| Replay ordering      | Child actions wait for dependency success.                                                      | Queue dependency-order and failed-parent tests.                        |
| Procedure routing    | Each queue type is routed to exactly one matching tRPC mutation.                                | `submitQueuedForemanMutation()` queue-drain regression.                |
| Duplicate protection | The queue UUID is submitted as an idempotency key and claimed tenant-scope first on the server. | Existing workflow idempotency checks plus consent idempotency support. |
| Visibility           | The job card shows queue depth, sync state, error text, and replay status.                      | `SyncPanel` on the foreman job card.                                   |

## Explicit non-claims

This deployment does **not** register a service worker, cache application shells for offline startup, use the Background Sync API, or claim replay after a browser process is closed. Replay is attempted while the active foreman page remains open and when the browser emits an `online` event. The persisted queue remains available to that browser profile, but it is not a substitute for a full installable PWA.

## Operational handling

When the network is unavailable or a transport call fails, the user sees the action as queued or requiring attention rather than being told that it was saved remotely. A successful replay is confirmed only after the server procedure resolves. Permanent validation failures remain visible in the local queue and must be corrected through a subsequent valid field action; queued payloads are deliberately not silently mutated in the client.
