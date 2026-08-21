CREATE TABLE `environmentReleases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`environment` enum('development','staging','production') NOT NULL,
	`version` varchar(80) NOT NULL,
	`commitSha` varchar(80),
	`status` enum('planned','deploying','healthy','degraded','rolled_back') NOT NULL DEFAULT 'planned',
	`deployedBy` int NOT NULL,
	`deployedAt` timestamp NOT NULL DEFAULT (now()),
	`rollbackVersion` varchar(80),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `environmentReleases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `releaseChecks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`releaseId` int NOT NULL,
	`category` enum('database','api','ui','security','performance','observability') NOT NULL,
	`checkName` varchar(180) NOT NULL,
	`status` enum('passed','warning','failed','not_run') NOT NULL,
	`evidence` varchar(600),
	`checkedAt` timestamp NOT NULL DEFAULT (now()),
	`checkedBy` varchar(120) NOT NULL DEFAULT 'release workflow',
	CONSTRAINT `releaseChecks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `environment_release_organization_idx` ON `environmentReleases` (`organizationId`,`environment`,`deployedAt`);--> statement-breakpoint
CREATE INDEX `release_check_release_idx` ON `releaseChecks` (`releaseId`,`category`,`status`);