import {
  Archive,
  Camera,
  FolderPlus,
  ImageIcon,
  Layers3,
  Loader2,
  Search,
  ShieldCheck,
  UploadCloud,
  UsersRound,
  Wrench,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  canAccessWorkspaceAdministration,
  canManageOperationalControls,
} from "@/lib/access";
import { trpc } from "@/lib/trpc";

const categories = [
  "before",
  "during",
  "after",
  "issue",
  "asset",
  "other",
] as const;
type Category = (typeof categories)[number];

const categoryLabel = (value: string) =>
  value.slice(0, 1).toUpperCase() + value.slice(1);
const dateTimeInput = (date: Date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);

function toPositiveInteger(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export default function PhotoLibraryPage() {
  const utils = trpc.useUtils();
  const workspace = trpc.elegex.workspace.current.useQuery();
  const folders = trpc.elegex.photos.folders.useQuery();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | Category>("all");
  const [projectFilter, setProjectFilter] = useState("");
  const [folderFilter, setFolderFilter] = useState("");
  const [tradeFilter, setTradeFilter] = useState("all");
  const [jobFilter, setJobFilter] = useState("");
  const [siteFilter, setSiteFilter] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [uploadCategory, setUploadCategory] = useState<Category>("other");
  const [uploadProjectId, setUploadProjectId] = useState("");
  const [uploadFolderId, setUploadFolderId] = useState("");
  const [jobId, setJobId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [capturedAt, setCapturedAt] = useState(() => dateTimeInput(new Date()));
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [newFolderProjectId, setNewFolderProjectId] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderTrade, setNewFolderTrade] = useState("Shared field evidence");

  const projectOptions = useMemo(() => {
    const values = new Map<number, string>();
    for (const folder of folders.data ?? []) {
      values.set(folder.projectId, folder.projectName);
    }
    return Array.from(values, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [folders.data]);
  const uploadFolders = useMemo(
    () =>
      (folders.data ?? []).filter(
        folder => folder.projectId === toPositiveInteger(uploadProjectId)
      ),
    [folders.data, uploadProjectId]
  );
  const filterFolders = useMemo(
    () =>
      (folders.data ?? []).filter(
        folder =>
          !projectFilter ||
          folder.projectId === toPositiveInteger(projectFilter)
      ),
    [folders.data, projectFilter]
  );
  const trades = useMemo(
    () =>
      Array.from(
        new Set((folders.data ?? []).map(folder => folder.trade))
      ).sort(),
    [folders.data]
  );
  const listInput = useMemo(
    () => ({
      query: query.trim() || undefined,
      category: category === "all" ? undefined : category,
      projectId: toPositiveInteger(projectFilter),
      folderId: toPositiveInteger(folderFilter),
      contributorTrade: tradeFilter === "all" ? undefined : tradeFilter,
      jobId: toPositiveInteger(jobFilter),
      siteId: toPositiveInteger(siteFilter),
      pageSize: 48,
    }),
    [
      category,
      folderFilter,
      jobFilter,
      projectFilter,
      query,
      siteFilter,
      tradeFilter,
    ]
  );
  const photos = trpc.elegex.photos.list.useQuery(listInput);
  const canManage = canManageOperationalControls(
    workspace.data?.role ?? "viewer"
  );
  const canMaterialize = canAccessWorkspaceAdministration(
    workspace.data?.role ?? "viewer"
  );

  const invalidateLibrary = () => {
    void utils.elegex.photos.invalidate();
  };
  const upload = trpc.elegex.photos.upload.useMutation({
    onSuccess: () => {
      toast.success("Photo stored in the shared project folder");
      setPendingFile(null);
      setTitle("");
      setDescription("");
      setTags("");
      setJobId("");
      setSiteId("");
      setCapturedAt(dateTimeInput(new Date()));
      invalidateLibrary();
    },
    onError: error => toast.error(error.message),
  });
  const archive = trpc.elegex.photos.archive.useMutation({
    onSuccess: () => {
      toast.success("Photo removed from the active library");
      invalidateLibrary();
    },
    onError: error => toast.error(error.message),
  });
  const createFolder = trpc.elegex.photos.createFolder.useMutation({
    onSuccess: () => {
      toast.success("Project photo folder created");
      setNewFolderName("");
      void utils.elegex.photos.folders.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const materialize = trpc.elegex.photos.materializeDemoCorpus.useMutation({
    onSuccess: result => {
      toast.success(
        `${result.total} synthetic placeholders are ready across ${result.projects} projects`
      );
      invalidateLibrary();
      void utils.elegex.photos.folders.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const selectFile = (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Choose a JPEG, PNG, or WebP photo");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast.error("Photos must be 25 MB or smaller");
      return;
    }
    setPendingFile(file);
    if (!title.trim()) {
      setTitle(file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "));
    }
  };

  const submitUpload = () => {
    if (!pendingFile) return toast.error("Choose a site photograph first");
    if (!toPositiveInteger(uploadProjectId)) {
      return toast.error("Choose the project that owns this photograph");
    }
    if (!toPositiveInteger(uploadFolderId)) {
      return toast.error("Choose the destination project folder");
    }
    if (title.trim().length < 2) return toast.error("Add a clear photo title");
    const reader = new FileReader();
    reader.onerror = () => toast.error("The selected photo could not be read");
    reader.onload = () =>
      upload.mutate({
        fileName: pendingFile.name,
        mimeType: pendingFile.type as "image/jpeg" | "image/png" | "image/webp",
        dataUrl: String(reader.result),
        title: title.trim(),
        description: description.trim() || undefined,
        tags: tags
          .split(",")
          .map(tag => tag.trim())
          .filter(Boolean),
        category: uploadCategory,
        projectId: toPositiveInteger(uploadProjectId),
        folderId: toPositiveInteger(uploadFolderId),
        jobId: toPositiveInteger(jobId),
        siteId: toPositiveInteger(siteId),
        capturedAt: capturedAt ? new Date(capturedAt) : undefined,
      });
    reader.readAsDataURL(pendingFile);
  };

  const resetFilters = () => {
    setQuery("");
    setCategory("all");
    setProjectFilter("");
    setFolderFilter("");
    setTradeFilter("all");
    setJobFilter("");
    setSiteFilter("");
  };

  return (
    <div>
      <header className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="elegex-eyebrow">SHARED PROJECT PHOTO DATABASE</p>
          <h1 className="elegex-page-title mt-2">Project evidence library</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#667085]">
            Every approved field contributor stores work in the same tenant
            database, organized by project and folder. Use the structure to
            review electrical, plumbing, tiling, and close-out evidence
            together.
          </p>
        </div>
        <div className="rounded-2xl border border-[#D8E5FA] bg-[#F7FAFF] px-4 py-3 text-xs leading-5 text-[#50617F]">
          <ShieldCheck className="mr-2 inline h-4 w-4 text-[#195FE6]" />
          Real image bytes remain in managed storage; placeholder records are
          visibly marked synthetic and store no image blob.
        </div>
      </header>

      <section className="elegex-card mb-6 overflow-hidden p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="elegex-eyebrow">FOLDER STRUCTURE</p>
            <h2 className="mt-1 text-lg font-semibold text-[#14213D]">
              Browse evidence by project
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="border-0 bg-[#EEF4FF] text-[#195FE6]">
              {projectOptions.length} projects
            </Badge>
            <Badge className="border-0 bg-[#F1FAF6] text-[#237A50]">
              {folders.data?.length ?? 0} active folders
            </Badge>
            {canMaterialize ? (
              <Button
                type="button"
                size="sm"
                className="h-8 rounded-lg bg-[#195FE6] text-xs hover:bg-[#124FC3]"
                onClick={() => materialize.mutate()}
                disabled={materialize.isPending}
              >
                {materialize.isPending ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Layers3 className="mr-2 h-3.5 w-3.5" />
                )}
                Build 540-photo demo pack
              </Button>
            ) : null}
          </div>
        </div>
        <div className="mt-5 flex gap-3 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => {
              setProjectFilter("");
              setFolderFilter("");
            }}
            className={`min-w-44 rounded-xl border p-3 text-left transition ${
              !projectFilter
                ? "border-[#195FE6] bg-[#F3F7FF]"
                : "border-[#E4EAF4] bg-white hover:border-[#B6D4FF]"
            }`}
          >
            <span className="text-xs font-semibold text-[#195FE6]">
              ALL PROJECTS
            </span>
            <span className="mt-1 block text-sm font-semibold text-[#24324D]">
              Shared library
            </span>
            <span className="mt-1 block text-xs text-[#7A879E]">
              Browse across trades
            </span>
          </button>
          {filterFolders.map(folder => (
            <button
              key={folder.id}
              type="button"
              onClick={() => {
                setProjectFilter(String(folder.projectId));
                setFolderFilter(String(folder.id));
              }}
              className={`min-w-52 rounded-xl border p-3 text-left transition ${
                folderFilter === String(folder.id)
                  ? "border-[#195FE6] bg-[#F3F7FF]"
                  : "border-[#E4EAF4] bg-white hover:border-[#B6D4FF]"
              }`}
            >
              <span className="block truncate text-[10px] font-bold tracking-[0.13em] text-[#195FE6]">
                {folder.projectName}
              </span>
              <span className="mt-1 block truncate text-sm font-semibold text-[#24324D]">
                {folder.name}
              </span>
              <span className="mt-1 block text-xs text-[#7A879E]">
                {folder.trade}
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-6 2xl:grid-cols-[380px_minmax(0,1fr)]">
        <section className="elegex-card h-fit p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#EAF1FF] text-[#195FE6]">
              <UploadCloud className="h-5 w-5" />
            </span>
            <div>
              <p className="elegex-eyebrow">SHARED SITE UPLOAD</p>
              <h2 className="mt-1 text-lg font-semibold text-[#14213D]">
                Add to a project folder
              </h2>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="photo-project">Project</Label>
              <select
                id="photo-project"
                value={uploadProjectId}
                onChange={event => {
                  setUploadProjectId(event.target.value);
                  setUploadFolderId("");
                }}
                className="h-10 rounded-xl border border-[#DFE7F3] bg-white px-3 text-sm"
              >
                <option value="">Choose project</option>
                {projectOptions.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="photo-folder">Project folder</Label>
              <select
                id="photo-folder"
                value={uploadFolderId}
                disabled={!uploadProjectId}
                onChange={event => setUploadFolderId(event.target.value)}
                className="h-10 rounded-xl border border-[#DFE7F3] bg-white px-3 text-sm disabled:bg-[#F7F8FA]"
              >
                <option value="">Choose folder</option>
                {uploadFolders.map(folder => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name} · {folder.trade}
                  </option>
                ))}
              </select>
            </div>
            <label className="grid min-h-28 cursor-pointer place-items-center rounded-2xl border border-dashed border-[#B6D4FF] bg-[#F7FAFF] px-4 text-center transition-colors hover:bg-[#EEF4FF]">
              <span>
                <Camera className="mx-auto h-5 w-5 text-[#195FE6]" />
                <span className="mt-2 block text-sm font-semibold text-[#195FE6]">
                  {pendingFile
                    ? pendingFile.name
                    : "Choose a JPEG, PNG, or WebP"}
                </span>
                <span className="mt-1 block text-xs text-[#667085]">
                  Maximum file size: 25 MB
                </span>
              </span>
              <input
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/webp"
                onChange={event => selectFile(event.target.files?.[0])}
              />
            </label>
            <div className="grid gap-2">
              <Label htmlFor="photo-title">Photo title</Label>
              <Input
                id="photo-title"
                value={title}
                maxLength={180}
                onChange={event => setTitle(event.target.value)}
                placeholder="e.g. Plant room before remedial work"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="photo-description">Description</Label>
              <textarea
                id="photo-description"
                value={description}
                maxLength={2000}
                onChange={event => setDescription(event.target.value)}
                placeholder="What is visible and why it matters"
                className="min-h-20 rounded-xl border border-[#DFE7F3] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#8CB5FF]"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="photo-tags">Tags</Label>
              <Input
                id="photo-tags"
                value={tags}
                onChange={event => setTags(event.target.value)}
                placeholder="pump, safety, access"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-1">
              <div className="grid gap-2">
                <Label htmlFor="photo-category">Capture category</Label>
                <select
                  id="photo-category"
                  value={uploadCategory}
                  onChange={event =>
                    setUploadCategory(event.target.value as Category)
                  }
                  className="h-10 rounded-xl border border-[#DFE7F3] bg-white px-3 text-sm"
                >
                  {categories.map(value => (
                    <option key={value} value={value}>
                      {categoryLabel(value)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="photo-captured-at">Captured at</Label>
                <Input
                  id="photo-captured-at"
                  type="datetime-local"
                  value={capturedAt}
                  onChange={event => setCapturedAt(event.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-1">
              <div className="grid gap-2">
                <Label htmlFor="photo-job-id">Attach to job ID</Label>
                <Input
                  id="photo-job-id"
                  inputMode="numeric"
                  value={jobId}
                  onChange={event => setJobId(event.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="photo-site-id">Attach to site ID</Label>
                <Input
                  id="photo-site-id"
                  inputMode="numeric"
                  value={siteId}
                  onChange={event => setSiteId(event.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
            <Button
              type="button"
              onClick={submitUpload}
              disabled={upload.isPending}
              className="h-11 rounded-xl bg-[#195FE6] font-semibold hover:bg-[#124FC3]"
            >
              {upload.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UploadCloud className="mr-2 h-4 w-4" />
              )}
              {upload.isPending ? "Storing photo…" : "Store photograph"}
            </Button>
          </div>

          {canManage ? (
            <details className="mt-6 border-t border-[#EEF2F7] pt-5">
              <summary className="cursor-pointer text-sm font-semibold text-[#195FE6]">
                <FolderPlus className="mr-2 inline h-4 w-4" />
                Create a project folder
              </summary>
              <div className="mt-4 grid gap-3">
                <select
                  value={newFolderProjectId}
                  onChange={event => setNewFolderProjectId(event.target.value)}
                  className="h-10 rounded-xl border border-[#DFE7F3] bg-white px-3 text-sm"
                  aria-label="Folder project"
                >
                  <option value="">Choose project</option>
                  {projectOptions.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <Input
                  value={newFolderName}
                  onChange={event => setNewFolderName(event.target.value)}
                  placeholder="e.g. 06 — Client handover"
                  aria-label="Folder name"
                />
                <Input
                  value={newFolderTrade}
                  onChange={event => setNewFolderTrade(event.target.value)}
                  placeholder="Trade or team"
                  aria-label="Folder trade"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-[#B6D4FF] text-[#195FE6]"
                  disabled={createFolder.isPending}
                  onClick={() => {
                    const projectId = toPositiveInteger(newFolderProjectId);
                    if (!projectId || newFolderName.trim().length < 2) {
                      toast.error(
                        "Choose a project and give the folder a clear name"
                      );
                      return;
                    }
                    createFolder.mutate({
                      projectId,
                      name: newFolderName.trim(),
                      trade: newFolderTrade.trim() || undefined,
                    });
                  }}
                >
                  <FolderPlus className="mr-2 h-4 w-4" />
                  Create folder
                </Button>
              </div>
            </details>
          ) : null}
        </section>

        <section className="elegex-card overflow-hidden">
          <div className="border-b border-[#EEF2F7] p-5 md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="elegex-eyebrow">SHARED EVIDENCE</p>
                <h2 className="mt-1 text-lg font-semibold text-[#14213D]">
                  Searchable project photographs
                </h2>
              </div>
              <span className="rounded-full bg-[#EEF4FF] px-3 py-1.5 text-xs font-semibold text-[#195FE6]">
                {photos.data?.total ?? 0} active photo
                {photos.data?.total === 1 ? "" : "s"}
              </span>
            </div>
            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              <div className="relative lg:col-span-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7A879E]" />
                <Input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  className="pl-9"
                  placeholder="Search title, tag, description, or file name"
                  aria-label="Search photo library"
                />
              </div>
              <select
                value={tradeFilter}
                onChange={event => setTradeFilter(event.target.value)}
                className="h-10 rounded-xl border border-[#DFE7F3] bg-white px-3 text-sm"
                aria-label="Filter by contributor trade"
              >
                <option value="all">All contributor trades</option>
                {trades.map(trade => (
                  <option key={trade} value={trade}>
                    {trade}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <select
                value={projectFilter}
                onChange={event => {
                  setProjectFilter(event.target.value);
                  setFolderFilter("");
                }}
                className="h-10 rounded-xl border border-[#DFE7F3] bg-white px-3 text-sm"
                aria-label="Filter by project"
              >
                <option value="">All projects</option>
                {projectOptions.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <select
                value={folderFilter}
                onChange={event => setFolderFilter(event.target.value)}
                className="h-10 rounded-xl border border-[#DFE7F3] bg-white px-3 text-sm"
                aria-label="Filter by folder"
              >
                <option value="">All project folders</option>
                {filterFolders.map(folder => (
                  <option key={folder.id} value={folder.id}>
                    {folder.projectName} · {folder.name}
                  </option>
                ))}
              </select>
              <select
                value={category}
                onChange={event =>
                  setCategory(event.target.value as "all" | Category)
                }
                className="h-10 rounded-xl border border-[#DFE7F3] bg-white px-3 text-sm"
                aria-label="Filter by category"
              >
                <option value="all">All categories</option>
                {categories.map(value => (
                  <option key={value} value={value}>
                    {categoryLabel(value)}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  inputMode="numeric"
                  value={jobFilter}
                  onChange={event => setJobFilter(event.target.value)}
                  placeholder="Job ID"
                  aria-label="Filter by job ID"
                />
                <Input
                  inputMode="numeric"
                  value={siteFilter}
                  onChange={event => setSiteFilter(event.target.value)}
                  placeholder="Site ID"
                  aria-label="Filter by site ID"
                />
              </div>
            </div>
          </div>

          {photos.isLoading ? (
            <div className="grid min-h-96 place-items-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#195FE6]" />
            </div>
          ) : photos.data?.items.length ? (
            <div className="grid gap-5 p-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 2xl:p-6">
              {photos.data.items.map(photo => (
                <article
                  key={photo.id}
                  className="group overflow-hidden rounded-2xl border border-[#E4EAF4] bg-white shadow-[0_8px_22px_rgba(24,54,108,0.04)]"
                >
                  {photo.isSyntheticPlaceholder ? (
                    <div className="grid aspect-[4/3] place-items-center bg-[linear-gradient(135deg,#EEF4FF,#F9FBFF_55%,#E6F7F0)] p-5 text-center">
                      <div>
                        <ImageIcon className="mx-auto h-8 w-8 text-[#195FE6]" />
                        <p className="mt-3 text-xs font-bold tracking-[0.12em] text-[#195FE6]">
                          SYNTHETIC PLACEHOLDER
                        </p>
                        <p className="mt-1 text-xs text-[#667085]">
                          No real site image stored
                        </p>
                      </div>
                    </div>
                  ) : (
                    <a
                      href={photo.storageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block aspect-[4/3] overflow-hidden bg-[#EDF3FC]"
                      aria-label={`Open ${photo.title}`}
                    >
                      <img
                        src={photo.storageUrl}
                        alt={photo.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]"
                      />
                    </a>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-[#24324D]">
                          {photo.title}
                        </h3>
                        <p className="mt-1 truncate text-xs text-[#7A879E]">
                          {photo.projectName ?? "Unfiled project"}
                          {photo.folderName ? ` · ${photo.folderName}` : ""}
                        </p>
                      </div>
                      {canManage ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-[#7A879E] hover:bg-[#FFF2F4] hover:text-[#C63550]"
                          onClick={() => archive.mutate({ id: photo.id })}
                          disabled={archive.isPending}
                          aria-label={`Archive ${photo.title}`}
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                    {photo.description ? (
                      <p className="mt-3 line-clamp-2 text-xs leading-5 text-[#667085]">
                        {photo.description}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Badge className="border-0 bg-[#EEF4FF] text-[10px] text-[#195FE6]">
                        {categoryLabel(photo.category)}
                      </Badge>
                      <Badge className="border-0 bg-[#F1FAF6] text-[10px] text-[#237A50]">
                        <Wrench className="mr-1 h-3 w-3" />
                        {photo.contributorTrade}
                      </Badge>
                      {photo.uploaderName ? (
                        <Badge className="border-0 bg-[#F7F4FF] text-[10px] text-[#6D43AA]">
                          <UsersRound className="mr-1 h-3 w-3" />
                          {photo.uploaderName}
                        </Badge>
                      ) : null}
                      {photo.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-[10px] text-[#667085]">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="grid min-h-96 place-items-center px-8 text-center">
              <div>
                <ImageIcon className="mx-auto h-9 w-9 text-[#98A2B3]" />
                <p className="mt-3 text-sm font-semibold text-[#34435F]">
                  No photos match this view
                </p>
                <p className="mt-1 max-w-sm text-xs leading-5 text-[#7A879E]">
                  Choose a project folder, upload a field photograph, or build
                  the clearly synthetic demo pack.
                </p>
                {(query ||
                  category !== "all" ||
                  projectFilter ||
                  folderFilter ||
                  tradeFilter !== "all" ||
                  jobFilter ||
                  siteFilter) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-4 border-[#B6D4FF] text-[#195FE6]"
                    onClick={resetFilters}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Clear filters
                  </Button>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
