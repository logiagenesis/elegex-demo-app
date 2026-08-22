ALTER TABLE `documents` ADD `documentType` enum('coc','quote','invoice','job_card','photo_evidence','material_list','compliance_cert','site_report') DEFAULT 'site_report' NOT NULL;--> statement-breakpoint
ALTER TABLE `documents` ADD `retentionYears` int DEFAULT 7 NOT NULL;--> statement-breakpoint
ALTER TABLE `documents` ADD `classificationLevel` enum('public','internal','confidential','restricted') DEFAULT 'internal' NOT NULL;--> statement-breakpoint
CREATE INDEX `document_type_retention_idx` ON `documents` (`organizationId`,`documentType`,`classificationLevel`);