export type ProjectReportFilters = {
  status?: string;
  priority?: string;
};

export type ProjectReportRow = {
  code?: string | null;
  project?: string | null;
  status?: string | null;
  priority?: string | null;
  progress?: number | null;
  dueDate?: string | Date | null;
  budget?: number | null;
  contact?: string | null;
};

const csvHeaders = ["Project code", "Project", "Status", "Priority", "Progress", "Due date", "Budget", "Contact"];
const validStatusFilters = new Set(["all", "planning", "active", "on_hold", "complete", "archived"]);
const validPriorityFilters = new Set(["all", "low", "medium", "high", "urgent"]);

export function normalizeProjectReportFilters(filters: ProjectReportFilters | null | undefined) {
  const status = validStatusFilters.has(filters?.status ?? "") ? filters!.status! : "all";
  const priority = validPriorityFilters.has(filters?.priority ?? "") ? filters!.priority! : "all";
  return { status, priority };
}

export function filterProjectReportRows(rows: ProjectReportRow[], filters: ProjectReportFilters) {
  const normalized = normalizeProjectReportFilters(filters);
  return rows.filter(row => (normalized.status === "all" || row.status === normalized.status) && (normalized.priority === "all" || row.priority === normalized.priority));
}

export function escapeCsvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function buildProjectReportCsv(rows: ProjectReportRow[]) {
  const lines = rows.map(row => [
    row.code,
    row.project,
    row.status,
    row.priority,
    row.progress,
    row.dueDate ? new Date(row.dueDate).toISOString().slice(0, 10) : "",
    row.budget ?? "",
    row.contact ?? "",
  ].map(escapeCsvCell).join(","));
  return [csvHeaders.join(","), ...lines].join("\n");
}

export function sortWorkspaceRecords<T extends { name?: string | null; title?: string | null; status?: string | null; updatedAt?: Date | string | null }>(rows: T[], sort: "updated" | "name" | "status") {
  return [...rows].sort((left, right) => {
    if (sort === "name") return String(left.name || left.title || "").localeCompare(String(right.name || right.title || ""));
    if (sort === "status") return String(left.status || "").localeCompare(String(right.status || ""));
    return new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime();
  });
}

export function getPageBounds(total: number, requestedPage: number, pageSize = 8) {
  const pageCount = Math.max(1, Math.ceil(Math.max(0, total) / pageSize));
  const page = Math.min(Math.max(1, requestedPage), pageCount);
  return { page, pageCount, canGoPrevious: page > 1, canGoNext: page < pageCount };
}

export function validateRecordDraft(kind: "contacts" | "projects" | "cases", draft: Record<string, unknown>) {
  if (kind === "contacts" && !String(draft.name || "").trim()) return "A contact name is required";
  if (kind === "projects" && (!String(draft.name || "").trim() || !String(draft.code || "").trim())) return "Project name and code are required";
  if (kind === "cases" && (!String(draft.title || "").trim() || !String(draft.reference || "").trim())) return "Case title and reference are required";
  return null;
}
