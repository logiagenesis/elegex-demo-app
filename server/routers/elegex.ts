import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, router } from "../_core/trpc";
import { checkDatabaseHealth } from "../connectors/database";
import {
  enqueueIntegrationEvent,
  listDispatchableEvents,
  listIntegrationConnections,
  upsertIntegrationConnection,
} from "../connectors/outbox";
import * as db from "../db";
import { generateReviewedDraft } from "../providers/ai";
import { MAX_UPLOAD_BYTES, validateUpload } from "../providers/storage";
import { storagePut } from "../storage";

export const MAX_UPLOAD_DATA_URL_LENGTH =
  Math.ceil((MAX_UPLOAD_BYTES * 4) / 3) + 512;

function decodeManagedDataUrl(
  dataUrl: string,
  expectedMimeType: string,
  subject: "Upload" | "Field media" | "Photo upload"
) {
  const match = dataUrl.match(/^data:([^;,]+);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match || match[1] !== expectedMimeType) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${subject} metadata does not match its payload.`,
    });
  }

  const base64 = match[2];
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  const decodedByteLength = Math.floor((base64.length * 3) / 4) - padding;
  if (decodedByteLength > MAX_UPLOAD_BYTES) {
    throw new TRPCError({
      code: "PAYLOAD_TOO_LARGE",
      message: `Files must be ${MAX_UPLOAD_BYTES / 1024 / 1024} MB or smaller.`,
    });
  }

  return Buffer.from(base64, "base64");
}

const listInput = z.object({
  query: z.string().max(120).optional(),
  status: z.string().max(40).optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(50).optional(),
});
const documentListInput = z
  .object({
    resource: z.enum(["contact", "project", "case"]).optional(),
    recordId: z.number().int().positive().optional(),
    documentType: z
      .enum([
        "coc",
        "quote",
        "invoice",
        "job_card",
        "photo_evidence",
        "material_list",
        "compliance_cert",
        "site_report",
      ])
      .optional(),
  })
  .refine(input => Boolean(input.resource) === Boolean(input.recordId), {
    message: "Document resource and record ID must be supplied together",
  });
const photoListInput = z.object({
  query: z.string().trim().max(120).optional(),
  category: z
    .enum(["before", "during", "after", "issue", "asset", "other"])
    .optional(),
  jobId: z.number().int().positive().optional(),
  siteId: z.number().int().positive().optional(),
  projectId: z.number().int().positive().optional(),
  folderId: z.number().int().positive().optional(),
  contributorTrade: z.string().trim().min(2).max(80).optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(48).optional(),
});
const photoUploadInput = z
  .object({
    fileName: z.string().min(1).max(255),
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    dataUrl: z.string().max(MAX_UPLOAD_DATA_URL_LENGTH),
    title: z.string().trim().min(2).max(180),
    description: z.string().trim().max(2000).optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
    category: z
      .enum(["before", "during", "after", "issue", "asset", "other"])
      .optional(),
    projectId: z.number().int().positive().optional(),
    folderId: z.number().int().positive().optional(),
    jobId: z.number().int().positive().optional(),
    siteId: z.number().int().positive().optional(),
    capturedAt: z.date().optional(),
  })
  .refine(input => !input.folderId || Boolean(input.projectId), {
    message: "Select the folder's project before uploading a photo.",
  });
const photoFolderInput = z.object({
  projectId: z.number().int().positive(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(360).optional(),
  trade: z.string().trim().min(2).max(80).optional(),
});
const tenantProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const scope = await db.ensureTenantScope(ctx.user.id);
  return next({ ctx: { ...ctx, scope } });
});

function requireEdit(role: Parameters<typeof db.canEditRecords>[0]) {
  if (!db.canEditRecords(role))
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Your workspace role is read-only.",
    });
}

function requireManage(role: Parameters<typeof db.canManageRecords>[0]) {
  if (!db.canManageRecords(role))
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Your workspace role cannot perform this action.",
    });
}

function requireAdmin(role: Parameters<typeof db.canManageWorkspace>[0]) {
  if (!db.canManageWorkspace(role))
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only workspace owners and administrators can access this area.",
    });
}

export const elegexRouter = router({
  workspace: router({
    current: tenantProcedure.query(({ ctx }) => ctx.scope),
    members: tenantProcedure.query(({ ctx }) =>
      db.listWorkspaceMembers(ctx.scope.organizationId)
    ),
    operationalSettings: tenantProcedure.query(({ ctx }) =>
      db.getOrganizationSettings(ctx.scope.organizationId)
    ),
  }),
  dashboard: tenantProcedure.query(({ ctx }) =>
    db.getDashboard(ctx.scope.organizationId, ctx.user.id)
  ),
  contacts: router({
    list: tenantProcedure
      .input(listInput)
      .query(({ ctx, input }) =>
        db.listContacts({ ...input, organizationId: ctx.scope.organizationId })
      ),
    create: tenantProcedure
      .input(
        z.object({
          name: z.string().min(2).max(160),
          company: z.string().max(160).optional(),
          email: z.string().email().optional().or(z.literal("")),
          phone: z.string().max(50).optional(),
          location: z.string().max(180).optional(),
          status: z.enum(["lead", "active", "inactive"]).optional(),
          notes: z.string().max(4000).optional(),
        })
      )
      .mutation(({ ctx, input }) => {
        requireEdit(ctx.scope.role);
        return db.createContact(ctx.scope.organizationId, ctx.user.id, {
          ...input,
          email: input.email || undefined,
        });
      }),
    update: tenantProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          name: z.string().min(2).max(160).optional(),
          company: z.string().max(160).optional(),
          email: z.string().email().optional().or(z.literal("")),
          phone: z.string().max(50).optional(),
          location: z.string().max(180).optional(),
          status: z.enum(["lead", "active", "inactive"]).optional(),
          notes: z.string().max(4000).optional(),
        })
      )
      .mutation(({ ctx, input }) => {
        requireEdit(ctx.scope.role);
        const { id, ...record } = input;
        return db.updateContact(ctx.scope.organizationId, ctx.user.id, id, {
          ...record,
          email: record.email || undefined,
        });
      }),
  }),
  projects: router({
    list: tenantProcedure
      .input(listInput)
      .query(({ ctx, input }) =>
        db.listProjects({ ...input, organizationId: ctx.scope.organizationId })
      ),
    create: tenantProcedure
      .input(
        z.object({
          name: z.string().min(2).max(180),
          code: z.string().min(2).max(32),
          contactId: z.number().int().positive().optional(),
          description: z.string().max(5000).optional(),
          status: z
            .enum(["planning", "active", "on_hold", "complete", "archived"])
            .optional(),
          priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
          dueDate: z.date().optional(),
          budget: z.number().int().nonnegative().optional(),
        })
      )
      .mutation(({ ctx, input }) => {
        requireEdit(ctx.scope.role);
        return db.createProject(ctx.scope.organizationId, ctx.user.id, input);
      }),
    update: tenantProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          name: z.string().min(2).max(180).optional(),
          description: z.string().max(5000).optional(),
          status: z
            .enum(["planning", "active", "on_hold", "complete", "archived"])
            .optional(),
          priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
          progress: z.number().int().min(0).max(100).optional(),
          dueDate: z.date().optional(),
          budget: z.number().int().nonnegative().optional(),
        })
      )
      .mutation(({ ctx, input }) => {
        requireEdit(ctx.scope.role);
        const { id, ...record } = input;
        return db.updateProject(
          ctx.scope.organizationId,
          ctx.user.id,
          id,
          record
        );
      }),
  }),
  cases: router({
    list: tenantProcedure
      .input(listInput)
      .query(({ ctx, input }) =>
        db.listCases({ ...input, organizationId: ctx.scope.organizationId })
      ),
    create: tenantProcedure
      .input(
        z.object({
          reference: z.string().min(3).max(40),
          title: z.string().min(3).max(180),
          summary: z.string().max(5000).optional(),
          contactId: z.number().int().positive().optional(),
          projectId: z.number().int().positive().optional(),
          severity: z.enum(["low", "medium", "high", "critical"]).optional(),
          ownerId: z.number().int().positive().optional(),
          dueDate: z.date().optional(),
        })
      )
      .mutation(({ ctx, input }) => {
        requireEdit(ctx.scope.role);
        return db.createCase(ctx.scope.organizationId, ctx.user.id, input);
      }),
    update: tenantProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          title: z.string().min(3).max(180).optional(),
          summary: z.string().max(5000).optional(),
          status: z
            .enum(["open", "investigating", "pending", "resolved", "closed"])
            .optional(),
          severity: z.enum(["low", "medium", "high", "critical"]).optional(),
          ownerId: z.number().int().positive().optional(),
          dueDate: z.date().optional(),
        })
      )
      .mutation(({ ctx, input }) => {
        requireEdit(ctx.scope.role);
        const { id, ...record } = input;
        return db.updateCase(ctx.scope.organizationId, ctx.user.id, id, record);
      }),
  }),
  tasks: router({
    list: tenantProcedure
      .input(listInput)
      .query(({ ctx, input }) =>
        db.listTasks({ ...input, organizationId: ctx.scope.organizationId })
      ),
    create: tenantProcedure
      .input(
        z.object({
          title: z.string().min(3).max(180),
          description: z.string().max(5000).optional(),
          projectId: z.number().int().positive().optional(),
          caseId: z.number().int().positive().optional(),
          priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
          assigneeId: z.number().int().positive().optional(),
          dueDate: z.date().optional(),
        })
      )
      .mutation(({ ctx, input }) => {
        requireEdit(ctx.scope.role);
        return db.createTask(ctx.scope.organizationId, ctx.user.id, input);
      }),
    update: tenantProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          title: z.string().min(3).max(180).optional(),
          description: z.string().max(5000).optional(),
          projectId: z.number().int().positive().optional(),
          status: z
            .enum(["todo", "in_progress", "blocked", "complete"])
            .optional(),
          priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
          assigneeId: z.number().int().positive().optional(),
          dueDate: z.date().optional(),
        })
      )
      .mutation(({ ctx, input }) => {
        requireEdit(ctx.scope.role);
        const { id, ...record } = input;
        return db.updateTask(ctx.scope.organizationId, ctx.user.id, id, record);
      }),
  }),
  records: router({
    detail: tenantProcedure
      .input(
        z.object({
          resource: z.enum(["contacts", "projects", "cases"]),
          id: z.number().int().positive(),
        })
      )
      .query(({ ctx, input }) =>
        db.getRecordDetail(ctx.scope.organizationId, input.resource, input.id)
      ),
    archive: tenantProcedure
      .input(
        z.object({
          resource: z.enum(["contacts", "projects", "cases", "tasks"]),
          id: z.number().int().positive(),
        })
      )
      .mutation(({ ctx, input }) => {
        requireManage(ctx.scope.role);
        return db.archiveRecord(
          ctx.scope.organizationId,
          ctx.user.id,
          input.resource,
          input.id
        );
      }),
  }),
  notifications: router({
    list: tenantProcedure.query(({ ctx }) =>
      db.getNotifications(ctx.scope.organizationId, ctx.user.id)
    ),
    markRead: tenantProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ ctx, input }) =>
        db.markNotificationRead(ctx.scope.organizationId, ctx.user.id, input.id)
      ),
  }),
  ai: router({
    generateDraft: tenantProcedure
      .input(
        z.object({
          feature: z.enum(["job_summary", "quote_draft", "evidence_caption"]),
          sourceText: z.string().min(10).max(8_000),
        })
      )
      .mutation(async ({ ctx, input }) => {
        requireManage(ctx.scope.role);
        return generateReviewedDraft({
          organizationId: ctx.scope.organizationId,
          userId: ctx.user.id,
          ...input,
        });
      }),
  }),
  fieldService: router({
    dashboard: tenantProcedure.query(({ ctx }) =>
      db.getFieldServiceDashboard(ctx.scope.organizationId)
    ),
    foreman: router({
      today: tenantProcedure.query(({ ctx }) => {
        requireEdit(ctx.scope.role);
        return db.getForemanToday(ctx.scope.organizationId, ctx.user.id);
      }),
      consent: tenantProcedure
        .input(
          z.object({
            jobId: z.number().int().positive(),
            signerName: z.string().min(2).max(160),
            idempotencyKey: z.string().uuid().optional(),
          })
        )
        .mutation(({ ctx, input }) => {
          requireEdit(ctx.scope.role);
          return db.recordForemanConsent(
            ctx.scope.organizationId,
            ctx.user.id,
            input.jobId,
            input.signerName,
            input.idempotencyKey
          );
        }),
      checkIn: tenantProcedure
        .input(
          z.object({
            jobId: z.number().int().positive(),
            idempotencyKey: z.string().uuid().optional(),
            occurredAt: z.date().optional(),
          })
        )
        .mutation(({ ctx, input }) => {
          requireEdit(ctx.scope.role);
          return db.foremanCheckIn(
            ctx.scope.organizationId,
            ctx.user.id,
            input.jobId,
            input.idempotencyKey,
            input.occurredAt
          );
        }),
      material: tenantProcedure
        .input(
          z.object({
            jobId: z.number().int().positive(),
            description: z.string().min(2).max(240),
            quantity: z.number().positive().max(10_000),
            unit: z.string().min(1).max(40),
            idempotencyKey: z.string().uuid().optional(),
          })
        )
        .mutation(({ ctx, input }) => {
          requireEdit(ctx.scope.role);
          return db.addForemanMaterial(
            ctx.scope.organizationId,
            ctx.user.id,
            input
          );
        }),
      evidence: tenantProcedure
        .input(
          z
            .object({
              jobId: z.number().int().positive(),
              evidenceType: z.enum([
                "before_photo",
                "after_photo",
                "note",
                "job_card",
                "signature",
              ]),
              title: z.string().min(2).max(240),
              note: z.string().max(4000).optional(),
              fileName: z.string().min(1).max(255).optional(),
              mimeType: z.string().min(1).max(120).optional(),
              dataUrl: z.string().max(MAX_UPLOAD_DATA_URL_LENGTH).optional(),
              idempotencyKey: z.string().uuid().optional(),
            })
            .refine(
              value =>
                Boolean(value.dataUrl) ===
                Boolean(value.fileName && value.mimeType),
              {
                message:
                  "Field media requires a file name, media type, and data payload together.",
              }
            )
        )
        .mutation(async ({ ctx, input }) => {
          requireEdit(ctx.scope.role);
          const { dataUrl, fileName, mimeType, ...evidence } = input;
          let media:
            { fileName: string; mimeType: string; bytes: Buffer } | undefined;
          if (dataUrl && fileName && mimeType) {
            const bytes = decodeManagedDataUrl(
              dataUrl,
              mimeType,
              "Field media"
            );
            try {
              await validateUpload(bytes, mimeType, fileName);
            } catch (error) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message:
                  error instanceof Error
                    ? error.message
                    : "Invalid field-media payload.",
              });
            }
            media = {
              fileName,
              mimeType,
              bytes,
            };
          }
          return db.captureForemanEvidence(
            ctx.scope.organizationId,
            ctx.user.id,
            { ...evidence, ...(media ? { media } : {}) }
          );
        }),
      quote: tenantProcedure
        .input(
          z.object({
            jobId: z.number().int().positive(),
            quoteNumber: z.string().min(3).max(60),
            idempotencyKey: z.string().uuid().optional(),
          })
        )
        .mutation(({ ctx, input }) => {
          requireEdit(ctx.scope.role);
          return db.captureForemanQuote(
            ctx.scope.organizationId,
            ctx.user.id,
            input
          );
        }),
      complete: tenantProcedure
        .input(
          z.object({
            jobId: z.number().int().positive(),
            idempotencyKey: z.string().uuid().optional(),
            completedAt: z.date().optional(),
            exceptionReason: z.string().min(3).max(500).optional(),
          })
        )
        .mutation(({ ctx, input }) => {
          requireEdit(ctx.scope.role);
          return db.foremanCompleteJob(
            ctx.scope.organizationId,
            ctx.user.id,
            input.jobId,
            input.idempotencyKey,
            input.completedAt,
            input.exceptionReason
          );
        }),
    }),
    jobs: router({
      list: tenantProcedure
        .input(
          z.object({
            query: z.string().max(120).optional(),
            stage: z
              .enum([
                "scheduled",
                "in_progress",
                "on_hold",
                "ready_for_invoicing",
                "invoiced",
                "cancelled",
              ])
              .optional(),
            foremanId: z.number().int().positive().optional(),
            page: z.number().int().positive().optional(),
            pageSize: z.number().int().positive().max(50).optional(),
          })
        )
        .query(({ ctx, input }) =>
          db.listJobs({ ...input, organizationId: ctx.scope.organizationId })
        ),
      detail: tenantProcedure
        .input(z.object({ id: z.number().int().positive() }))
        .query(({ ctx, input }) =>
          db.getJobDetail(ctx.scope.organizationId, input.id)
        ),
      create: tenantProcedure
        .input(
          z.object({
            jobNumber: z.string().regex(/^#?\d{4,8}$/),
            title: z.string().min(3).max(180),
            description: z.string().min(5).max(5000),
            contactId: z.number().int().positive(),
            serviceAddress: z.string().min(5).max(360),
            priority: z
              .enum(["routine", "standard", "urgent", "critical"])
              .optional(),
            foremanId: z.number().int().positive().optional(),
            scheduledStart: z.date().optional(),
            scheduledEnd: z.date().optional(),
          })
        )
        .mutation(({ ctx, input }) => {
          requireEdit(ctx.scope.role);
          return db.createJob(ctx.scope.organizationId, ctx.user.id, input);
        }),
      archive: tenantProcedure
        .input(z.object({ id: z.number().int().positive() }))
        .mutation(({ ctx, input }) => {
          requireManage(ctx.scope.role);
          return db.archiveJob(ctx.scope.organizationId, ctx.user.id, input.id);
        }),
      transition: tenantProcedure
        .input(
          z.object({
            id: z.number().int().positive(),
            stage: z.enum([
              "scheduled",
              "in_progress",
              "on_hold",
              "ready_for_invoicing",
              "invoiced",
              "cancelled",
            ]),
            reason: z.string().max(500).optional(),
          })
        )
        .mutation(({ ctx, input }) => {
          requireManage(ctx.scope.role);
          return db.transitionJobStage(
            ctx.scope.organizationId,
            ctx.user.id,
            input.id,
            input.stage,
            input.reason
          );
        }),
      linkInvoice: tenantProcedure
        .input(
          z.object({
            id: z.number().int().positive(),
            invoiceNumber: z.string().min(3).max(80),
          })
        )
        .mutation(({ ctx, input }) => {
          requireManage(ctx.scope.role);
          return db.linkExternalInvoice(
            ctx.scope.organizationId,
            ctx.user.id,
            input.id,
            input.invoiceNumber
          );
        }),
    }),
    dispatch: tenantProcedure
      .input(
        z
          .object({ start: z.date().optional(), end: z.date().optional() })
          .optional()
      )
      .query(({ ctx, input }) =>
        db.listDispatchVisits(
          ctx.scope.organizationId,
          input?.start,
          input?.end
        )
      ),
    reports: tenantProcedure.query(({ ctx }) =>
      db.getFieldServiceReports(ctx.scope.organizationId)
    ),
  }),
  documents: router({
    materializeDemoCorpus: tenantProcedure.mutation(({ ctx }) => {
      requireManage(ctx.scope.role);
      return db.materializeDemoEvidenceCorpus(
        ctx.scope.organizationId,
        ctx.user.id
      );
    }),
    openEvidenceDocument: tenantProcedure
      .input(z.object({ evidenceId: z.number().int().positive() }))
      .mutation(({ ctx, input }) =>
        db.openDemoEvidenceDocument(
          ctx.scope.organizationId,
          input.evidenceId,
          ctx.user.id
        )
      ),
    list: tenantProcedure
      .input(documentListInput.optional())
      .query(({ ctx, input }) =>
        db.listDocuments(
          ctx.scope.organizationId,
          input?.resource,
          input?.recordId,
          input?.documentType
        )
      ),
    upload: tenantProcedure
      .input(
        z.object({
          fileName: z.string().min(1).max(255),
          mimeType: z.string().min(1).max(120),
          dataUrl: z.string().max(MAX_UPLOAD_DATA_URL_LENGTH),
          documentType: z
            .enum([
              "coc",
              "quote",
              "invoice",
              "job_card",
              "photo_evidence",
              "material_list",
              "compliance_cert",
              "site_report",
            ])
            .optional(),
          retentionYears: z.number().int().min(1).max(30).optional(),
          classificationLevel: z
            .enum(["public", "internal", "confidential", "restricted"])
            .optional(),
          projectId: z.number().int().positive().optional(),
          caseId: z.number().int().positive().optional(),
          contactId: z.number().int().positive().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        requireEdit(ctx.scope.role);
        const bytes = decodeManagedDataUrl(
          input.dataUrl,
          input.mimeType,
          "Upload"
        );
        try {
          await validateUpload(bytes, input.mimeType, input.fileName);
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              error instanceof Error
                ? error.message
                : "Invalid upload payload.",
          });
        }
        await db.validateDocumentTargets(ctx.scope.organizationId, input);
        const uploaded = await storagePut(
          `elegex/${ctx.scope.organizationId}/documents/${input.fileName}`,
          bytes,
          input.mimeType
        );
        return db.createDocumentRecord(ctx.scope.organizationId, ctx.user.id, {
          ...input,
          storageKey: uploaded.key,
          storageUrl: uploaded.url,
          sizeBytes: bytes.length,
        });
      }),
  }),
  photos: router({
    list: tenantProcedure
      .input(photoListInput.optional())
      .query(({ ctx, input }) =>
        db.listSitePhotos(ctx.scope.organizationId, input)
      ),
    folders: tenantProcedure.query(({ ctx }) =>
      db.listPhotoFolders(ctx.scope.organizationId)
    ),
    createFolder: tenantProcedure
      .input(photoFolderInput)
      .mutation(({ ctx, input }) => {
        requireManage(ctx.scope.role);
        return db.createPhotoFolder(
          ctx.scope.organizationId,
          ctx.user.id,
          input
        );
      }),
    upload: tenantProcedure
      .input(photoUploadInput)
      .mutation(async ({ ctx, input }) => {
        requireEdit(ctx.scope.role);
        const bytes = decodeManagedDataUrl(
          input.dataUrl,
          input.mimeType,
          "Photo upload"
        );
        try {
          await validateUpload(bytes, input.mimeType, input.fileName);
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              error instanceof Error ? error.message : "Invalid photo upload.",
          });
        }
        const uploaded = await storagePut(
          `elegex/${ctx.scope.organizationId}/photos/project-${input.projectId ?? "shared"}/folder-${input.folderId ?? "unfiled"}/${input.fileName}`,
          bytes,
          input.mimeType
        );
        return db.createSitePhoto(ctx.scope.organizationId, ctx.user.id, {
          ...input,
          originalFileName: input.fileName,
          storageKey: uploaded.key,
          storageUrl: uploaded.url,
          sizeBytes: bytes.length,
        });
      }),
    materializeDemoCorpus: tenantProcedure.mutation(({ ctx }) => {
      requireAdmin(ctx.scope.role);
      return db.materializeDemoPhotoCorpus(
        ctx.scope.organizationId,
        ctx.user.id
      );
    }),
    archive: tenantProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ ctx, input }) => {
        requireManage(ctx.scope.role);
        return db.archiveSitePhoto(
          ctx.scope.organizationId,
          ctx.user.id,
          input.id
        );
      }),
  }),
  reports: router({
    rows: tenantProcedure.query(({ ctx }) =>
      db.getReportRows(ctx.scope.organizationId)
    ),
    savedViews: tenantProcedure.query(({ ctx }) =>
      db.getSavedViews(ctx.scope.organizationId, ctx.user.id)
    ),
    saveView: tenantProcedure
      .input(
        z.object({
          name: z.string().min(2).max(120),
          filters: z.record(z.string(), z.unknown()),
          isShared: z.boolean().optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        db.createSavedView(ctx.scope.organizationId, ctx.user.id, {
          ...input,
          resource: "reports",
        })
      ),
  }),
  integrations: router({
    databaseHealth: tenantProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx.scope.role);
      return checkDatabaseHealth();
    }),
    list: tenantProcedure.query(({ ctx }) => {
      requireAdmin(ctx.scope.role);
      return listIntegrationConnections(ctx.scope.organizationId);
    }),
    upsert: tenantProcedure
      .input(
        z.object({
          provider: z.enum(["database", "webhook", "analytics", "storage"]),
          name: z.string().min(2).max(120),
          configuration: z.record(z.string(), z.unknown()),
          secretReference: z.string().max(180).optional(),
          status: z
            .enum(["active", "paused", "degraded", "disabled"])
            .optional(),
        })
      )
      .mutation(({ ctx, input }) => {
        requireAdmin(ctx.scope.role);
        return upsertIntegrationConnection({
          ...input,
          organizationId: ctx.scope.organizationId,
          createdBy: ctx.user.id,
        });
      }),
    enqueue: tenantProcedure
      .input(
        z.object({
          connectionId: z.number().int().positive(),
          eventType: z.string().min(2).max(120),
          payload: z.record(z.string(), z.unknown()),
          idempotencyKey: z.string().min(8).max(180),
        })
      )
      .mutation(({ ctx, input }) => {
        requireAdmin(ctx.scope.role);
        return enqueueIntegrationEvent({
          ...input,
          organizationId: ctx.scope.organizationId,
        });
      }),
    dispatchable: tenantProcedure
      .input(
        z.object({
          connectionId: z.number().int().positive(),
          limit: z.number().int().positive().max(100).optional(),
        })
      )
      .query(({ ctx, input }) => {
        requireAdmin(ctx.scope.role);
        return listDispatchableEvents(
          ctx.scope.organizationId,
          input.connectionId,
          input.limit
        );
      }),
  }),
  staging: router({
    readiness: tenantProcedure.query(({ ctx }) => {
      requireAdmin(ctx.scope.role);
      return db.getStagingReadiness(ctx.scope.organizationId);
    }),
  }),
  admin: router({
    data: tenantProcedure.query(({ ctx }) => {
      requireAdmin(ctx.scope.role);
      return db.getAdminData(ctx.scope.organizationId);
    }),
    updateMemberRole: tenantProcedure
      .input(
        z.object({
          membershipId: z.number().int().positive(),
          role: z.enum(["admin", "manager", "member", "viewer"]),
        })
      )
      .mutation(({ ctx, input }) => {
        requireAdmin(ctx.scope.role);
        return db.updateMemberRole(
          ctx.scope.organizationId,
          ctx.user.id,
          input.membershipId,
          input.role
        );
      }),
    updateSettings: tenantProcedure
      .input(
        z.object({
          name: z.string().min(2).max(160).optional(),
          primaryColor: z
            .string()
            .regex(/^#[0-9A-Fa-f]{6}$/)
            .optional(),
          locale: z.string().max(32).optional(),
          currency: z
            .string()
            .regex(/^[A-Z]{3}$/)
            .optional(),
          timezone: z.string().max(80).optional(),
          tradeVocabulary: z
            .array(z.string().min(2).max(80))
            .min(1)
            .max(20)
            .optional(),
          allowMemberInvites: z.boolean().optional(),
          notificationDigest: z.boolean().optional(),
          aiOptIn: z.boolean().optional(),
        })
      )
      .mutation(({ ctx, input }) => {
        requireAdmin(ctx.scope.role);
        return db.updateSettings(ctx.scope.organizationId, ctx.user.id, input);
      }),
    resetDemo: tenantProcedure.mutation(({ ctx }) => {
      requireAdmin(ctx.scope.role);
      return db.resetDemoData(ctx.scope.organizationId, ctx.user.id);
    }),
  }),
});
