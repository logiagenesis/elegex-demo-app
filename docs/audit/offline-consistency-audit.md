# Offline-First Consistency Audit

**Date:** 22 August 2026  
**Target:** Elegex Demo Application (GitHub `main` branch)

This report validates the end-to-end data consistency of the offline-first field workflow, proving that the `SyncQueue` and server-side idempotency handlers correctly protect against data duplication, dependency violations, and network drops.

## 1. Validated Offline Scenarios

A new integration test suite (`offline-integration.test.ts`) was executed to simulate real-world mobile connectivity drops and recovery.

### 1.1. Network Drop and Queueing
- **Scenario:** The foreman checks in and adds materials while the device is offline.
- **Verification:** The `SyncQueue` intercepts the tRPC transport. The check-in mutation transitions to a `retrying` or `failed` state (depending on the backoff limit), while the dependent material mutation remains safely `queued` or `failed`, awaiting the parent's success.
- **Result:** **Pass**. No mutations are sent to the server. The dependency graph correctly blocks child mutations from executing when their parents cannot reach the server.

### 1.2. Tab Crash and Recovery
- **Scenario:** The browser tab is closed or crashes while offline work is pending in the queue.
- **Verification:** The `recoverInterruptedWork()` routine reads the persistent IndexedDB store upon reload and transitions any interrupted `syncing` states back to `retrying`.
- **Result:** **Pass**. The queue state survives memory loss and browser restarts.

### 1.3. Reconnection and Flushing
- **Scenario:** The network connection is restored and the queue is drained.
- **Verification:** The queue successfully drains in dependency order. The parent check-in succeeds first, unblocking the child material mutation, which then succeeds.
- **Result:** **Pass**. Both mutations reach the server exactly once.

### 1.4. Spurious Replay and Idempotency
- **Scenario:** A service worker or aggressive retry loop replays the exact same mutation payload (with the same client-generated UUID) after the server has already processed it, simulating a dropped ACK.
- **Verification:** The server's `checkIdempotency` handler (using an atomic `INSERT IGNORE` into the `syncLogs` table) intercepts the duplicate UUID. The business logic is bypassed, and the server returns a successful response to the client.
- **Result:** **Pass**. The database state remains consistent. No duplicate materials are added, and no duplicate activity logs are generated.

## 2. End-to-End Limits

While the offline queue and server idempotency are robust, the following boundaries exist in the current deployment:

- **Service Worker Registration:** As noted in the UI, the `SyncQueue` persists actionable records in the browser's IndexedDB, but background sync and service-worker registration are intentionally omitted from this synthetic deployment. Replays require the browser tab to be open and online.
- **Blob Staging:** The queue's structured cloning supports Blobs, but the UI currently only captures text-based evidence (notes). Full offline photo/signature capture requires wiring the Blob payloads into the queue and ensuring the transport uploads them to the managed storage service upon reconnect.

## 3. Conclusion

The offline-first architecture is **data-consistent**. The integration tests prove that the combination of client-side dependency ordering and server-side idempotency keys safely handles network volatility without corrupting the tenant database.
