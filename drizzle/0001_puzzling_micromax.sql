CREATE TABLE `activityLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`actorId` int,
	`action` varchar(100) NOT NULL,
	`entityType` varchar(60) NOT NULL,
	`entityId` int,
	`summary` varchar(500) NOT NULL,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activityLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `appSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`defaultProjectStatus` varchar(32) NOT NULL DEFAULT 'planning',
	`allowMemberInvites` boolean NOT NULL DEFAULT false,
	`notificationDigest` boolean NOT NULL DEFAULT true,
	`metadata` json,
	`updatedBy` int NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `appSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `appSettings_organizationId_unique` UNIQUE(`organizationId`)
);
--> statement-breakpoint
CREATE TABLE `cases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`contactId` int,
	`projectId` int,
	`reference` varchar(40) NOT NULL,
	`title` varchar(180) NOT NULL,
	`summary` text,
	`status` enum('open','investigating','pending','resolved','closed') NOT NULL DEFAULT 'open',
	`severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`ownerId` int,
	`dueDate` timestamp,
	`metadata` json,
	`createdBy` int NOT NULL,
	`updatedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `cases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`company` varchar(160),
	`email` varchar(320),
	`phone` varchar(50),
	`location` varchar(180),
	`status` enum('lead','active','inactive') NOT NULL DEFAULT 'lead',
	`notes` text,
	`metadata` json,
	`createdBy` int NOT NULL,
	`updatedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`projectId` int,
	`caseId` int,
	`contactId` int,
	`fileName` varchar(255) NOT NULL,
	`mimeType` varchar(120) NOT NULL,
	`sizeBytes` int NOT NULL,
	`storageKey` varchar(500) NOT NULL,
	`storageUrl` varchar(600) NOT NULL,
	`uploadedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`role` enum('admin','manager','member','viewer') NOT NULL,
	`token` varchar(128) NOT NULL,
	`invitedBy` int NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`acceptedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `invitations_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`projectId` int,
	`caseId` int,
	`contactId` int,
	`content` text NOT NULL,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`userId` int NOT NULL,
	`type` enum('assignment','activity','system') NOT NULL,
	`title` varchar(180) NOT NULL,
	`description` text,
	`href` varchar(300),
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organizationMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','admin','manager','member','viewer') NOT NULL,
	`title` varchar(120),
	`isActive` boolean NOT NULL DEFAULT true,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `organizationMembers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`slug` varchar(160) NOT NULL,
	`industry` varchar(100),
	`primaryColor` varchar(16) NOT NULL DEFAULT '#2563EB',
	`timezone` varchar(80) NOT NULL DEFAULT 'Africa/Johannesburg',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`),
	CONSTRAINT `organizations_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`contactId` int,
	`name` varchar(180) NOT NULL,
	`code` varchar(32) NOT NULL,
	`description` text,
	`status` enum('planning','active','on_hold','complete','archived') NOT NULL DEFAULT 'planning',
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`startDate` timestamp,
	`dueDate` timestamp,
	`budget` int,
	`progress` int NOT NULL DEFAULT 0,
	`metadata` json,
	`createdBy` int NOT NULL,
	`updatedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `savedViews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`resource` enum('contacts','projects','cases','tasks','reports') NOT NULL,
	`filters` json NOT NULL,
	`isShared` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `savedViews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`projectId` int,
	`caseId` int,
	`title` varchar(180) NOT NULL,
	`description` text,
	`status` enum('todo','in_progress','blocked','complete') NOT NULL DEFAULT 'todo',
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`assigneeId` int,
	`dueDate` timestamp,
	`completedAt` timestamp,
	`createdBy` int NOT NULL,
	`updatedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `activity_organization_idx` ON `activityLogs` (`organizationId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `case_organization_idx` ON `cases` (`organizationId`);--> statement-breakpoint
CREATE INDEX `case_status_idx` ON `cases` (`organizationId`,`status`);--> statement-breakpoint
CREATE INDEX `contact_organization_idx` ON `contacts` (`organizationId`);--> statement-breakpoint
CREATE INDEX `contact_status_idx` ON `contacts` (`organizationId`,`status`);--> statement-breakpoint
CREATE INDEX `document_organization_idx` ON `documents` (`organizationId`);--> statement-breakpoint
CREATE INDEX `invite_organization_idx` ON `invitations` (`organizationId`);--> statement-breakpoint
CREATE INDEX `note_organization_idx` ON `notes` (`organizationId`);--> statement-breakpoint
CREATE INDEX `notification_organization_idx` ON `notifications` (`organizationId`);--> statement-breakpoint
CREATE INDEX `notification_user_idx` ON `notifications` (`userId`,`readAt`);--> statement-breakpoint
CREATE INDEX `member_organization_idx` ON `organizationMembers` (`organizationId`);--> statement-breakpoint
CREATE INDEX `member_user_idx` ON `organizationMembers` (`userId`);--> statement-breakpoint
CREATE INDEX `project_organization_idx` ON `projects` (`organizationId`);--> statement-breakpoint
CREATE INDEX `project_status_idx` ON `projects` (`organizationId`,`status`);--> statement-breakpoint
CREATE INDEX `saved_view_organization_idx` ON `savedViews` (`organizationId`,`resource`);--> statement-breakpoint
CREATE INDEX `task_organization_idx` ON `tasks` (`organizationId`);--> statement-breakpoint
CREATE INDEX `task_assignee_idx` ON `tasks` (`organizationId`,`assigneeId`);--> statement-breakpoint
CREATE INDEX `task_status_idx` ON `tasks` (`organizationId`,`status`);