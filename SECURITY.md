# Security Policy

## Reporting a vulnerability

Please do not open public issues for suspected vulnerabilities. Contact the repository maintainer privately with a concise description, reproduction steps, affected component, and suggested mitigation. Acknowledgement and triage should occur before any public disclosure.

## Security posture

Elegex uses authenticated server procedures, tenant-scoped database predicates, role-based authorization, input validation, restricted document uploads, managed object storage, and audit logging. Secrets must be injected through the deployment environment or managed secret configuration; they must never be committed to source control or stored in `integrationConnections.configuration`.
