CREATE TABLE `contractorMarketplaceEntries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`name` varchar(180) NOT NULL,
	`trade` varchar(100) NOT NULL,
	`serviceAreas` json NOT NULL,
	`contactEmail` varchar(320),
	`contactPhone` varchar(50),
	`notes` text,
	`verificationStatus` enum('not_verified','self_attested','verified_by_workspace') NOT NULL DEFAULT 'not_verified',
	`availabilityStatus` enum('unknown','accepting_enquiries','unavailable') NOT NULL DEFAULT 'unknown',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archivedAt` timestamp,
	CONSTRAINT `contractorMarketplaceEntries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `maintenancePlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`projectId` int,
	`siteId` int,
	`title` varchar(180) NOT NULL,
	`description` text,
	`intervalDays` int NOT NULL,
	`nextDueAt` timestamp NOT NULL,
	`assignedTo` int,
	`status` enum('active','paused','completed') NOT NULL DEFAULT 'active',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `maintenancePlans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `repairReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`jobId` int,
	`reportedBy` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`description` text NOT NULL,
	`priority` enum('low','standard','urgent','critical') NOT NULL DEFAULT 'standard',
	`status` enum('reported','triaged','assigned','resolved','closed') NOT NULL DEFAULT 'reported',
	`firstFixOutcome` enum('unknown','resolved_first_visit','follow_up_required') NOT NULL DEFAULT 'unknown',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `repairReports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviewRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`jobId` int NOT NULL,
	`contactId` int,
	`channel` enum('email','sms','manual') NOT NULL DEFAULT 'manual',
	`status` enum('draft','queued','sent','cancelled') NOT NULL DEFAULT 'draft',
	`consentConfirmed` boolean NOT NULL DEFAULT false,
	`requestedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reviewRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `marketplace_entry_organization_trade_idx` ON `contractorMarketplaceEntries` (`organizationId`,`trade`,`archivedAt`);--> statement-breakpoint
CREATE INDEX `maintenance_plan_organization_due_idx` ON `maintenancePlans` (`organizationId`,`status`,`nextDueAt`);--> statement-breakpoint
CREATE INDEX `maintenance_plan_site_idx` ON `maintenancePlans` (`organizationId`,`siteId`);--> statement-breakpoint
CREATE INDEX `repair_report_organization_status_idx` ON `repairReports` (`organizationId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `repair_report_job_idx` ON `repairReports` (`organizationId`,`jobId`);--> statement-breakpoint
CREATE INDEX `review_request_organization_status_idx` ON `reviewRequests` (`organizationId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `review_request_job_idx` ON `reviewRequests` (`organizationId`,`jobId`);