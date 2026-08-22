import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import {
  ArrowDownToLine,
  FileArchive,
  FileText,
  Loader2,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const documentTypes = [
  "coc",
  "quote",
  "invoice",
  "job_card",
  "photo_evidence",
  "material_list",
  "compliance_cert",
  "site_report",
] as const;
const classificationLevels = [
  "public",
  "internal",
  "confidential",
  "restricted",
] as const;
const label = (value: string) =>
  value
    .replaceAll("_", " ")
    .replace(/\b\w/g, character => character.toUpperCase());

export default function TypedDocumentsPage() {
  const [documentType, setDocumentType] = useState<
    "all" | (typeof documentTypes)[number]
  >("all");
  const [classification, setClassification] =
    useState<(typeof classificationLevels)[number]>("internal");
  const [retentionYears, setRetentionYears] = useState("7");
  const [uploadType, setUploadType] =
    useState<(typeof documentTypes)[number]>("site_report");
  const [recordType, setRecordType] = useState<
    "none" | "contact" | "project" | "case"
  >("none");
  const [recordId, setRecordId] = useState("");
  const documents = trpc.elegex.documents.list.useQuery({
    documentType: documentType === "all" ? undefined : documentType,
  });
  const utils = trpc.useUtils();
  const upload = trpc.elegex.documents.upload.useMutation({
    onSuccess: () => {
      toast.success("Typed document uploaded with its retention controls");
      void utils.elegex.documents.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const uploadFile = (file?: File) => {
    if (!file) return;
    if (file.size > 5_000_000)
      return toast.error("Files must be 5 MB or smaller");
    if (!file.type)
      return toast.error(
        "Choose a supported document, image, CSV, or text file"
      );
    if (recordType !== "none" && !Number(recordId))
      return toast.error(
        "Provide the linked record ID or choose workspace-level storage"
      );
    const reader = new FileReader();
    reader.onerror = () => toast.error("The selected file could not be read");
    reader.onload = () =>
      upload.mutate({
        fileName: file.name,
        mimeType: file.type,
        dataUrl: String(reader.result),
        documentType: uploadType,
        classificationLevel: classification,
        retentionYears: Number(retentionYears),
        ...(recordType === "contact" ? { contactId: Number(recordId) } : {}),
        ...(recordType === "project" ? { projectId: Number(recordId) } : {}),
        ...(recordType === "case" ? { caseId: Number(recordId) } : {}),
      });
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <header className="mb-7">
        <p className="elegex-eyebrow">RETENTION-GOVERNED RECORDS</p>
        <h1 className="elegex-page-title mt-2">Typed documents</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#667085]">
          Every document is classified, retained for a defined period, and
          available only through its tenant-scoped managed-storage reference.
        </p>
      </header>
      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="elegex-card p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#EAF1FF] text-[#195FE6]">
              <UploadCloud className="h-5 w-5" />
            </span>
            <div>
              <p className="elegex-eyebrow">CLASSIFIED UPLOAD</p>
              <h2 className="mt-1 text-lg font-semibold text-[#14213D]">
                Add a controlled record
              </h2>
            </div>
          </div>
          <div className="mt-5 grid gap-4">
            <div className="grid gap-2">
              <Label>Document type</Label>
              <select
                value={uploadType}
                onChange={event =>
                  setUploadType(event.target.value as typeof uploadType)
                }
                className="h-10 rounded-xl border border-[#DFE7F3] bg-white px-3 text-sm"
              >
                {documentTypes.map(type => (
                  <option key={type} value={type}>
                    {label(type)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Classification</Label>
                <select
                  value={classification}
                  onChange={event =>
                    setClassification(
                      event.target.value as typeof classification
                    )
                  }
                  className="h-10 rounded-xl border border-[#DFE7F3] bg-white px-3 text-sm"
                >
                  {classificationLevels.map(level => (
                    <option key={level} value={level}>
                      {label(level)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Retention years</Label>
                <Input
                  type="number"
                  min="1"
                  max="30"
                  value={retentionYears}
                  onChange={event => setRetentionYears(event.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Attach to</Label>
                <select
                  value={recordType}
                  onChange={event =>
                    setRecordType(event.target.value as typeof recordType)
                  }
                  className="h-10 rounded-xl border border-[#DFE7F3] bg-white px-3 text-sm"
                >
                  <option value="none">Workspace-level record</option>
                  <option value="contact">Contact</option>
                  <option value="project">Project</option>
                  <option value="case">Case</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Record ID</Label>
                <Input
                  disabled={recordType === "none"}
                  value={recordId}
                  onChange={event => setRecordId(event.target.value)}
                  placeholder={
                    recordType === "none" ? "Not required" : "e.g. 42"
                  }
                />
              </div>
            </div>
            <label className="mt-1 inline-flex cursor-pointer items-center justify-center rounded-xl bg-[#195FE6] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#124FC3]">
              <UploadCloud className="mr-2 h-4 w-4" />
              {upload.isPending ? "Uploading…" : "Select and upload file"}
              <input
                type="file"
                className="hidden"
                accept=".pdf,.txt,.csv,.docx,.png,.jpg,.jpeg"
                onChange={event => uploadFile(event.target.files?.[0])}
              />
            </label>
          </div>
          <div className="mt-5 rounded-xl bg-[#F6F9FF] p-4 text-xs leading-5 text-[#50617F]">
            <ShieldCheck className="mr-2 inline h-4 w-4 text-[#195FE6]" />
            Storage bytes remain in managed object storage; the application
            database stores only scoped metadata, retention, classification, and
            a link reference.
          </div>
        </section>
        <section className="elegex-card overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-[#EEF2F7] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="elegex-eyebrow">SIX-MONTH CORPUS</p>
              <h2 className="mt-1 text-lg font-semibold text-[#14213D]">
                Document register
              </h2>
            </div>
            <select
              value={documentType}
              onChange={event =>
                setDocumentType(event.target.value as typeof documentType)
              }
              className="h-10 rounded-xl border border-[#DFE7F3] bg-white px-3 text-sm"
            >
              <option value="all">All types</option>
              {documentTypes.map(type => (
                <option key={type} value={type}>
                  {label(type)}
                </option>
              ))}
            </select>
          </div>
          {documents.isLoading ? (
            <div className="grid min-h-80 place-items-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#195FE6]" />
            </div>
          ) : documents.data?.length ? (
            <div className="divide-y divide-[#EEF2F7]">
              {documents.data.map((document: any) => (
                <div
                  key={document.id}
                  className="flex items-center gap-4 px-5 py-4"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#EEF4FF] text-[#195FE6]">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#34435F]">
                      {document.fileName}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge className="border-0 bg-[#F2F6FF] text-[10px] text-[#195FE6]">
                        {label(document.documentType)}
                      </Badge>
                      <Badge className="border-0 bg-[#F7F4FF] text-[10px] text-[#6D43AA]">
                        {label(document.classificationLevel)}
                      </Badge>
                      <span className="text-xs text-[#7A879E]">
                        Retain {document.retentionYears} years
                      </span>
                    </div>
                  </div>
                  {document.health === "available" ? (
                    <a
                      href={document.storageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-[#DFE7F3] p-2 text-[#50617F] hover:border-[#B6D4FF] hover:text-[#195FE6]"
                      aria-label={`Download ${document.fileName}`}
                    >
                      <ArrowDownToLine className="h-4 w-4" />
                    </a>
                  ) : (
                    <FileArchive className="h-4 w-4 text-[#98A2B3]" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid min-h-80 place-items-center px-8 text-center">
              <div>
                <FileArchive className="mx-auto h-8 w-8 text-[#98A2B3]" />
                <p className="mt-3 text-sm font-semibold text-[#34435F]">
                  No documents match this type
                </p>
                <p className="mt-1 text-xs leading-5 text-[#7A879E]">
                  The deterministic corpus is restored with the synthetic demo
                  reset flow.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
