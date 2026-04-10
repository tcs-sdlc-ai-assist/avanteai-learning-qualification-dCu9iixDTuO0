# Changelog

All notable changes to the Avante AI Compliance project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-15

### Added

#### Program & Policy Management
- Full CRUD operations for compliance programs and policies.
- Version history tracking for all policy changes with diff support.
- Ability to associate policies with specific compliance programs.
- Policy status lifecycle management (Draft, Active, Archived).

#### Evidence Ingestion
- CSV file upload and parsing for bulk evidence ingestion.
- Excel (.xlsx) file upload and parsing for bulk evidence ingestion.
- Evidence metadata extraction and storage.
- File validation and error reporting for malformed uploads.
- Association of evidence records with programs and policies.

#### Simulated AI Validation
- Automated validation engine for submitted evidence.
- Configurable validation rules per policy type.
- Validation result scoring with pass/fail/warning outcomes.
- Detailed validation reports with findings and recommendations.

#### Exception Review Workflow
- Exception request creation and submission workflow.
- Multi-step review and approval process.
- SLA tracking with configurable deadlines per exception type.
- SLA breach notifications and escalation alerts.
- Exception status tracking (Pending, Under Review, Approved, Rejected, Expired).

#### Role-Based Dashboards
- Compliance Officer dashboard with program overview and pending actions.
- Auditor dashboard with evidence review queue and validation results.
- Administrator dashboard with system health and user management.
- Dashboard widgets with real-time data refresh.

#### Real-Time Notifications
- SignalR-based real-time notification delivery.
- Notification types: SLA warnings, review assignments, validation completions, status changes.
- In-app notification center with read/unread tracking.
- Per-user notification preferences.

#### Data Export
- CSV export for programs, policies, evidence, and exceptions.
- JSON export for programs, policies, evidence, and exceptions.
- Filtered and full dataset export support.
- Export audit trail logging.

#### Immutable Audit Logging
- Append-only audit log for all system operations.
- Captures user identity, timestamp, action type, and affected entity.
- Audit log query and filtering API.
- Tamper-evident log integrity verification.

#### Authentication & Authorization
- JWT-based authentication with access and refresh tokens.
- Role-Based Access Control (RBAC) with predefined roles: Administrator, Compliance Officer, Auditor, Viewer.
- Secure password hashing and storage.
- Token expiration and refresh flow.
- Role-based API endpoint authorization.

#### Technical Foundation
- ASP.NET Core 9 Web API backend.
- React 18 frontend with Vite build tooling.
- Entity Framework Core with SQLite for data persistence.
- Tailwind CSS for responsive UI styling.
- Structured logging throughout the application.
- Centralized error handling and validation middleware.