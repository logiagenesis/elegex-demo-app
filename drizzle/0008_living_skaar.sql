CREATE TABLE `callOutTypes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`name` varchar(180) NOT NULL,
	`baseRate` int NOT NULL DEFAULT 0,
	`travelIncludedKm` int NOT NULL DEFAULT 0,
	`perKmRate` int NOT NULL DEFAULT 0,
	`appliesFrom` varchar(5) NOT NULL,
	`appliesTo` varchar(5) NOT NULL,
	`activeFrom` timestamp NOT NULL DEFAULT (now()),
	`activeTo` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `callOutTypes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`clientType` enum('domestic','commercial','body_corporate','estate_development','managing_agent') NOT NULL DEFAULT 'domestic',
	`billingEntityId` int,
	`email` varchar(320),
	`phone` varchar(50),
	`address` varchar(360),
	`status` enum('lead','active','inactive') NOT NULL DEFAULT 'active',
	`notes` text,
	`createdBy` int NOT NULL,
	`updatedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`clientId` int NOT NULL,
	`contactId` int,
	`name` varchar(180) NOT NULL,
	`address` varchar(360) NOT NULL,
	`suburb` varchar(180),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `sites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `appSettings` ADD `locale` varchar(32) DEFAULT 'en-ZA' NOT NULL;--> statement-breakpoint
ALTER TABLE `appSettings` ADD `currency` varchar(32) DEFAULT 'ZAR' NOT NULL;--> statement-breakpoint
ALTER TABLE `appSettings` ADD `timezone` varchar(80) DEFAULT 'Africa/Johannesburg' NOT NULL;--> statement-breakpoint
ALTER TABLE `jobs` ADD `clientId` int;--> statement-breakpoint
ALTER TABLE `jobs` ADD `siteId` int;--> statement-breakpoint
ALTER TABLE `jobs` ADD `callOutTypeId` int;--> statement-breakpoint
CREATE INDEX `call_out_type_organization_idx` ON `callOutTypes` (`organizationId`,`activeFrom`);--> statement-breakpoint
CREATE INDEX `client_organization_idx` ON `clients` (`organizationId`);--> statement-breakpoint
CREATE INDEX `site_organization_idx` ON `sites` (`organizationId`,`clientId`);--> statement-breakpoint
CREATE INDEX `job_client_site_idx` ON `jobs` (`organizationId`,`clientId`,`siteId`);--> statement-breakpoint
ALTER TABLE `organizations` DROP COLUMN `timezone`;