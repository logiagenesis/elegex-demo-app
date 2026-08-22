USE elegex_test;

SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO organizations (name, slug, primaryColor, createdBy)
VALUES ('FK Test Tenant', 'fk-test-tenant', '#000000', 1);
SET @organization_id = LAST_INSERT_ID();

INSERT INTO clients (organizationId, name, clientType, createdBy, updatedBy)
VALUES (@organization_id, 'FK Test Client', 'commercial', 1, 1);
SET @client_id = LAST_INSERT_ID();

INSERT INTO callOutTypes (organizationId, name, baseRate, travelIncludedKm, perKmRate, appliesFrom, appliesTo)
VALUES (@organization_id, 'FK Test Call-out', 650, 25, 6, '08:00', '17:00');
SET @call_out_type_id = LAST_INSERT_ID();

INSERT INTO sites (organizationId, clientId, name, address)
VALUES (@organization_id, @client_id, 'FK Test Site', '1 Test Road, Cape Town');
SET @site_id = LAST_INSERT_ID();

INSERT INTO jobs (organizationId, clientId, siteId, callOutTypeId, contactId, jobNumber, title, description, serviceAddress, createdBy, updatedBy)
VALUES (@organization_id, @client_id, @site_id, @call_out_type_id, 1, '#99001', 'FK Test Job', 'Foreign key integration test job.', '1 Test Road, Cape Town', 1, 1);
SET @job_id = LAST_INSERT_ID();

SELECT 'VALID_RELATIONSHIPS' AS check_name, @organization_id AS organization_id, @client_id AS client_id, @site_id AS site_id, @call_out_type_id AS call_out_type_id, @job_id AS job_id;

SELECT
  j.id AS job_id,
  c.id AS client_id,
  s.id AS site_id,
  cot.id AS call_out_type_id
FROM jobs j
INNER JOIN clients c ON c.id = j.clientId
INNER JOIN sites s ON s.id = j.siteId
INNER JOIN callOutTypes cot ON cot.id = j.callOutTypeId
WHERE j.id = @job_id;

-- The following inserts must fail with foreign-key violations.
INSERT INTO sites (organizationId, clientId, name, address)
VALUES (@organization_id, 99999999, 'Invalid Site', 'Unknown Client Address');

INSERT INTO jobs (organizationId, clientId, siteId, callOutTypeId, contactId, jobNumber, title, description, serviceAddress, createdBy, updatedBy)
VALUES (@organization_id, @client_id, @site_id, 99999999, 1, '#99002', 'Invalid Call-out', 'Must not persist.', '1 Test Road, Cape Town', 1, 1);

SELECT 'FOREIGN_KEY_CONSTRAINTS' AS check_name, table_name, constraint_name, referenced_table_name
FROM information_schema.key_column_usage
WHERE table_schema = DATABASE()
  AND table_name IN ('clients', 'sites', 'jobs', 'callOutTypes')
  AND referenced_table_name IS NOT NULL
ORDER BY table_name, constraint_name;
