# Candidate Lifecycle Database Schema
## Comprehensive Schema for Recruitment Management System with DPDP Act 2023 Compliance

---

## Core Collections (MongoDB)

### 1. candidates
**Purpose:** Store all candidate information
```json
{
  "id": "uuid",
  "job_id": "uuid",
  "name": "string",
  "email": "email",
  "phone": "string",
  "skills": ["array", "of", "strings"],
  "experience_years": "integer",
  "resume_url": "string",
  "resume_text": "text",
  "stage": "enum[sourced,screened,technical,hr_round,offer,onboarding,declined,withdrawn,rejected]",
  "consent_log": {
    "timestamp": "datetime",
    "ip_address": "string",
    "method": "string",
    "consent_given": "boolean"
  },
  "posh_reports": ["array of report_ids"],
  "created_at": "datetime",
  "updated_at": "datetime",
  "stage_history": [
    {
      "stage": "string",
      "timestamp": "datetime",
      "updated_by": "string",
      "action": "string"
    }
  ]
}
```

**Indexes:**
- `id` (primary)
- `email` (unique)
- `job_id` (foreign key)
- `stage` (for filtering)
- `created_at` (for sorting)

---

### 2. sensitive_data (Statutory Vault)
**Purpose:** Encrypted storage for PII with restricted access
```json
{
  "id": "uuid",
  "candidate_id": "uuid",
  "pan": "encrypted_string",
  "aadhaar_masked": "encrypted_string", // Only last 4 digits stored
  "aadhaar_full": "encrypted_string", // Fully encrypted, access logged
  "uan": "encrypted_string",
  "gender": "encrypted_string",
  "age": "encrypted_integer",
  "caste": "encrypted_string",
  "created_at": "datetime",
  "updated_at": "datetime",
  "access_log": [
    {
      "accessed_by": "user_id",
      "accessed_at": "datetime",
      "purpose": "string",
      "ip_address": "string"
    }
  ]
}
```

**Security:**
- AES-256 encryption
- Separate collection from main candidate data
- Access logging mandatory
- Role-based access (Admin/DPO only)

**Indexes:**
- `id` (primary)
- `candidate_id` (foreign key, unique)

---

### 3. audit_logs (Candidate Lifecycle Events)
**Purpose:** Complete audit trail for all actions
```json
{
  "id": "uuid",
  "event_type": "enum[
    candidate_created,
    candidate_updated,
    stage_changed,
    interview_scheduled,
    interview_completed,
    scorecard_submitted,
    email_sent,
    document_generated,
    data_exported,
    data_purged,
    withdrawal_requested,
    withdrawal_approved,
    posh_report_filed,
    sensitive_data_accessed,
    appointment_letter_sent
  ]",
  "candidate_id": "uuid",
  "candidate_email": "string", // Preserved even after deletion
  "candidate_name": "string", // Preserved even after deletion
  "performed_by": "string", // user email
  "performed_by_name": "string",
  "timestamp": "datetime",
  "ip_address": "string",
  "user_agent": "string",
  "details": {
    // Event-specific details (flexible schema)
    "old_value": "any",
    "new_value": "any",
    "reason": "string",
    "notes": "string"
  },
  "compliance_flag": "boolean", // True for DPDP Act related events
  "retention_period": "integer" // Days to retain this log (永久 for compliance)
}
```

**Indexes:**
- `id` (primary)
- `event_type` (for filtering)
- `candidate_id` (for timeline)
- `performed_by` (for user activity)
- `timestamp` (for chronological queries)
- `compliance_flag` (for compliance reports)

**Retention:** Permanent for compliance events, 7 years for others

---

### 4. jobs
**Purpose:** Job requisitions
```json
{
  "id": "uuid",
  "title": "string",
  "department": "string",
  "location": "string",
  "description": "text",
  "requirements": ["array"],
  "status": "enum[active,closed,on_hold]",
  "created_by": "uuid",
  "hiring_manager": "uuid",
  "created_at": "datetime"
}
```

---

