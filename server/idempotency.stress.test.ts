import { describe, expect, it, vi, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";
import { foremanCheckIn, captureForemanEvidence, addForemanMaterial } from "./db";
import * as dbConnector from "./connectors/database";

// We need to mock the database to simulate real concurrency behavior.
// We'll use an in-memory map to simulate the unique index on syncLogs.
const syncLogsTable = new Map<string, string>(); // key: `${orgId}:${idempotencyKey}`, value: mutationType
const jobsTable = new Map<number, any>();
const materialsTable: any[] = [];
const activityLogsTable: any[] = [];

vi.mock("./connectors/database", () => {
  return {
    getDatabase: vi.fn(),
    withTransaction: vi.fn(),
  };
});

// A simplified mock transaction that enforces the INSERT IGNORE unique constraint semantics
const createMockTx = () => {
  return {
    insert: (table: any) => ({
      values: (data: any) => {
        // If it's the syncLogs table, enforce the unique constraint like INSERT IGNORE
        if (data.idempotencyKey && data.mutationType) {
          const key = `${data.organizationId}:${data.idempotencyKey}`;
          
          const handleSyncLog = async () => {
            if (syncLogsTable.has(key)) {
              return [{ affectedRows: 0, insertId: 0 }];
            } else {
              // Introduce a tiny delay to allow race conditions to overlap
              await new Promise(resolve => setTimeout(resolve, Math.random() * 5));
              
              // Check again after delay (simulating transaction isolation level / lock acquisition)
              if (syncLogsTable.has(key)) {
                 return [{ affectedRows: 0, insertId: 0 }];
              }
              
              syncLogsTable.set(key, data.mutationType);
              return [{ affectedRows: 1, insertId: 1 }];
            }
          };
          
          // We need to return an object with onDuplicateKeyUpdate for the syncLogs table
          const insertPromise = handleSyncLog();
          return {
            onDuplicateKeyUpdate: async () => await insertPromise
          };
        } else {
          // Other tables
          if (data.action) activityLogsTable.push(data); // activityLogs
          if (data.description && data.quantity) materialsTable.push(data); // jobMaterials
          
          return [{ insertId: Math.floor(Math.random() * 10000) }];
        }
      }
    }),
    update: (table: any) => ({
      set: (data: any) => ({
        where: async () => {
          // just mock success
        }
      })
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => {
            // Mock assertAssignedForeman
            return [{
              id: 123,
              organizationId: 7,
              stage: "in_progress",
              foremanId: 42,
              title: "Test Job"
            }];
          }
        })
      })
    })
  };
};

describe("Idempotency Concurrency Stress Test", () => {
  beforeEach(() => {
    syncLogsTable.clear();
    jobsTable.clear();
    materialsTable.length = 0;
    activityLogsTable.length = 0;
    
    vi.mocked(dbConnector.withTransaction).mockImplementation(async (callback) => {
      const tx = createMockTx();
      return callback(tx as any);
    });
  });

  it("safely handles 50 highly concurrent replays of the same mutation payload without duplication", async () => {
    const organizationId = 7;
    const userId = 42;
    const jobId = 123;
    const idempotencyKey = randomUUID();
    
    // Simulate 50 concurrent requests hitting the server at the exact same time
    // e.g., a mobile device coming online and aggressively retrying a dropped ACK
    const concurrency = 50;
    const requests = Array.from({ length: concurrency }).map(() => {
      return addForemanMaterial(organizationId, userId, {
        jobId,
        description: "Copper Wire",
        quantity: 50,
        unit: "m",
        idempotencyKey
      });
    });
    
    const results = await Promise.allSettled(requests);
    
    // Verify no promises rejected (they should all succeed or return 0 for duplicate)
    const rejections = results.filter(r => r.status === "rejected");
    expect(rejections.length).toBe(0);
    
    // Exactly one should have returned a non-zero insertId, the rest should return 0
    const successfulInserts = results.filter(r => r.status === "fulfilled" && r.value !== 0);
    const duplicateBypasses = results.filter(r => r.status === "fulfilled" && r.value === 0);
    
    expect(successfulInserts.length).toBe(1);
    expect(duplicateBypasses.length).toBe(concurrency - 1);
    
    // Verify the database state remains consistent
    expect(materialsTable.length).toBe(1);
    expect(activityLogsTable.length).toBe(1);
    
    expect(materialsTable[0].description).toBe("Copper Wire");
    expect(materialsTable[0].quantity).toBe(50);
  });

  it("handles mixed concurrent traffic with different idempotency keys correctly", async () => {
    const organizationId = 7;
    const userId = 42;
    const jobId = 123;
    
    // 3 different mutations, each replayed 20 times concurrently
    const key1 = randomUUID(); // CheckIn
    const key2 = randomUUID(); // Material A
    const key3 = randomUUID(); // Material B
    
    const requests: Promise<any>[] = [];
    
    for (let i = 0; i < 20; i++) {
      // We simulate hasForemanConsent passing by mocking it in the db.ts file
      // For this test, we'll just test materials to avoid the consent mock complexity
      requests.push(addForemanMaterial(organizationId, userId, {
        jobId,
        description: "Material A",
        quantity: 1,
        unit: "each",
        idempotencyKey: key2
      }));
      
      requests.push(addForemanMaterial(organizationId, userId, {
        jobId,
        description: "Material B",
        quantity: 2,
        unit: "each",
        idempotencyKey: key3
      }));
    }
    
    // Shuffle the requests to simulate unpredictable network arrival
    requests.sort(() => Math.random() - 0.5);
    
    await Promise.all(requests);
    
    // We expect exactly 2 materials to be inserted
    expect(materialsTable.length).toBe(2);
    expect(activityLogsTable.length).toBe(2);
    
    // Both materials should be present exactly once
    const hasA = materialsTable.some(m => m.description === "Material A");
    const hasB = materialsTable.some(m => m.description === "Material B");
    
    expect(hasA).toBe(true);
    expect(hasB).toBe(true);
  });
});
