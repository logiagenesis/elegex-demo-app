# Offline-First Mobile Sync Architecture Review
2
3	**Date:** 21 August 2026
4	**Target:** Work Package 5 (The Foreman Workflow, Properly)
5
6	## Current State Assessment
7
8	Based on the review of `server/db.ts` and `client/src/pages/ForemanPage.tsx`, the current implementation is entirely synchronous and optimistic-only in the UI.
9
10	- **No Client Persistence:** There is no IndexedDB or local storage queue. Mutations are sent directly via tRPC to the server.
11	- **No Idempotency:** The mutations do not generate or pass client-side UUIDs for idempotency.
12	- **No Dependency Graph:** Operations like check-in, materials capture, and completion are not ordered or constrained by dependencies on the client side.
13	- **File Handling:** Photos and signatures are not currently handled as blobs in a write-ahead queue.
14
15	## Required Architecture for WP5
16
17	To satisfy the "Offline is the hard requirement" directive, the following architecture must be implemented:
18
19	### 1. Client-Side Write-Ahead Queue (IndexedDB)
20
21	All foreman mutations must be intercepted before hitting the network.
22
23	- **Schema:** `{ id: string (UUID), type: string, payload: any, status: 'queued' | 'syncing' | 'failed', dependencies: string[], createdAt: number, retryCount: number }`
24	- **Storage:** IndexedDB (via `idb` or a similar wrapper) to survive hard app kills and device reboots.
25
26	### 2. Idempotency Engine
27
28	- **Client:** Generates a v4 UUID for every mutation.
29	- **Server:** The database must enforce a unique constraint on `(organizationId, idempotencyKey)` for all syncable entities (or a dedicated `syncLog` table).
30	- **Replay:** If a mutation is replayed, the server must return success (200 OK) without duplicating the row.
31
32	### 3. Dependency-Aware Drain
33
34	The sync queue must process items in order, respecting dependencies.
35
36	- `checkIn` must succeed before `jobMaterials` can sync.
37	- `jobMaterials` and `jobEvidence` must succeed before `completeJob` can sync.
38
39	### 4. Binary Handling
40
41	Photos and signatures must be stored as Blobs in IndexedDB, not as base64 Data URLs, to prevent quota exhaustion. The sync engine must upload the Blob to the storage service and then attach the resulting URL/key to the evidence mutation.
42
43	### 5. Exponential Backoff
44
45	The sync loop must implement exponential backoff with jitter for network failures, capping retries before marking an item as a permanent failure that requires user intervention.
46
47	## Next Steps for Implementation
48
49	1. Introduce `idb` to the client dependencies.
50	2. Build the `SyncQueue` singleton to intercept tRPC calls.
51	3. Update the server tRPC routers to accept and validate `idempotencyKey`.
52	4. Update the database schema to include `idempotencyKey` on `jobVisits`, `jobMaterials`, `jobEvidence`, and `jobs` (for completion states).
53
