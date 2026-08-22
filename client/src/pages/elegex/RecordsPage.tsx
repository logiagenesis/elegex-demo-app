import {
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  Filter,
  FolderKanban,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  UsersRound,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

import { PageHeading } from "../ElegexPages";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatOrganizationDate } from "@/lib/organizationFormat";
import { trpc } from "@/lib/trpc";

type RecordKind = "contacts" | "projects" | "cases";

const kindMeta: Record<
  RecordKind,
  {
    singular: string;
    title: string;
    description: string;
    icon: any;
    statuses: string[];
  }
> = {
  contacts: {
    singular: "contact",
    title: "Contacts",
    description: "Keep relationship intelligence close to the work it informs.",
    icon: UsersRound,
    statuses: ["lead", "active", "inactive"],
  },
  projects: {
    singular: "project",
    title: "Projects",
    description:
      "Manage delivery programmes with a clean view of status, ownership, and momentum.",
    icon: FolderKanban,
    statuses: ["planning", "active", "on_hold", "complete", "archived"],
  },
  cases: {
    singular: "case",
    title: "Cases",
    description:
      "Track sensitive or exception work through a clear, accountable resolution path.",
    icon: BriefcaseBusiness,
    statuses: ["open", "investigating", "pending", "resolved", "closed"],
  },
};

const statusStyles: Record<string, string> = {
  active: "bg-[#DCFCE7] text-[#197A46]",
  planning: "bg-[#EEF2FF] text-[#4F46E5]",
  on_hold: "bg-[#FFF4D6] text-[#A75D00]",
  complete: "bg-[#E7F7F0] text-[#157A57]",
  archived: "bg-[#F1F3F7] text-[#64748B]",
  open: "bg-[#EAF1FF] text-[#195FE6]",
  investigating: "bg-[#F3E8FF] text-[#7E22CE]",
  pending: "bg-[#FFF4D6] text-[#A75D00]",
  resolved: "bg-[#E7F7F0] text-[#157A57]",
  closed: "bg-[#F1F3F7] text-[#64748B]",
  todo: "bg-[#EEF2FF] text-[#4F46E5]",
  in_progress: "bg-[#EAF1FF] text-[#195FE6]",
  blocked: "bg-[#FFF0F2] text-[#C63550]",
  lead: "bg-[#FFF4D6] text-[#A75D00]",
  inactive: "bg-[#F1F3F7] text-[#64748B]",
};

const pretty = (value?: string | null) =>
  (value || "—")
    .replace(/_/g, " ")
    .replace(/\b\w/g, letter => letter.toUpperCase());

function PageLoading() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <Loader2 className="h-6 w-6 animate-spin text-[#91A4C5]" />
    </div>
  );
}

