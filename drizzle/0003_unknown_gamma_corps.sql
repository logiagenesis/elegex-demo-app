CREATE TABLE `integrationConnections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`provider` enum('database','webhook','analytics','storage') NOT NULL,
	`name` varchar(120) NOT NULL,
	`status` enum('active','paused','degraded','disabled') NOT NULL DEFAULT 'active',
	`configuration` json NOT NULL,
	`secretReference` varchar(180),
	`lastValidatedAt` timestamp,
	`lastError` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `integrationConnections_id` PRIMARY KEY(`id`),
	CONSTRAINT `integration_connection_unique` UNIQUE(`organizationId`,`provider`,`name`)
);
--> statement-breakpoint
CREATE TABLE `integrationEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`connectionId` int NOT NULL,
	`eventType` varchar(120) NOT NULL,
	`payload` json NOT NULL,
	`idempotencyKey` varchar(180) NOT NULL,
	`status` enum('pending','processing','delivered','failed','discarded') NOT NULL DEFAULT 'pending',
	`attempts` int NOT NULL DEFAULT 0,
	`availableAt` timestamp NOT NULL DEFAULT (now()),
	`processedAt` timestamp,
	`lastError` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `integrationEvents_id` PRIMARY KEY(`id`),
	CONSTRAINT `integration_event_idempotency_unique` UNIQUE(`connectionId`,`idempotencyKey`)
);
--> statement-breakpoint
CREATE INDEX `integration_connection_organization_idx` ON `integrationConnections` (`organizationId`,`status`);--> statement-breakpoint
CREATE INDEX `integration_event_dispatch_idx` ON `integrationEvents` (`connectionId`,`status`,`availableAt`);