### 5. interview_schedules
**Purpose:** Track all interview appointments
```json
{
  "id": "uuid",
  "candidate_id": "uuid",
  "job_id": "uuid",
  "interviewer_user_id": "uuid",
  "interviewer_name": "string",
  "interviewer_email": "email",
  "interview_type": "enum[Screening,Technical,HR Round,Final]",
  "start_time": "datetime",
  "end_time": "datetime",
  "duration_minutes": "integer",
  "meeting_url": "string",
  "status": "enum[scheduled,completed,cancelled,no_show]",
  "include_resume": "boolean",
  "include_scorecard_link": "boolean",
  "calendar_invite_sent": "boolean",
  "reminder_sent": "boolean",
  "created_by": "uuid",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

**Indexes:**
- `id` (primary)
- `candidate_id` (foreign key)
- `interviewer_user_id` (for conflict detection)
- `start_time` (for calendar queries)
- `status` (for filtering)

---

### 6. scorecards
**Purpose:** Interview feedback and ratings
```json
{
  "id": "uuid",
  "candidate_id": "uuid",
  "interview_schedule_id": "uuid",
  "interviewer_name": "string",
  "interviewer_email": "email",
  "round_name": "string",
  "rating": "integer", // 1-5
  "feedback": "text",
  "recommendation": "enum[strong_hire,hire,no_hire]",
  "skills_assessed": ["array"],
  "created_at": "datetime"
}
```

---

### 7. appointment_letters
**Purpose:** Store generated appointment letters
```json
{
  "id": "uuid",
  "candidate_id": "uuid",
  "designation": "string",
  "joining_date": "datetime",
  "ctc_annual": "float",
  "ctc_breakup": {
    "basic_salary": "float",
    "hra": "float",
    "special_allowance": "float",
    "bonus": "float",
    "pf_contribution": "float",
    "insurance": "float"
  },
  "reporting_manager": "string",
  "work_location": "string",
  "probation_period_months": "integer",
  "notice_period_days": "integer",
  "pf_uan_required": "boolean",
  "esic_required": "boolean",
  "pdf_base64": "base64_string", // Encrypted
  "pdf_url": "string", // S3 URL if using external storage
  "email_sent": "boolean",
  "sent_at": "datetime",
  "accepted": "boolean",
  "accepted_at": "datetime",
  "e_signature": "base64_string", // If using e-sign
  "e_sign_provider": "enum[aadhaar,docusign,null]",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

**Indexes:**
- `id` (primary)
- `candidate_id` (foreign key)
- `email_sent` (for tracking)

---

### 8. withdrawal_requests
**Purpose:** Track candidate withdrawal requests
```json
{
  "id": "uuid",
  "candidate_id": "uuid",
  "reason": "enum[Better Offer,Process Speed,Role Mismatch,Personal Reasons,etc]",
  "purge_immediately": "boolean",
  "status": "enum[pending,completed]",
  "processed_by": "string", // Recruiter who approved
  "processed_at": "datetime",
  "exit_survey_completed": "boolean",
  "exit_survey_response": "json",
  "created_at": "datetime"
}
```

---

### 9. posh_reports
**Purpose:** POSH & Ethics incident reporting
```json
{
  "id": "uuid",
  "candidate_id": "uuid",
  "reported_by": "string",
  "incident_type": "string",
  "incident_date": "datetime",
  "description": "text",
  "witnesses": ["array"],
  "action_taken": "text",
  "status": "enum[open,investigating,resolved,closed]",
  "resolution": "text",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

**Security:** Restricted access, encrypted sensitive fields

---

### 10. users
**Purpose:** System users (recruiters, admins, etc.)
```json
{
  "id": "uuid",
  "email": "email",
  "name": "string",
  "role": "enum[admin,recruiter,hiring_manager,dpo]",
  "password_hash": "string",
  "permissions": ["array"],
  "created_at": "datetime",
  "last_login": "datetime",
  "active": "boolean"
}
```

---

### 11. email_templates
**Purpose:** Reusable email templates
```json
{
  "id": "uuid",
  "name": "string",
  "type": "enum[rejection,interview,onboarding,withdrawal]",
  "subject": "string",
  "body": "html",
  "variables": ["array"], // {{candidate_name}}, {{job_title}}, etc.
  "active": "boolean",
  "created_by": "uuid",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

---

### 12. document_storage (If using S3)
**Purpose:** Track all documents stored externally
```json
{
  "id": "uuid",
  "candidate_id": "uuid",
  "document_type": "enum[resume,appointment_letter,snapshot,id_proof]",
  "file_name": "string",
  "s3_key": "string",
  "s3_bucket": "string",
  "file_size": "integer",
  "mime_type": "string",
  "encrypted": "boolean",
  "uploaded_by": "uuid",
  "uploaded_at": "datetime",
  "access_log": [
    {
      "accessed_by": "uuid",
      "accessed_at": "datetime",
      "action": "enum[view,download,delete]"
    }
  ]
}
```

---

## Relationships

```
jobs (1) -----> (N) candidates
candidates (1) -----> (1) sensitive_data
candidates (1) -----> (N) interview_schedules
candidates (1) -----> (N) scorecards
candidates (1) -----> (N) appointment_letters
candidates (1) -----> (N) withdrawal_requests
candidates (1) -----> (N) posh_reports
users (1) -----> (N) audit_logs (performed_by)
users (1) -----> (N) interview_schedules (interviewer)
```

---

## Compliance & Security

### DPDP Act 2023 Requirements

1. **Consent Management**
   - Explicit consent logged in `candidates.consent_log`
   - Timestamp, method, and IP address recorded

2. **Right to Access**
   - Generate snapshot via `/api/candidates/{id}/generate-snapshot`
   - Returns complete data in PDF format

3. **Right to Erasure**
   - Candidate requests via withdrawal
   - Admin approves → data purged
   - Audit log preserved (email/name only, no PII)

4. **Data Minimization**
   - Sensitive data stored separately
   - Automatic cleanup after 6 months for withdrawn candidates
   - Configurable retention policies

5. **Purpose Limitation**
   - Data only used for recruitment
   - Access logging for sensitive data

6. **Security Safeguards**
   - Encryption at rest (sensitive_data collection)
   - Encryption in transit (HTTPS)
   - Access controls (RBAC)
   - Audit logging for all actions

---

## Indexes & Performance

### Critical Indexes:
```javascript
// candidates
db.candidates.createIndex({ "email": 1 }, { unique: true })
db.candidates.createIndex({ "job_id": 1 })
db.candidates.createIndex({ "stage": 1 })
db.candidates.createIndex({ "created_at": -1 })

// audit_logs
db.audit_logs.createIndex({ "timestamp": -1 })
db.audit_logs.createIndex({ "candidate_id": 1 })
db.audit_logs.createIndex({ "event_type": 1 })
db.audit_logs.createIndex({ "compliance_flag": 1 })

// interview_schedules
db.interview_schedules.createIndex({ "interviewer_user_id": 1, "start_time": 1 })
db.interview_schedules.createIndex({ "candidate_id": 1 })
db.interview_schedules.createIndex({ "status": 1 })

// sensitive_data
db.sensitive_data.createIndex({ "candidate_id": 1 }, { unique: true })
```

---

## Backup & Recovery

### Backup Strategy:
- **Daily:** Full backup of all collections
- **Hourly:** Incremental backup of audit_logs
- **Real-time:** Replication for high availability

### Retention:
- Active candidates: Indefinite
- Withdrawn (talent pool): 6 months
- Rejected: Immediate purge or 6 months
- Audit logs: 7 years (compliance requirement)
- POSH reports: 10 years (legal requirement)

---

## Migration Scripts (PostgreSQL Alternative)

If using PostgreSQL instead of MongoDB:

```sql
-- Example for candidates table
CREATE TABLE candidates (
    id UUID PRIMARY KEY,
    job_id UUID REFERENCES jobs(id),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    skills TEXT[],
    experience_years INTEGER,
    stage VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sensitive data with encryption
CREATE TABLE sensitive_data (
    id UUID PRIMARY KEY,
    candidate_id UUID REFERENCES candidates(id) UNIQUE,
    pan_encrypted BYTEA,
    aadhaar_encrypted BYTEA,
    uan_encrypted BYTEA,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    candidate_id UUID,
    performed_by VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    details JSONB,
    compliance_flag BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_candidate ON audit_logs(candidate_id);
CREATE INDEX idx_audit_compliance ON audit_logs(compliance_flag);
```

---

## Data Lifecycle

```
[Sourced] → [Screened] → [Technical] → [HR Round] → [Offer] → [Onboarded]
                ↓              ↓           ↓           ↓
            [Declined] → [Pending Approval] → [Purged]
                ↓
            [Withdrawn] → [Talent Pool 6m] → [Auto Purge]
```

---

This schema supports complete candidate lifecycle management with DPDP Act 2023 compliance, audit trails, and secure data handling.
