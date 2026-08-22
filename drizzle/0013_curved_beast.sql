CREATE TABLE `aiUsage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`userId` int NOT NULL,
	`feature` enum('job_summary','quote_draft','evidence_caption') NOT NULL,
	`provider` varchar(40) NOT NULL,
	`model` varchar(120) NOT NULL,
	`inputTokens` int NOT NULL DEFAULT 0,
	`outputTokens` int NOT NULL DEFAULT 0,
	`estimatedCostMicros` int NOT NULL DEFAULT 0,
	`requestId` varchar(120),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aiUsage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `ai_usage_organization_created_idx` ON `aiUsage` (`organizationId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `ai_usage_user_created_idx` ON `aiUsage` (`userId`,`createdAt`);