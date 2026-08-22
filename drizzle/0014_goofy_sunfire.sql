CREATE TABLE `sitePhotos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`jobId` int,
	`siteId` int,
	`title` varchar(180) NOT NULL,
	`description` text,
	`tags` varchar(500) NOT NULL DEFAULT '',
	`category` enum('before','during','after','issue','asset','other') NOT NULL DEFAULT 'other',
	`originalFileName` varchar(255) NOT NULL,
	`mimeType` varchar(120) NOT NULL,
	`sizeBytes` int NOT NULL,
	`storageKey` varchar(500) NOT NULL,
	`storageUrl` varchar(600) NOT NULL,
	`capturedAt` timestamp NOT NULL DEFAULT (now()),
	`uploadedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `sitePhotos_id` PRIMARY KEY(`id`),
	CONSTRAINT `site_photo_organization_storage_key_unique` UNIQUE(`organizationId`,`storageKey`)
);
--> statement-breakpoint
CREATE INDEX `site_photo_organization_created_idx` ON `sitePhotos` (`organizationId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `site_photo_job_idx` ON `sitePhotos` (`organizationId`,`jobId`);--> statement-breakpoint
CREATE INDEX `site_photo_site_idx` ON `sitePhotos` (`organizationId`,`siteId`);--> statement-breakpoint
CREATE INDEX `site_photo_category_idx` ON `sitePhotos` (`organizationId`,`category`);