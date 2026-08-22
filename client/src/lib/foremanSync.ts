import type { SyncMutation } from "./syncQueue";

export type ForemanProcedureTransport = {
  consent: (input: { jobId: number; signerName: string; idempotencyKey: string }) => Promise<unknown>;
  checkIn: (input: { jobId: number; idempotencyKey: string }) => Promise<unknown>;
  material: (input: { jobId: number; description: string; quantity: number; unit: string; idempotencyKey: string }) => Promise<unknown>;
  evidence: (input: { jobId: number; evidenceType: "before_photo" | "after_photo" | "note" | "job_card" | "signature"; title: string; note?: string; idempotencyKey: string }) => Promise<unknown>;
  quote: (input: { jobId: number; quoteNumber: string; total: number; idempotencyKey: string }) => Promise<unknown>;
  complete: (input: { jobId: number; exceptionReason?: string; idempotencyKey: string }) => Promise<unknown>;
};

export async function submitQueuedForemanMutation(transport: ForemanProcedureTransport, mutation: Readonly<SyncMutation>) {
  const payload = mutation.payload as Record<string, any>;
  if (mutation.type === "consent") return transport.consent({ jobId: Number(payload.jobId), signerName: String(payload.signerName), idempotencyKey: mutation.id });
  if (mutation.type === "checkIn") return transport.checkIn({ jobId: Number(payload.jobId), idempotencyKey: mutation.id });
  if (mutation.type === "material") return transport.material({ jobId: Number(payload.jobId), description: String(payload.description), quantity: Number(payload.quantity), unit: String(payload.unit), idempotencyKey: mutation.id });
  if (mutation.type === "evidence") return transport.evidence({ jobId: Number(payload.jobId), evidenceType: payload.evidenceType, title: String(payload.title), note: payload.note ? String(payload.note) : undefined, idempotencyKey: mutation.id });
  if (mutation.type === "quote") return transport.quote({ jobId: Number(payload.jobId), quoteNumber: String(payload.quoteNumber), total: Number(payload.total), idempotencyKey: mutation.id });
  return transport.complete({ jobId: Number(payload.jobId), exceptionReason: payload.exceptionReason ? String(payload.exceptionReason) : undefined, idempotencyKey: mutation.id });
}
