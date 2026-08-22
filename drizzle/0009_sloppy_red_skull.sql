CREATE TABLE `syncLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`idempotencyKey` varchar(36) NOT NULL,
	`mutationType` varchar(60) NOT NULL,
	`processedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `syncLogs_id` PRIMARY KEY(`id`),
	CONSTRAINT `sync_log_idempotency_unique` UNIQUE(`organizationId`,`idempotencyKey`)
);
