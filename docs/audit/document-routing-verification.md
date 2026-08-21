# Document Routing Verification
2
3	**Assessment date:** 21 August 2026
4
5	## The Problem
6
7	The storage architecture is unproven because nothing meaningful has passed through it. An upload path that has never carried realistic files under realistic conditions is not a verified upload path.
8
9	## Verification Matrix
10
11	For every document type, assert end-to-end that a file uploaded through the UI arrives where it belongs.
12
13	*This matrix will be populated in WP4 execution.*
14
15	| Document Type | UI Upload | Storage Key Correct | Tenant Isolation in Key | DB Row Accurate | Re-read Checksum Match | UI Visibility (Card, Client, Count) | Cross-Tenant 404 | URL Expiry |
16	|---|---|---|---|---|---|---|---|---|
17	| `before_photo` | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING |
18	| `after_photo` | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING |
19	| `fault_video` | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING |
20	| `client_signature` | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING |
21	| `job_card_pdf` | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING |
22	| `coc_certificate` | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING |
23	| `quote_pdf` | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING |
24	| `material_slip` | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING |
25	| `safety_checklist` | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING |
26	| `site_access_note` | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING |
27	| `client_correspondence` | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING |
28	| `warranty_document` | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING |
29
