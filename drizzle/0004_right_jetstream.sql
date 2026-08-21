CREATE TABLE `invoiceLinks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`jobId` int NOT NULL,
	`externalSystem` varchar(80) NOT NULL DEFAULT 'QuickBooks Online',
	`externalInvoiceNumber` varchar(80) NOT NULL,
	`status` enum('linked','credited','superseded') NOT NULL DEFAULT 'linked',
	`linkedAt` timestamp NOT NULL DEFAULT (now()),
	`linkedBy` int NOT NULL,
	`notes` varchar(500),
	CONSTRAINT `invoiceLinks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `jobEvidence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`jobId` int NOT NULL,
	`evidenceType` enum('before_photo','after_photo','video','signature','job_card','safety_document','note') NOT NULL,
	`title` varchar(240) NOT NULL,
	`storageUrl` varchar(600),
	`capturedBy` int,
	`capturedAt` timestamp NOT NULL DEFAULT (now()),
	`syncStatus` enum('synced','pending_upload','needs_review') NOT NULL DEFAULT 'synced',
	`metadata` json,
	CONSTRAINT `jobEvidence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `jobMaterials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`jobId` int NOT NULL,
	`description` varchar(240) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`unit` varchar(40) NOT NULL DEFAULT 'each',
	`source` enum('catalog','free_text','client_supplied') NOT NULL DEFAULT 'catalog',
	`unitPrice` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `jobMaterials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `jobVisits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`jobId` int NOT NULL,
	`foremanId` int NOT NULL,
	`scheduledStart` timestamp NOT NULL,
	`scheduledEnd` timestamp NOT NULL,
	`status` enum('scheduled','en_route','on_site','complete','missed','cancelled') NOT NULL DEFAULT 'scheduled',
	`travelMinutes` int NOT NULL DEFAULT 0,
	`geoStatus` enum('pending','verified','flagged','manual_override') NOT NULL DEFAULT 'pending',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jobVisits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`contactId` int NOT NULL,
	`projectId` int,
	`jobNumber` varchar(32) NOT NULL,
	`title` varchar(180) NOT NULL,
	`description` text NOT NULL,
	`serviceAddress` varchar(360) NOT NULL,
	`stage` enum('scheduled','in_progress','on_hold','ready_for_invoicing','invoiced','cancelled') NOT NULL DEFAULT 'scheduled',
	`priority` enum('routine','standard','urgent','critical') NOT NULL DEFAULT 'standard',
	`foremanId` int,
	`scheduledStart` timestamp,
	`scheduledEnd` timestamp,
	`checkInAt` timestamp,
	`checkOutAt` timestamp,
	`geoStatus` enum('pending','verified','flagged','manual_override') NOT NULL DEFAULT 'pending',
	`holdReason` varchar(500),
	`cancelReason` varchar(500),
	`completedAt` timestamp,
	`readyForInvoiceAt` timestamp,
	`createdBy` int NOT NULL,
	`updatedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `jobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `job_organization_number_unique` UNIQUE(`organizationId`,`jobNumber`)
);
--> statement-breakpoint
CREATE TABLE `monthlyOperationalSnapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`periodStart` timestamp NOT NULL,
	`jobsCompleted` int NOT NULL DEFAULT 0,
	`jobsInProgress` int NOT NULL DEFAULT 0,
	`jobsOnHold` int NOT NULL DEFAULT 0,
	`quotesSent` int NOT NULL DEFAULT 0,
	`quotesAccepted` int NOT NULL DEFAULT 0,
	`invoicesLinked` int NOT NULL DEFAULT 0,
	`invoicedValue` int NOT NULL DEFAULT 0,
	`firstVisitResolutionRate` int NOT NULL DEFAULT 0,
	`customerSatisfactionIndex` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `monthlyOperationalSnapshots_id` PRIMARY KEY(`id`),
	CONSTRAINT `monthly_snapshot_organization_period_unique` UNIQUE(`organizationId`,`periodStart`)
);
--> statement-breakpoint
CREATE TABLE `quoteItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quoteId` int NOT NULL,
	`description` varchar(240) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`unitPrice` int NOT NULL DEFAULT 0,
	`total` int NOT NULL DEFAULT 0,
	`source` enum('catalog','free_text') NOT NULL DEFAULT 'catalog',
	CONSTRAINT `quoteItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`jobId` int NOT NULL,
	`quoteNumber` varchar(40) NOT NULL,
	`status` enum('needs_pricing','draft','sent','accepted','declined','expired') NOT NULL DEFAULT 'needs_pricing',
	`assessedAt` timestamp,
	`sentAt` timestamp,
	`respondedAt` timestamp,
	`validUntil` timestamp,
	`total` int NOT NULL DEFAULT 0,
	`declineReason` varchar(500),
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quotes_id` PRIMARY KEY(`id`),
	CONSTRAINT `quote_organization_number_unique` UNIQUE(`organizationId`,`quoteNumber`)
);
--> statement-breakpoint
CREATE INDEX `invoice_link_job_idx` ON `invoiceLinks` (`organizationId`,`jobId`,`status`);--> statement-breakpoint
CREATE INDEX `job_evidence_job_idx` ON `jobEvidence` (`organizationId`,`jobId`,`evidenceType`);--> statement-breakpoint
CREATE INDEX `job_material_job_idx` ON `jobMaterials` (`organizationId`,`jobId`);--> statement-breakpoint
CREATE INDEX `job_visit_dispatch_idx` ON `jobVisits` (`organizationId`,`foremanId`,`scheduledStart`);--> statement-breakpoint
CREATE INDEX `job_visit_job_idx` ON `jobVisits` (`organizationId`,`jobId`);--> statement-breakpoint
CREATE INDEX `job_organization_stage_idx` ON `jobs` (`organizationId`,`stage`,`scheduledStart`);--> statement-breakpoint
CREATE INDEX `job_foreman_schedule_idx` ON `jobs` (`organizationId`,`foremanId`,`scheduledStart`);--> statement-breakpoint
CREATE INDEX `quote_item_quote_idx` ON `quoteItems` (`quoteId`);--> statement-breakpoint
CREATE INDEX `quote_organization_status_idx` ON `quotes` (`organizationId`,`status`,`updatedAt`);