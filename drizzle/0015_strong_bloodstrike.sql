CREATE TABLE `photoFolders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`projectId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`slug` varchar(140) NOT NULL,
	`description` varchar(360),
	`trade` varchar(80) NOT NULL DEFAULT 'Shared field evidence',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `photoFolders_id` PRIMARY KEY(`id`),
	CONSTRAINT `photo_folder_organization_project_slug_unique` UNIQUE(`organizationId`,`projectId`,`slug`)
);
--> statement-breakpoint
ALTER TABLE `sitePhotos` ADD `projectId` int;--> statement-breakpoint
ALTER TABLE `sitePhotos` ADD `folderId` int;--> statement-breakpoint
ALTER TABLE `sitePhotos` ADD `contributorTrade` varchar(80) DEFAULT 'General field team' NOT NULL;--> statement-breakpoint
CREATE INDEX `photo_folder_organization_project_idx` ON `photoFolders` (`organizationId`,`projectId`);--> statement-breakpoint
CREATE INDEX `photo_folder_organization_trade_idx` ON `photoFolders` (`organizationId`,`trade`);--> statement-breakpoint
CREATE INDEX `site_photo_project_idx` ON `sitePhotos` (`organizationId`,`projectId`);--> statement-breakpoint
CREATE INDEX `site_photo_folder_idx` ON `sitePhotos` (`organizationId`,`folderId`);--> statement-breakpoint
CREATE INDEX `site_photo_contributor_idx` ON `sitePhotos` (`organizationId`,`contributorTrade`);