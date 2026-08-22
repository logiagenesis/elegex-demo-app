ALTER TABLE `cases` ADD CONSTRAINT `case_organization_reference_unique` UNIQUE(`organizationId`,`reference`);--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `document_organization_storage_key_unique` UNIQUE(`organizationId`,`storageKey`);--> statement-breakpoint
ALTER TABLE `invoiceLinks` ADD CONSTRAINT `invoice_link_external_reference_unique` UNIQUE(`organizationId`,`externalSystem`,`externalInvoiceNumber`);--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `project_organization_code_unique` UNIQUE(`organizationId`,`code`);--> statement-breakpoint
CREATE INDEX `document_contact_idx` ON `documents` (`organizationId`,`contactId`);--> statement-breakpoint
CREATE INDEX `document_project_idx` ON `documents` (`organizationId`,`projectId`);--> statement-breakpoint
CREATE INDEX `document_case_idx` ON `documents` (`organizationId`,`caseId`);--> statement-breakpoint
CREATE INDEX `task_project_idx` ON `tasks` (`organizationId`,`projectId`);--> statement-breakpoint
CREATE INDEX `task_case_idx` ON `tasks` (`organizationId`,`caseId`);