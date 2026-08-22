import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitQueuedForemanMutation } from "@/lib/foremanSync";
import { SyncQueue, type ForemanMutationType } from "@/lib/syncQueue";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, ClipboardCheck, FilePlus2, Loader2, MapPin, PackagePlus, PenLine, ReceiptText, Signal, TimerReset, TriangleAlert, WifiOff } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const stageLabel = (stage: string) => stage.replaceAll("_", " ").replace(/\b\w/g, character => character.toUpperCase());
type SyncState = "ready" | "syncing" | "synced" | "error";

function FieldCard({ title, description, children, locked = false }: { title: string; description: string; children: React.ReactNode; locked?: boolean }) {
  return <section className={`rounded-2xl border p-5 ${locked ? "border-[#E4EAF4] bg-[#F8FAFD]" : "border-[#D6E4FF] bg-white shadow-[0_8px_24px_rgba(24,54,108,0.05)]"}`}><div className="flex items-start justify-between gap-3"><div><h2 className="text-sm font-semibold text-[#14213D]">{title}</h2><p className="mt-1 text-xs leading-5 text-[#667085]">{description}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${locked ? "bg-[#F0F3F8] text-[#7A879E]" : "bg-[#E7F8EF] text-[#167244]"}`}>{locked ? "CHECK IN FIRST" : "READY"}</span></div><div className="mt-4">{children}</div></section>;
}

function SyncPanel({ state, detail, queueDepth }: { state: SyncState; detail: string; queueDepth: number }) {
  const tone = state === "error" ? "border-[#F7C7D0] bg-[#FFF6F7] text-[#B42342]" : state === "synced" ? "border-[#BCE8CD] bg-[#F2FCF6] text-[#167244]" : "border-[#CFE0FF] bg-[#F5F9FF] text-[#195FE6]";
  const icon = state === "error" ? <TriangleAlert className="h-4 w-4" /> : state === "syncing" ? <Loader2 className="h-4 w-4 animate-spin" /> : queueDepth ? <WifiOff className="h-4 w-4" /> : <Signal className="h-4 w-4" />;
  const label = state === "error" ? "SYNC NEEDS ATTENTION" : state === "syncing" ? "SYNCING FIELD ACTION" : queueDepth ? `${queueDepth} ACTION${queueDepth === 1 ? "" : "S"} QUEUED` : state === "synced" ? "SYNCED TO WORKSPACE" : "READY TO SYNC";
  return <div className={`mt-5 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs ${tone}`}>{icon}<div><p className="font-bold tracking-[0.08em]">{label}</p><p className="mt-1 leading-5 opacity-90">{detail}</p><p className="mt-1 text-[11px] opacity-75">The queue persists actionable records in this browser. Service-worker registration and background sync are intentionally not claimed in this deployment.</p></div></div>;
}

export function ForemanPage() {
  const today = trpc.elegex.fieldService.foreman.today.useQuery();
  const utils = trpc.useUtils();
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const selected = today.data?.find((row: any) => row.job.id === selectedJobId);
  if (today.isLoading) return <div className="grid min-h-96 place-items-center text-sm font-medium text-[#667085]"><Loader2 className="mr-2 h-5 w-5 animate-spin text-[#195FE6]" />Loading your assigned visits…</div>;
  if (!selected) return <><header className="mb-6"><p className="elegex-eyebrow">FOREMAN FIELD WORKFLOW</p><h1 className="elegex-page-title mt-2">My field visits</h1><p className="mt-2 max-w-xl text-sm leading-6 text-[#667085]">Consent, check-in, materials, evidence, quotes, completion, and replayable field synchronization are recorded against assigned jobs.</p></header><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{(today.data || []).map((row: any) => <button key={row.job.id} onClick={() => setSelectedJobId(row.job.id)} className="rounded-3xl border border-[#E4EAF4] bg-white p-5 text-left shadow-[0_8px_24px_rgba(24,54,108,0.05)] transition hover:-translate-y-0.5 hover:border-[#B6D4FF]"><div className="flex items-start justify-between gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#EAF1FF] text-[#195FE6]"><ClipboardCheck className="h-5 w-5" /></span><Badge className="border-0 bg-[#F2F6FF] text-[10px] font-bold text-[#195FE6]">{stageLabel(row.job.stage)}</Badge></div><p className="mt-5 text-base font-semibold text-[#14213D]">{row.job.jobNumber} · {row.job.title}</p><p className="mt-2 flex items-start gap-2 text-sm leading-6 text-[#667085]"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#195FE6]" />{row.job.serviceAddress}</p><div className="mt-5 flex items-center justify-between border-t border-[#EEF2F7] pt-4 text-xs font-semibold text-[#50617F]"><span>{row.contact.name}</span><span>Open workflow →</span></div></button>)}</div>{!today.data?.length ? <section className="mx-auto mt-16 max-w-md rounded-3xl border border-[#E4EAF4] bg-white p-8 text-center"><ClipboardCheck className="mx-auto h-8 w-8 text-[#195FE6]" /><h2 className="mt-4 text-lg font-semibold text-[#14213D]">No assigned visits</h2><p className="mt-2 text-sm leading-6 text-[#667085]">When an office dispatcher assigns you a scheduled job, it will appear here as a working field workflow.</p></section> : null}</>;
  return <ForemanJobWorkspace row={selected as any} onBack={() => setSelectedJobId(null)} onRefresh={() => void utils.elegex.invalidate()} />;
}

function ForemanJobWorkspace({ row, onBack, onRefresh }: { row: any; onBack: () => void; onRefresh: () => void }) {
  const job = row.job;
  const [signerName, setSignerName] = useState("");
  const [material, setMaterial] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceType, setEvidenceType] = useState<"before_photo" | "after_photo" | "note" | "job_card">("note");
  const [note, setNote] = useState("");
  const [quoteNumber, setQuoteNumber] = useState("");
  const [quoteTotal, setQuoteTotal] = useState("");
  const [completionException, setCompletionException] = useState("");
  const [locallyCheckedIn, setLocallyCheckedIn] = useState(false);
  const [consentId, setConsentId] = useState<string | undefined>();
  const [checkInId, setCheckInId] = useState<string | undefined>();
  const [queueDepth, setQueueDepth] = useState(0);
  const [syncState, setSyncState] = useState<SyncState>("ready");
  const [syncDetail, setSyncDetail] = useState("No field actions are pending. Actions are persisted locally before replay.");
  const active = job.stage === "in_progress" || locallyCheckedIn;
  const consent = trpc.elegex.fieldService.foreman.consent.useMutation();
  const checkIn = trpc.elegex.fieldService.foreman.checkIn.useMutation();
  const materialMutation = trpc.elegex.fieldService.foreman.material.useMutation();
  const evidence = trpc.elegex.fieldService.foreman.evidence.useMutation();
  const quote = trpc.elegex.fieldService.foreman.quote.useMutation();
  const complete = trpc.elegex.fieldService.foreman.complete.useMutation();
  const transport = useMemo(() => ({ consent: consent.mutateAsync, checkIn: checkIn.mutateAsync, material: materialMutation.mutateAsync, evidence: evidence.mutateAsync, quote: quote.mutateAsync, complete: complete.mutateAsync }), [consent.mutateAsync, checkIn.mutateAsync, materialMutation.mutateAsync, evidence.mutateAsync, quote.mutateAsync, complete.mutateAsync]);
  const queue = useMemo(() => new SyncQueue({ databaseName: `elegex-foreman-${job.id}`, transport: async mutation => { await submitQueuedForemanMutation(transport, mutation); } }), [job.id, transport]);
  const refreshQueue = useCallback(async () => { const rows = await queue.list(); setQueueDepth(rows.filter(row => row.status === "queued" || row.status === "retrying").length); return rows; }, [queue]);

  useEffect(() => {
    void queue.recoverInterruptedWork().then(refreshQueue).then(onRefresh).catch(error => {
      setSyncState("error");
      setSyncDetail(`Queued field actions could not be recovered: ${error instanceof Error ? error.message : String(error)}`);
    });
    const replay = () => void queue.drain().then(refreshQueue).then(onRefresh);
    window.addEventListener("online", replay);
    return () => window.removeEventListener("online", replay);
  }, [queue, refreshQueue, onRefresh]);

  const queueAction = async (type: ForemanMutationType, payload: Record<string, unknown>, dependencies: string[] = []) => {
    setSyncState("syncing");
    setSyncDetail("Saving the action to the device queue, then attempting tenant-safe replay.");
    const mutation = await queue.enqueue({ type, payload, dependencies });
    if (type === "consent") setConsentId(mutation.id);
    if (type === "checkIn") { setCheckInId(mutation.id); setLocallyCheckedIn(true); }
    await queue.drain();
    const rows = await refreshQueue();
    const saved = rows.find(row => row.id === mutation.id);
    if (saved?.status === "succeeded") { setSyncState("synced"); setSyncDetail("Action replayed to the workspace with its device UUID as the idempotency key."); toast.success("Field action synchronized"); onRefresh(); return; }
    if (saved?.status === "failed") { setSyncState("error"); setSyncDetail(saved.lastError || "The action remains failed in the local queue. Review connectivity and retry by returning online."); toast.error(saved.lastError || "Field action needs attention"); return; }
    setSyncState("ready"); setSyncDetail("Action is safely queued locally and will replay when this browser regains connectivity."); toast.message("Field action queued for replay");
  };

  const pending = syncState === "syncing";
  const activeDependencies = checkInId ? [checkInId] : [];
  return <><button onClick={onBack} className="mb-5 text-sm font-semibold text-[#50617F] hover:text-[#195FE6]">← My field visits</button><header className="rounded-3xl bg-[#12264F] p-6 text-white shadow-[0_18px_44px_rgba(18,38,79,0.18)]"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-bold tracking-[0.18em] text-[#A8C8FF]">FOREMAN JOB CARD</p><h1 className="mt-2 text-2xl font-semibold">{job.jobNumber} · {job.title}</h1><p className="mt-3 flex items-start gap-2 text-sm leading-6 text-[#D4E2FF]"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{job.serviceAddress} · {row.contact.name}</p></div><span className="rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-[#D4E2FF]">{stageLabel(job.stage)}</span></div><SyncPanel state={syncState} detail={syncDetail} queueDepth={queueDepth} /></header><div className="mt-5 grid gap-4 xl:grid-cols-2"><FieldCard title="Typed consent signature" description="A typed-name artifact is stored once, even if a queued replay is retried."><div className="flex gap-2"><Input value={signerName} onChange={event => setSignerName(event.target.value)} placeholder="Type full signer name" className="h-10" /><Button onClick={() => signerName.trim() ? void queueAction("consent", { jobId: job.id, signerName }) : toast.error("Enter the signer’s full name")} disabled={pending} className="bg-[#195FE6]"><PenLine className="mr-2 h-4 w-4" />Sign</Button></div></FieldCard><FieldCard title="Check in" description="Consent is a server-enforced prerequisite. The queued check-in depends on queued consent when applicable."><Button onClick={() => void queueAction("checkIn", { jobId: job.id }, consentId ? [consentId] : [])} disabled={active || pending} className="w-full bg-[#195FE6]">{active ? <><CheckCircle2 className="mr-2 h-4 w-4" />Checked in</> : <><TimerReset className="mr-2 h-4 w-4" />Start on-site work</>}</Button></FieldCard><FieldCard title="Materials" description="Add an auditable field material entry." locked={!active}><div className="flex flex-wrap gap-2"><Input disabled={!active || pending} value={material} onChange={event => setMaterial(event.target.value)} placeholder="Material description" className="min-w-44 flex-1" /><Input disabled={!active || pending} value={quantity} onChange={event => setQuantity(event.target.value)} type="number" min="0.01" className="w-24" /><Button disabled={!active || pending} onClick={() => material.trim() && Number(quantity) > 0 ? void queueAction("material", { jobId: job.id, description: material, quantity: Number(quantity), unit: "each" }, activeDependencies) : toast.error("Enter material and quantity")}><PackagePlus className="mr-2 h-4 w-4" />Add</Button></div></FieldCard><FieldCard title="Field evidence" description="Capture evidence by mode; the completion gate requires evidence or an explicit exception." locked={!active}><div className="grid gap-2 sm:grid-cols-[0.55fr_1fr]"><select disabled={!active || pending} value={evidenceType} onChange={event => setEvidenceType(event.target.value as typeof evidenceType)} className="h-10 rounded-md border border-[#DFE7F3] bg-white px-3 text-sm text-[#34435F] disabled:bg-[#F5F7FB]"><option value="before_photo">Before condition</option><option value="after_photo">After condition</option><option value="note">Field note</option><option value="job_card">Job card</option></select><Input disabled={!active || pending} value={evidenceTitle} onChange={event => setEvidenceTitle(event.target.value)} placeholder="Evidence title" /></div><Textarea disabled={!active || pending} value={note} onChange={event => setNote(event.target.value)} placeholder="Optional site note" className="mt-2 min-h-20" /><Button disabled={!active || pending} onClick={() => evidenceTitle.trim() ? void queueAction("evidence", { jobId: job.id, evidenceType, title: evidenceTitle, note: note || undefined }, activeDependencies) : toast.error("Enter an evidence title")} className="mt-2 w-full"><FilePlus2 className="mr-2 h-4 w-4" />Capture evidence</Button></FieldCard><FieldCard title="Draft quote" description="A field estimate routes to office review; the foreman acknowledgement does not expose the stored numeric price." locked={!active}><div className="flex gap-2"><Input disabled={!active || pending} value={quoteNumber} onChange={event => setQuoteNumber(event.target.value)} placeholder="QT-2609" /><Input disabled={!active || pending} value={quoteTotal} onChange={event => setQuoteTotal(event.target.value)} type="number" min="0" placeholder="ZAR" className="w-28" /></div><Button disabled={!active || pending} onClick={() => quoteNumber.trim() && Number(quoteTotal) >= 0 ? void queueAction("quote", { jobId: job.id, quoteNumber, total: Number(quoteTotal) }, activeDependencies) : toast.error("Enter quote number and total")} className="mt-2 w-full"><ReceiptText className="mr-2 h-4 w-4" />Capture draft quote</Button></FieldCard><FieldCard title="Complete and sync" description="Close the field visit for invoice readiness. Explain any evidence gap explicitly." locked={!active}><Textarea disabled={!active || pending} value={completionException} onChange={event => setCompletionException(event.target.value)} placeholder="Completion exception (required if no evidence exists)" className="mb-2 min-h-20" /><Button disabled={!active || pending} onClick={() => void queueAction("complete", { jobId: job.id, exceptionReason: completionException.trim() || undefined }, activeDependencies)} className="w-full bg-[#167244]"><CheckCircle2 className="mr-2 h-4 w-4" />Complete job for office review</Button></FieldCard></div></>;
}
