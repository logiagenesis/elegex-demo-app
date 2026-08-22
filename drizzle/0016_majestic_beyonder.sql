CREATE TABLE `bookingRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`profileId` int NOT NULL,
	`customerName` varchar(160) NOT NULL,
	`email` varchar(320),
	`phone` varchar(50),
	`serviceType` varchar(120) NOT NULL,
	`address` varchar(360) NOT NULL,
	`description` text NOT NULL,
	`preferredStart` timestamp,
	`preferredEnd` timestamp,
	`consentToContact` boolean NOT NULL DEFAULT false,
	`status` enum('new','reviewing','quoted','scheduled','declined') NOT NULL DEFAULT 'new',
	`assignedTo` int,
	`convertedContactId` int,
	`convertedJobId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bookingRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contractorInvoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`jobId` int NOT NULL,
	`invoiceNumber` varchar(60) NOT NULL,
	`amountDue` int NOT NULL DEFAULT 0,
	`amountPaid` int NOT NULL DEFAULT 0,
	`dueAt` timestamp,
	`status` enum('draft','sent','viewed','partially_paid','paid','overdue','void') NOT NULL DEFAULT 'draft',
	`paymentProvider` varchar(80) NOT NULL DEFAULT 'manual',
	`paymentReference` varchar(160),
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contractorInvoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `contractor_invoice_organization_number_unique` UNIQUE(`organizationId`,`invoiceNumber`)
);
--> statement-breakpoint
CREATE TABLE `contractorProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`slug` varchar(120) NOT NULL,
	`displayName` varchar(160) NOT NULL,
	`summary` text,
	`serviceAreas` json NOT NULL,
	`services` json NOT NULL,
	`bookingEnabled` boolean NOT NULL DEFAULT true,
	`reviewRequestsEnabled` boolean NOT NULL DEFAULT true,
	`publicContactEmail` varchar(320),
	`publicContactPhone` varchar(50),
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contractorProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `contractor_profile_slug_unique` UNIQUE(`slug`),
	CONSTRAINT `contractor_profile_organization_unique` UNIQUE(`organizationId`)
);
--> statement-breakpoint
CREATE TABLE `growthGuideProgress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`userId` int NOT NULL,
	`leadSource` enum('google_business_profile','nextdoor','facebook','referrals','local_partnerships') NOT NULL,
	`level` int NOT NULL DEFAULT 1,
	`completedSteps` json NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `growthGuideProgress_id` PRIMARY KEY(`id`),
	CONSTRAINT `growth_guide_user_source_unique` UNIQUE(`organizationId`,`userId`,`leadSource`)
);
--> statement-breakpoint
CREATE TABLE `jobExpenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`jobId` int NOT NULL,
	`category` enum('materials','travel','equipment','subcontractor','other') NOT NULL,
	`amount` int NOT NULL,
	`description` varchar(280) NOT NULL,
	`receiptStorageKey` varchar(500),
	`receiptStorageUrl` varchar(600),
	`recordedBy` int NOT NULL,
	`incurredAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `jobExpenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `jobTimeEntries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`jobId` int NOT NULL,
	`userId` int NOT NULL,
	`startedAt` timestamp NOT NULL,
	`endedAt` timestamp,
	`geoStatus` enum('not_requested','verified','manual_override','unavailable') NOT NULL DEFAULT 'not_requested',
	`notes` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jobTimeEntries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketingDrafts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`jobId` int,
	`channel` enum('facebook','instagram','nextdoor','general') NOT NULL DEFAULT 'general',
	`source` varchar(80) NOT NULL DEFAULT 'manual',
	`content` text NOT NULL,
	`status` enum('draft','approved','archived') NOT NULL DEFAULT 'draft',
	`reviewRequired` boolean NOT NULL DEFAULT true,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketingDrafts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quoteApprovals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`quoteId` int NOT NULL,
	`approvalToken` varchar(72) NOT NULL,
	`customerName` varchar(160),
	`status` enum('pending','approved','declined') NOT NULL DEFAULT 'pending',
	`respondedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quoteApprovals_id` PRIMARY KEY(`id`),
	CONSTRAINT `quote_approval_token_unique` UNIQUE(`approvalToken`),
	CONSTRAINT `quote_approval_quote_unique` UNIQUE(`quoteId`)
);
--> statement-breakpoint
CREATE INDEX `booking_request_organization_status_idx` ON `bookingRequests` (`organizationId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `booking_request_profile_idx` ON `bookingRequests` (`profileId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `contractor_invoice_organization_status_idx` ON `contractorInvoices` (`organizationId`,`status`,`dueAt`);--> statement-breakpoint
CREATE INDEX `contractor_invoice_job_idx` ON `contractorInvoices` (`organizationId`,`jobId`);--> statement-breakpoint
CREATE INDEX `job_expense_organization_job_idx` ON `jobExpenses` (`organizationId`,`jobId`,`incurredAt`);--> statement-breakpoint
CREATE INDEX `job_time_entry_organization_user_idx` ON `jobTimeEntries` (`organizationId`,`userId`,`startedAt`);--> statement-breakpoint
CREATE INDEX `job_time_entry_job_idx` ON `jobTimeEntries` (`organizationId`,`jobId`);--> statement-breakpoint
CREATE INDEX `marketing_draft_organization_status_idx` ON `marketingDrafts` (`organizationId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `quote_approval_organization_status_idx` ON `quoteApprovals` (`organizationId`,`status`);