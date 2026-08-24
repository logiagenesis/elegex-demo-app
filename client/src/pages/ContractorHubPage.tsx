import {
  Bot,
  CalendarClock,
  CircleDollarSign,
  ClipboardList,
  FileText,
  Gauge,
  Megaphone,
  ShieldCheck,
  UsersRound,
  Wrench,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { canManageOperationalControls } from "@/lib/access";
import { trpc } from "@/lib/trpc";

const pageShell =
  "rounded-[1.5rem] border border-[#E4EAF4] bg-white p-5 shadow-[0_12px_34px_rgba(21,49,94,0.06)]";

const money = (value: number) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value / 100);

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-[#E6ECF6] bg-[#FBFCFF] p-4">
      <p className="text-[11px] font-bold tracking-[0.15em] text-[#6E7B90]">
        {label.toUpperCase()}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#14213D]">
        {value}
      </p>
      <p className="mt-1 text-xs text-[#667085]">{detail}</p>
    </div>
  );
}

export default function ContractorHubPage() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [message, setMessage] = useState<string | null>(null);
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [assistantResult, setAssistantResult] = useState<string | null>(null);
  const [profileSummary, setProfileSummary] = useState("");
  const [profileServices, setProfileServices] = useState("");
  const [profileAreas, setProfileAreas] = useState("");
  const [repairTitle, setRepairTitle] = useState("");
  const [repairDescription, setRepairDescription] = useState("");
  const [maintenanceTitle, setMaintenanceTitle] = useState("");
  const [maintenanceInterval, setMaintenanceInterval] = useState("90");
  const [marketplaceName, setMarketplaceName] = useState("");
  const [marketplaceTrade, setMarketplaceTrade] = useState("");
  const [marketplaceAreas, setMarketplaceAreas] = useState("");
  const [marketingText, setMarketingText] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [activeTimeEntryId, setActiveTimeEntryId] = useState<number | null>(
    null
  );
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");

  const overview = trpc.elegex.contractor.overview.useQuery();
  const workspace = trpc.elegex.workspace.current.useQuery();
  const jobs = trpc.elegex.fieldService.jobs.list.useQuery({ pageSize: 25 });
  const updateProfile = trpc.elegex.contractor.profile.update.useMutation({
    onSuccess: async () => {
      setMessage("Public profile saved.");
      await utils.elegex.contractor.overview.invalidate();
    },
  });
  const bookingStatus = trpc.elegex.contractor.bookings.setStatus.useMutation({
    onSuccess: async () => utils.elegex.contractor.overview.invalidate(),
  });
  const assistant = trpc.elegex.ai.generateDraft.useMutation({
    onSuccess: result =>
      setAssistantResult(
        result.text ??
          "AI drafting is unavailable until the workspace AI provider is configured."
      ),
  });
  const repair = trpc.elegex.contractor.repairs.create.useMutation({
    onSuccess: async () => {
      setRepairTitle("");
      setRepairDescription("");
      setMessage("Reactive repair report saved.");
      await utils.elegex.contractor.overview.invalidate();
    },
  });
  const maintenance = trpc.elegex.contractor.maintenance.create.useMutation({
    onSuccess: async () => {
      setMaintenanceTitle("");
      setMessage("Preventative maintenance plan saved.");
      await utils.elegex.contractor.overview.invalidate();
    },
  });
  const marketplace = trpc.elegex.contractor.marketplace.create.useMutation({
    onSuccess: async () => {
      setMarketplaceName("");
      setMarketplaceTrade("");
      setMarketplaceAreas("");
      setMessage(
        "Marketplace record saved with its stated verification status."
      );
      await utils.elegex.contractor.overview.invalidate();
    },
  });
  const marketing = trpc.elegex.contractor.marketing.create.useMutation({
    onSuccess: async () => {
      setMarketingText("");
      setMessage(
        "Marketing draft saved for review; nothing was posted externally."
      );
      await utils.elegex.contractor.overview.invalidate();
    },
  });
  const completeGuide = trpc.elegex.contractor.growthGuide.complete.useMutation(
    {
      onSuccess: async () => utils.elegex.contractor.overview.invalidate(),
    }
  );
  const timeStart = trpc.elegex.contractor.time.start.useMutation({
    onSuccess: result => {
      setActiveTimeEntryId(result.id);
      setMessage("Time entry started for the selected job.");
    },
  });
  const timeEnd = trpc.elegex.contractor.time.end.useMutation({
    onSuccess: () => {
      setActiveTimeEntryId(null);
      setMessage("Time entry ended.");
    },
  });
  const expense = trpc.elegex.contractor.expenses.create.useMutation({
    onSuccess: async () => {
      setExpenseDescription("");
      setExpenseAmount("");
      setMessage("Job expense recorded.");
      await utils.elegex.contractor.overview.invalidate();
    },
  });
  const invoice = trpc.elegex.contractor.invoices.create.useMutation({
    onSuccess: async () => {
      setInvoiceNumber("");
      setInvoiceAmount("");
      setMessage(
        "Draft invoice created; payment collection remains manual until Stripe is configured."
      );
      await utils.elegex.contractor.overview.invalidate();
    },
  });
  const review = trpc.elegex.contractor.reviews.create.useMutation({
    onSuccess: async () => {
      setMessage(
        "Consent-confirmed review request queued as an internal record."
      );
      await utils.elegex.contractor.overview.invalidate();
    },
  });

  const data = overview.data;
  const canManage = canManageOperationalControls(workspace.data?.role);
  const activeRepairs = useMemo(
    () =>
      data?.repairs.filter(
        report => !["resolved", "closed"].includes(report.status)
      ) ?? [],
    [data]
  );
  const nextMaintenance = data?.maintenance.slice(0, 3) ?? [];
  const jobOptions = jobs.data?.rows ?? [];
  const parsedJobId = Number(selectedJobId) || undefined;

  if (overview.isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-sm text-[#667085]">
        Loading contractor operations…
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-[1500px] space-y-6 pb-12">
      <section className="overflow-hidden rounded-[1.75rem] bg-[#142B57] p-6 text-white shadow-[0_20px_50px_rgba(15,38,80,0.18)] sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <p className="text-xs font-bold tracking-[0.18em] text-[#A9C9FF]">
              CONTRACTOR OPERATING SYSTEM
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
              From first enquiry to accountable close-out.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#D7E6FF]">
              This workspace connects bookings, quotes, jobs, invoices, field
              evidence, maintenance, controlled marketplace records, and
              reviewed AI drafts in one tenant-scoped system.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              className="bg-white text-[#142B57] hover:bg-[#EAF2FF]"
              onClick={() => setLocation("/dispatch")}
            >
              Open scheduling
            </Button>
            <Button
              variant="outline"
              className="border-white/35 text-white hover:bg-white/10"
              onClick={() => setLocation("/photos")}
            >
              Field evidence
            </Button>
          </div>
        </div>
      </section>

      {message && (
        <div className="rounded-xl border border-[#B7E5CD] bg-[#F0FCF5] px-4 py-3 text-sm text-[#126A43]">
          {message}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric
          label="New bookings"
          value={
            data?.bookings.filter(item => item.status === "new").length ?? 0
          }
          detail="Consent-based public requests"
        />
        <Metric
          label="Open repairs"
          value={activeRepairs.length}
          detail="Reactive reports needing review"
        />
        <Metric
          label="Maintenance"
          value={
            data?.maintenance.filter(item => item.status === "active").length ??
            0
          }
          detail="Active preventative plans"
        />
        <Metric
          label="Invoiced value"
          value={money(
            (data?.invoices ?? []).reduce(
              (sum, item) => sum + item.amountDue,
              0
            )
          )}
          detail="Tracked invoice records"
        />
        <Metric
          label="Team directory"
          value={data?.marketplace.length ?? 0}
          detail="External collaborators, transparently classified"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className={pageShell}>
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-[#E9F1FF] p-2 text-[#195FE6]">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold tracking-[0.15em] text-[#195FE6]">
                REVIEWED AI ASSISTANT
              </p>
              <h2 className="mt-1 text-xl font-semibold text-[#14213D]">
                Ask for a draft, not an irreversible action.
              </h2>
            </div>
          </div>
          <Textarea
            value={assistantPrompt}
            onChange={event => setAssistantPrompt(event.target.value)}
            className="mt-4 min-h-28"
            placeholder="For example: Draft a quote scope for replacing two damaged valves, or summarise the actions before a repair visit."
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              disabled={
                assistant.isPending || assistantPrompt.trim().length < 10
              }
              onClick={() =>
                assistant.mutate({
                  feature: "operations_assistant",
                  sourceText: assistantPrompt,
                })
              }
            >
              {assistant.isPending ? "Drafting…" : "Draft operations response"}
            </Button>
            <Button
              variant="outline"
              disabled={
                assistant.isPending || assistantPrompt.trim().length < 10
              }
              onClick={() =>
                assistant.mutate({
                  feature: "quote_draft",
                  sourceText: assistantPrompt,
                })
              }
            >
              Draft quote scope
            </Button>
            <Button
              variant="outline"
              disabled={
                assistant.isPending || assistantPrompt.trim().length < 10
              }
              onClick={() =>
                assistant.mutate({
                  feature: "marketing_draft",
                  sourceText: assistantPrompt,
                })
              }
            >
              Draft social post
            </Button>
          </div>
          <p className="mt-3 text-xs leading-5 text-[#667085]">
            Every AI output requires human review. The assistant cannot send
            invoices, publish posts, dispatch crews, or make payments.
          </p>
          {assistantResult && (
            <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-[#F7F9FD] p-4 text-sm leading-6 text-[#334155]">
              {assistantResult}
            </pre>
          )}
        </div>

        <div className={pageShell}>
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-[#EEF9F4] p-2 text-[#16794D]">
              <Gauge className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold tracking-[0.15em] text-[#16794D]">
                PUBLIC PROFILE & BOOKING
              </p>
              <h2 className="mt-1 text-xl font-semibold text-[#14213D]">
                Control what customers see.
              </h2>
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#667085]">
            Public requests are consent-gated and land in the booking queue. No
            customer testimonials or ratings are fabricated.
          </p>
          {canManage && (
            <>
              <Input
                className="mt-4"
                value={profileSummary}
                onChange={event => setProfileSummary(event.target.value)}
                placeholder={
                  data?.profile.summary ?? "Short public business summary"
                }
              />
              <Input
                className="mt-3"
                value={profileServices}
                onChange={event => setProfileServices(event.target.value)}
                placeholder="Services, separated by commas"
              />
              <Input
                className="mt-3"
                value={profileAreas}
                onChange={event => setProfileAreas(event.target.value)}
                placeholder="Service areas, separated by commas"
              />
            </>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {canManage && (
              <Button
                disabled={updateProfile.isPending}
                onClick={() =>
                  updateProfile.mutate({
                    summary: profileSummary || undefined,
                    services: profileServices
                      ? profileServices
                          .split(",")
                          .map(value => value.trim())
                          .filter(Boolean)
                      : undefined,
                    serviceAreas: profileAreas
                      ? profileAreas
                          .split(",")
                          .map(value => value.trim())
                          .filter(Boolean)
                      : undefined,
                  })
                }
              >
                Save profile
              </Button>
            )}
            {data?.profile && (
              <Link
                href={`/book/${data.profile.slug}`}
                className="inline-flex items-center rounded-lg border border-[#CFE0FA] px-3 py-2 text-sm font-semibold text-[#195FE6]"
              >
                Open public booking page
              </Link>
            )}
          </div>
          {!canManage && (
            <p className="mt-3 text-xs text-[#667085]">
              A manager can update public profile and booking controls; field
              members can still view the public page.
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className={pageShell}>
          <div className="flex items-center gap-2 text-[#195FE6]">
            <CalendarClock className="h-5 w-5" />
            <p className="text-xs font-bold tracking-[0.15em]">
              SCHEDULING & MAINTENANCE
            </p>
          </div>
          <h2 className="mt-2 text-xl font-semibold text-[#14213D]">
            Planned work stays visible.
          </h2>
          <div className="mt-4 space-y-2">
            {nextMaintenance.map(plan => (
              <div
                key={plan.id}
                className="rounded-xl border border-[#E6ECF6] p-3"
              >
                <p className="font-medium text-[#14213D]">{plan.title}</p>
                <p className="mt-1 text-xs text-[#667085]">
                  Due {new Date(plan.nextDueAt).toLocaleDateString()} · every{" "}
                  {plan.intervalDays} days
                </p>
              </div>
            ))}
            {!nextMaintenance.length && (
              <p className="text-sm text-[#667085]">
                No maintenance plans yet.
              </p>
            )}
          </div>
          {canManage && (
            <>
              <Input
                className="mt-4"
                value={maintenanceTitle}
                onChange={event => setMaintenanceTitle(event.target.value)}
                placeholder="Maintenance plan title"
              />
              <Input
                className="mt-3"
                type="number"
                value={maintenanceInterval}
                onChange={event => setMaintenanceInterval(event.target.value)}
                placeholder="Interval days"
              />
              <Button
                className="mt-3"
                disabled={
                  maintenance.isPending || maintenanceTitle.trim().length < 3
                }
                onClick={() =>
                  maintenance.mutate({
                    title: maintenanceTitle,
                    intervalDays: Number(maintenanceInterval) || 90,
                    nextDueAt: new Date(
                      Date.now() +
                        (Number(maintenanceInterval) || 90) * 86_400_000
                    ),
                  })
                }
              >
                Create maintenance plan
              </Button>
            </>
          )}
          <button
            className="mt-3 block text-sm font-semibold text-[#195FE6]"
            onClick={() => setLocation("/dispatch")}
          >
            Open dispatch calendar →
          </button>
        </div>

        <div className={pageShell}>
          <div className="flex items-center gap-2 text-[#C7501A]">
            <Wrench className="h-5 w-5" />
            <p className="text-xs font-bold tracking-[0.15em]">
              REACTIVE REPAIRS
            </p>
          </div>
          <h2 className="mt-2 text-xl font-semibold text-[#14213D]">
            Report, triage, and resolve.
          </h2>
          <div className="mt-4 max-h-40 space-y-2 overflow-auto">
            {activeRepairs.map(report => (
              <div
                key={report.id}
                className="rounded-xl border border-[#F2E4DB] p-3"
              >
                <p className="font-medium text-[#14213D]">{report.title}</p>
                <p className="mt-1 text-xs text-[#9A5A34]">
                  {report.priority} · {report.status.replace("_", " ")}
                </p>
              </div>
            ))}
            {!activeRepairs.length && (
              <p className="text-sm text-[#667085]">
                No open reactive repairs.
              </p>
            )}
          </div>
          <Input
            className="mt-4"
            value={repairTitle}
            onChange={event => setRepairTitle(event.target.value)}
            placeholder="Repair report title"
          />
          <Textarea
            className="mt-3 min-h-20"
            value={repairDescription}
            onChange={event => setRepairDescription(event.target.value)}
            placeholder="What needs attention?"
          />
          <Button
            className="mt-3"
            disabled={
              repair.isPending ||
              repairTitle.trim().length < 3 ||
              repairDescription.trim().length < 5
            }
            onClick={() =>
              repair.mutate({
                title: repairTitle,
                description: repairDescription,
              })
            }
          >
            Create repair report
          </Button>
        </div>

        <div className={pageShell}>
          <div className="flex items-center gap-2 text-[#7A4FB8]">
            <CircleDollarSign className="h-5 w-5" />
            <p className="text-xs font-bold tracking-[0.15em]">
              COMMERCIAL CONTROL
            </p>
          </div>
          <h2 className="mt-2 text-xl font-semibold text-[#14213D]">
            Quotes, invoices, and costs.
          </h2>
          <div className="mt-4 space-y-2 text-sm">
            <p className="flex justify-between">
              <span className="text-[#667085]">Invoices tracked</span>
              <strong>{data?.invoices.length ?? 0}</strong>
            </p>
            <p className="flex justify-between">
              <span className="text-[#667085]">Expenses recorded</span>
              <strong>{data?.expenses.length ?? 0}</strong>
            </p>
            <p className="flex justify-between">
              <span className="text-[#667085]">Payment provider</span>
              <strong>Manual / Stripe-ready</strong>
            </p>
          </div>
          <p className="mt-5 rounded-xl bg-[#FFF8EE] p-3 text-xs leading-5 text-[#8B5C1B]">
            Online Stripe checkout is intentionally unavailable until the
            workspace owner configures Stripe keys in project payment settings.
            No payment is simulated or collected by this release.
          </p>
          <button
            className="mt-4 block text-sm font-semibold text-[#195FE6]"
            onClick={() => setLocation("/jobs")}
          >
            Open job commercial hand-off →
          </button>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className={pageShell}>
          <div className="flex items-center gap-2 text-[#195FE6]">
            <CalendarClock className="h-5 w-5" />
            <p className="text-xs font-bold tracking-[0.15em]">TIME ON SITE</p>
          </div>
          <h2 className="mt-2 text-xl font-semibold text-[#14213D]">
            Clock job work transparently.
          </h2>
          <select
            value={selectedJobId}
            onChange={event => setSelectedJobId(event.target.value)}
            className="mt-4 h-10 w-full rounded-lg border border-[#DDE6F3] bg-white px-3 text-sm text-[#334155]"
          >
            <option value="">Select a job</option>
            {jobOptions.map(row => (
              <option key={row.job.id} value={row.job.id}>
                #{row.job.jobNumber} · {row.job.title}
              </option>
            ))}
          </select>
          {activeTimeEntryId ? (
            <Button
              className="mt-3"
              disabled={timeEnd.isPending}
              onClick={() => timeEnd.mutate({ id: activeTimeEntryId })}
            >
              End active time entry
            </Button>
          ) : (
            <Button
              className="mt-3"
              disabled={!parsedJobId || timeStart.isPending}
              onClick={() =>
                timeStart.mutate({
                  jobId: parsedJobId!,
                  geoStatus: "not_requested",
                })
              }
            >
              Start time entry
            </Button>
          )}
          <p className="mt-3 text-xs leading-5 text-[#667085]">
            Location is never claimed as verified unless a supported workflow
            records it.
          </p>
        </div>
        <div className={pageShell}>
          <div className="flex items-center gap-2 text-[#C7501A]">
            <FileText className="h-5 w-5" />
            <p className="text-xs font-bold tracking-[0.15em]">JOB EXPENSE</p>
          </div>
          <h2 className="mt-2 text-xl font-semibold text-[#14213D]">
            Keep job costs attached.
          </h2>
          <Input
            className="mt-4"
            value={expenseDescription}
            onChange={event => setExpenseDescription(event.target.value)}
            placeholder="Materials, travel, or equipment"
          />
          <Input
            className="mt-3"
            type="number"
            value={expenseAmount}
            onChange={event => setExpenseAmount(event.target.value)}
            placeholder="Amount in cents"
          />
          <Button
            className="mt-3"
            disabled={
              !parsedJobId ||
              expense.isPending ||
              expenseDescription.trim().length < 2 ||
              Number(expenseAmount) <= 0
            }
            onClick={() =>
              expense.mutate({
                jobId: parsedJobId!,
                category: "materials",
                amount: Number(expenseAmount),
                description: expenseDescription,
              })
            }
          >
            Record expense
          </Button>
          <p className="mt-3 text-xs leading-5 text-[#667085]">
            Receipt storage can be linked through the existing document and
            photo evidence workflows.
          </p>
        </div>
        <div className={pageShell}>
          <div className="flex items-center gap-2 text-[#16794D]">
            <CircleDollarSign className="h-5 w-5" />
            <p className="text-xs font-bold tracking-[0.15em]">
              INVOICES & REVIEW REQUESTS
            </p>
          </div>
          <h2 className="mt-2 text-xl font-semibold text-[#14213D]">
            Manager-controlled customer follow-up.
          </h2>
          {canManage ? (
            <>
              <Input
                className="mt-4"
                value={invoiceNumber}
                onChange={event => setInvoiceNumber(event.target.value)}
                placeholder="Invoice number"
              />
              <Input
                className="mt-3"
                type="number"
                value={invoiceAmount}
                onChange={event => setInvoiceAmount(event.target.value)}
                placeholder="Invoice amount in cents"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  disabled={
                    !parsedJobId ||
                    invoice.isPending ||
                    invoiceNumber.trim().length < 3 ||
                    Number(invoiceAmount) < 0
                  }
                  onClick={() =>
                    invoice.mutate({
                      jobId: parsedJobId!,
                      invoiceNumber,
                      amountDue: Number(invoiceAmount),
                    })
                  }
                >
                  Create draft invoice
                </Button>
                <Button
                  variant="outline"
                  disabled={!parsedJobId || review.isPending}
                  onClick={() =>
                    review.mutate({
                      jobId: parsedJobId!,
                      channel: "manual",
                      consentConfirmed: true,
                    })
                  }
                >
                  Record consented review request
                </Button>
              </div>
            </>
          ) : (
            <p className="mt-4 rounded-xl bg-[#F7F9FD] p-3 text-sm leading-6 text-[#667085]">
              Invoices and review requests are available to operational
              managers. Your member role can record time, expenses, repairs, and
              field evidence.
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className={pageShell}>
          <div className="flex items-center gap-2 text-[#8B5C1B]">
            <Megaphone className="h-5 w-5" />
            <p className="text-xs font-bold tracking-[0.15em]">
              MARKETING & REPUTATION
            </p>
          </div>
          <h2 className="mt-2 text-xl font-semibold text-[#14213D]">
            Turn real job outcomes into reviewable drafts.
          </h2>
          {canManage && (
            <>
              <Textarea
                className="mt-4 min-h-24"
                value={marketingText}
                onChange={event => setMarketingText(event.target.value)}
                placeholder="Write or paste a social-post draft based on a completed job. It will remain internal until you publish it yourself."
              />
              <Button
                className="mt-3"
                disabled={
                  marketing.isPending || marketingText.trim().length < 10
                }
                onClick={() =>
                  marketing.mutate({
                    channel: "general",
                    source: "manual",
                    content: marketingText,
                  })
                }
              >
                Save marketing draft
              </Button>
            </>
          )}
          <div className="mt-4 rounded-xl border border-[#F0E4D2] bg-[#FFFCF6] p-3 text-xs leading-5 text-[#7A5B31]">
            {data?.reviews.length ?? 0} review-request records are tracked.
            Requests require an explicit consent confirmation; the application
            does not create reviews or ratings.
          </div>
        </div>

        <div className={pageShell}>
          <div className="flex items-center gap-2 text-[#16794D]">
            <UsersRound className="h-5 w-5" />
            <p className="text-xs font-bold tracking-[0.15em]">
              CONTRACTOR MARKETPLACE
            </p>
          </div>
          <h2 className="mt-2 text-xl font-semibold text-[#14213D]">
            Maintain a controlled collaborator directory.
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#667085]">
            Records state their verification and availability explicitly. They
            do not imply endorsement or external vetting.
          </p>
          <div className="mt-4 max-h-28 space-y-2 overflow-auto">
            {data?.marketplace.slice(0, 3).map(entry => (
              <div
                key={entry.id}
                className="rounded-xl border border-[#E2F0E9] p-3 text-sm"
              >
                <strong>{entry.name}</strong>
                <span className="ml-2 text-[#667085]">
                  {entry.trade} ·{" "}
                  {entry.verificationStatus.replaceAll("_", " ")}
                </span>
              </div>
            ))}
          </div>
          {canManage && (
            <>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Input
                  value={marketplaceName}
                  onChange={event => setMarketplaceName(event.target.value)}
                  placeholder="Contractor name"
                />
                <Input
                  value={marketplaceTrade}
                  onChange={event => setMarketplaceTrade(event.target.value)}
                  placeholder="Trade"
                />
              </div>
              <Input
                className="mt-2"
                value={marketplaceAreas}
                onChange={event => setMarketplaceAreas(event.target.value)}
                placeholder="Service areas, separated by commas"
              />
              <Button
                className="mt-3"
                disabled={
                  marketplace.isPending ||
                  marketplaceName.trim().length < 2 ||
                  marketplaceTrade.trim().length < 2 ||
                  marketplaceAreas.trim().length < 2
                }
                onClick={() =>
                  marketplace.mutate({
                    name: marketplaceName,
                    trade: marketplaceTrade,
                    serviceAreas: marketplaceAreas
                      .split(",")
                      .map(value => value.trim())
                      .filter(Boolean),
                  })
                }
              >
                Add controlled entry
              </Button>
            </>
          )}
        </div>
      </section>

      <section className={pageShell}>
        <div className="flex items-center gap-2 text-[#195FE6]">
          <ClipboardList className="h-5 w-5" />
          <p className="text-xs font-bold tracking-[0.15em]">GROWTH GUIDE</p>
        </div>
        <h2 className="mt-2 text-xl font-semibold text-[#14213D]">
          Build practical marketing habits in sequence.
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data?.guide.map(track => (
            <div
              key={track.source}
              className="rounded-2xl border border-[#E6ECF6] p-4"
            >
              <div className="flex justify-between gap-3">
                <p className="font-semibold text-[#14213D]">
                  {track.source.replaceAll("_", " ")}
                </p>
                <span className="text-xs font-bold text-[#195FE6]">
                  Level {track.level}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {track.steps.map(step => {
                  const done = track.completedSteps.includes(step);
                  return (
                    <button
                      key={step}
                      disabled={done || completeGuide.isPending}
                      onClick={() =>
                        completeGuide.mutate({ source: track.source, step })
                      }
                      className={`w-full rounded-xl border p-2 text-left text-xs ${done ? "border-[#BFE8D2] bg-[#F0FCF5] text-[#16794D]" : "border-[#E6ECF6] text-[#667085] hover:border-[#A8C8FF]"}`}
                    >
                      {done ? "Completed · " : "Complete · "}
                      {step}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 rounded-[1.5rem] border border-[#D9E5F7] bg-[#F8FBFF] p-5 md:grid-cols-3">
        <div>
          <ShieldCheck className="h-5 w-5 text-[#16794D]" />
          <h3 className="mt-2 font-semibold text-[#14213D]">
            Role-aware operations
          </h3>
          <p className="mt-1 text-sm leading-6 text-[#667085]">
            Member access supports field work; manager and owner roles retain
            sensitive commercial and configuration controls.
          </p>
        </div>
        <div>
          <FileText className="h-5 w-5 text-[#195FE6]" />
          <h3 className="mt-2 font-semibold text-[#14213D]">
            Audit-friendly records
          </h3>
          <p className="mt-1 text-sm leading-6 text-[#667085]">
            Bookings, repairs, maintenance, invoices, and draft content remain
            tenant-scoped database records.
          </p>
        </div>
        <div>
          <Bot className="h-5 w-5 text-[#7A4FB8]" />
          <h3 className="mt-2 font-semibold text-[#14213D]">
            No hidden automation
          </h3>
          <p className="mt-1 text-sm leading-6 text-[#667085]">
            AI suggestions require review; the app does not publish, pay,
            invite, or make compliance decisions automatically.
          </p>
        </div>
      </section>
    </main>
  );
}
