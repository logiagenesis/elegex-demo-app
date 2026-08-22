import {
  Archive,
  Camera,
  ImageIcon,
  Loader2,
  Search,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { canManageOperationalControls } from "@/lib/access";
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
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | Category>("all");
  const [jobFilter, setJobFilter] = useState("");
  const [siteFilter, setSiteFilter] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [uploadCategory, setUploadCategory] = useState<Category>("other");
  const [jobId, setJobId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [capturedAt, setCapturedAt] = useState(() => dateTimeInput(new Date()));
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const listInput = useMemo(
    () => ({
      query: query.trim() || undefined,
      category: category === "all" ? undefined : category,
      jobId: toPositiveInteger(jobFilter),
      siteId: toPositiveInteger(siteFilter),
    }),
    [category, jobFilter, query, siteFilter]
  );
  const photos = trpc.elegex.photos.list.useQuery(listInput);
  const upload = trpc.elegex.photos.upload.useMutation({
    onSuccess: () => {
      toast.success("Photo stored in the site library");
      setPendingFile(null);
      setTitle("");
      setDescription("");
      setTags("");
      setJobId("");
      setSiteId("");
      setUploadCategory("other");
      setCapturedAt(dateTimeInput(new Date()));
      void utils.elegex.photos.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const archive = trpc.elegex.photos.archive.useMutation({
    onSuccess: () => {
      toast.success("Photo removed from the active library");
      void utils.elegex.photos.invalidate();
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
        jobId: toPositiveInteger(jobId),
        siteId: toPositiveInteger(siteId),
        capturedAt: capturedAt ? new Date(capturedAt) : undefined,
      });
    reader.readAsDataURL(pendingFile);
  };

  const canArchive = canManageOperationalControls(
    workspace.data?.role ?? "viewer"
  );

  return (
    <div>
      <header className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="elegex-eyebrow">TENANT-SCOPED SITE EVIDENCE</p>
          <h1 className="elegex-page-title mt-2">Photo library</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#667085]">
            Store reusable site photographs with structured context, then find
            them by title, tag, job, site, or capture category.
          </p>
        </div>
        <div className="rounded-2xl border border-[#D8E5FA] bg-[#F7FAFF] px-4 py-3 text-xs leading-5 text-[#50617F]">
          <ShieldCheck className="mr-2 inline h-4 w-4 text-[#195FE6]" />
          Image bytes stay in managed storage. The workspace database records
          only tenant-bound metadata and the storage reference.
        </div>
      </header>

      <div className="grid gap-6 2xl:grid-cols-[380px_minmax(0,1fr)]">
        <section className="elegex-card h-fit p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#EAF1FF] text-[#195FE6]">
              <UploadCloud className="h-5 w-5" />
            </span>
            <div>
              <p className="elegex-eyebrow">SITE UPLOAD</p>
              <h2 className="mt-1 text-lg font-semibold text-[#14213D]">
                Add a photograph
              </h2>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
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
        </section>

        <section className="elegex-card overflow-hidden">
          <div className="border-b border-[#EEF2F7] p-5 md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="elegex-eyebrow">PHOTO DATABASE</p>
                <h2 className="mt-1 text-lg font-semibold text-[#14213D]">
                  Searchable site evidence
                </h2>
              </div>
              <span className="rounded-full bg-[#EEF4FF] px-3 py-1.5 text-xs font-semibold text-[#195FE6]">
                {photos.data?.total ?? 0} active photo
                {photos.data?.total === 1 ? "" : "s"}
              </span>
            </div>
            <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_150px_120px_120px]">
              <div className="relative">
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

          {photos.isLoading ? (
            <div className="grid min-h-96 place-items-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#195FE6]" />
            </div>
          ) : photos.data?.items.length ? (
            <div className="grid gap-5 p-5 sm:grid-cols-2 xl:grid-cols-3 2xl:p-6">
              {photos.data.items.map(photo => (
                <article
                  key={photo.id}
                  className="group overflow-hidden rounded-2xl border border-[#E4EAF4] bg-white shadow-[0_8px_22px_rgba(24,54,108,0.04)]"
                >
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
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-[#24324D]">
                          {photo.title}
                        </h3>
                        <p className="mt-1 text-xs text-[#7A879E]">
                          {new Date(photo.capturedAt).toLocaleString()}
                        </p>
                      </div>
                      {canArchive ? (
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
                      {photo.jobId ? (
                        <Badge className="border-0 bg-[#F7F4FF] text-[10px] text-[#6D43AA]">
                          Job {photo.jobId}
                        </Badge>
                      ) : null}
                      {photo.siteId ? (
                        <Badge className="border-0 bg-[#F1FAF6] text-[10px] text-[#237A50]">
                          Site {photo.siteId}
                        </Badge>
                      ) : null}
                      {photo.tags.map(tag => (
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
                  Upload the first site photograph or broaden the current search
                  and filters.
                </p>
                {(query || category !== "all" || jobFilter || siteFilter) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-4 border-[#B6D4FF] text-[#195FE6]"
                    onClick={() => {
                      setQuery("");
                      setCategory("all");
                      setJobFilter("");
                      setSiteFilter("");
                    }}
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