function EmptyState({
  title,
  description,
  action,
  icon: Icon,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon: any;
}) {
  return (
    <div className="elegex-card grid min-h-[400px] place-items-center p-12 text-center">
      <div className="flex max-w-sm flex-col items-center">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#F8FAFC] text-[#91A4C5] shadow-sm ring-1 ring-inset ring-[#E2E8F0]">
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="mt-5 text-base font-semibold text-[#14213D]">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-[#667085]">{description}</p>
        {action && <div className="mt-6">{action}</div>}
      </div>
    </div>
  );
}

export function RecordsPage({ kind }: { kind: RecordKind }) {
  const meta = kindMeta[kind];
  const operational = trpc.elegex.workspace.operationalSettings.useQuery();
  const stamp = (date?: string | Date | null) =>
    date ? formatOrganizationDate(date, operational.data?.settings) : "No date";
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [, setLocation] = useLocation();

  const contacts = trpc.elegex.contacts.list.useQuery(
    {
      query: search,
      status: statusFilter === "all" ? undefined : statusFilter,
      page,
      pageSize: 8,
    },
    { enabled: kind === "contacts" }
  );
  const projects = trpc.elegex.projects.list.useQuery(
    {
      query: search,
      status: statusFilter === "all" ? undefined : statusFilter,
      page,
      pageSize: 8,
    },
    { enabled: kind === "projects" }
  );
  const cases = trpc.elegex.cases.list.useQuery(
    {
      query: search,
      status: statusFilter === "all" ? undefined : statusFilter,
      page,
      pageSize: 8,
    },
    { enabled: kind === "cases" }
  );
  const source =
    kind === "contacts" ? contacts : kind === "projects" ? projects : cases;

  const records = ((source.data?.rows ?? []) as any[]).slice();
  const total = source.data?.total ?? 0;
  const pageCount = Math.ceil(total / 8) || 1;

  return (
    <div className="mx-auto max-w-6xl pb-20">
      <PageHeading
        eyebrow="WORKSPACE RECORDS"
        title={meta.title}
        description={meta.description}
        action={
          <Button
            className="rounded-xl bg-[#195FE6] hover:bg-[#1550C0]"
            onClick={() => setLocation(`/records/${kind}/new`)}
          >
            <Plus className="mr-2 h-4 w-4" />
            New {meta.singular}
          </Button>
        }
      />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#91A4C5]" />
          <Input
            placeholder={`Search ${meta.title.toLowerCase()}...`}
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-xl border-[#DFE7F3] pl-9 shadow-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#91A4C5]" />
            <select
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 appearance-none rounded-xl border border-[#DFE7F3] bg-white pl-9 pr-10 text-sm font-medium text-[#4B5C7A] shadow-sm"
            >
              <option value="all">All statuses</option>
              {meta.statuses.map(s => (
                <option key={s} value={s}>
                  {pretty(s)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {source.isLoading ? (
        <PageLoading />
      ) : !records.length ? (
        <EmptyState
          title={`No ${meta.title.toLowerCase()} found`}
          description={
            search || statusFilter !== "all"
              ? "Try adjusting your filters or search term."
              : `Create your first ${meta.singular} to start tracking work.`
          }
          icon={meta.icon}
          action={
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="elegex-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <tr>
                  <th className="px-6 py-4 font-semibold text-[#4B5C7A]">
                    {meta.singular === "contact" ? "Name" : "Code"}
                  </th>
                  <th className="px-6 py-4 font-semibold text-[#4B5C7A]">
                    {meta.singular === "contact" ? "Company" : "Name"}
                  </th>
                  <th className="px-6 py-4 font-semibold text-[#4B5C7A]">
                    Status
                  </th>
                  <th className="px-6 py-4 font-semibold text-[#4B5C7A]">
                    Last updated
                  </th>
                  <th className="px-6 py-4 font-semibold text-[#4B5C7A]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {records.map((item: any) => (
                  <tr
                    key={item.id}
                    className="group cursor-pointer transition-colors hover:bg-[#F8FAFC]"
                    onClick={() => setLocation(`/records/${kind}/${item.id}`)}
                  >
                    <td className="px-6 py-4 font-medium text-[#14213D]">
                      {meta.singular === "contact"
                        ? `${item.firstName} ${item.lastName}`
                        : (item as any).code}
                    </td>
                    <td className="px-6 py-4 text-[#4B5C7A]">
                      {meta.singular === "contact"
                        ? (item as any).companyName || "—"
                        : item.name}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        className={`${statusStyles[item.status]} border-0 px-2.5 py-1 text-[11px] font-bold`}
                      >
                        {pretty(item.status)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-[#7A879E]">
                      {stamp(item.updatedAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <MoreHorizontal className="h-4 w-4 text-[#91A4C5]" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {total > 0 && (
            <div className="flex items-center justify-between border-t border-[#E2E8F0] px-6 py-4">
              <p className="text-sm text-[#667085]">
                Showing{" "}
                <span className="font-medium">{(page - 1) * 8 + 1}</span> to{" "}
                <span className="font-medium">{Math.min(page * 8, total)}</span>{" "}
                of <span className="font-medium">{total}</span>
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page === pageCount}
                >
                  Next <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
