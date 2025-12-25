# Database Schema - Lifecycle Events & Compliance

## MongoDB Collections

### 1. lifecycle_events
**Purpose**: Audit trail for all candidate lifecycle events (DPDP Act 2023 compliance)

```javascript
{
  _id: ObjectId,
  id: String (UUID),
  candidate_id: String (UUID),
  event_type: String, // "rejection", "onboarding", "interview_scheduled", "data_snapshot", "withdrawal", "stage_change"
  event_subtype: String (Optional), // For granular tracking (e.g., "Technical Round")
  recruiter_id: String (UUID),
  recruiter_email: String,
  metadata: Object, // Event-specific data
  email_sent: Boolean,
  email_id: String (Optional), // Email provider ID
  pdf_generated: Boolean,
  pdf_url: String (Optional), // S3 URL or base64
  data_purged: Boolean,
  timestamp: ISODate
}
```

**Indexes**:
- `candidate_id` (ascending)
- `event_type` (ascending)
- `timestamp` (descending)
- Compound: `(candidate_id, timestamp)`

**Example Documents**:

```javascript
// Rejection Event
{
  "id": "e7a1b3c4-5d6f-7g8h-9i0j-k1l2m3n4o5p6",
  "candidate_id": "c123-4567-89ab-cdef",
  "event_type": "rejection",
  "recruiter_id": "r456-7890-abcd-ef12",
  "recruiter_email": "recruiter@company.com",
  "metadata": {
    "reason": "Skills mismatch",
    "custom_message": "Thank you for your interest..."
  },
  "email_sent": true,
  "email_id": "re_abc123xyz",
  "data_purged": true,
  "timestamp": ISODate("2025-01-15T10:30:00Z")
}

// Onboarding Event
{
  "id": "f8b2c4d5-6e7f-8g9h-0i1j-k2l3m4n5o6p7",
  "candidate_id": "c123-4567-89ab-cdef",
  "event_type": "onboarding",
  "recruiter_id": "r456-7890-abcd-ef12",
  "recruiter_email": "hr@company.com",
  "metadata": {
    "designation": "Senior Software Engineer",
    "ctc_annual": 1500000,
    "joining_date": "2025-02-01"
  },
  "email_sent": true,
  "pdf_generated": true,
  "pdf_url": "https://s3.amazonaws.com/rms-docs/appointment_letters/...",
  "timestamp": ISODate("2025-01-15T14:00:00Z")
}

// Interview Scheduled Event
{
  "id": "g9c3d5e6-7f8g-9h0i-1j2k-l3m4n5o6p7q8",
  "candidate_id": "c123-4567-89ab-cdef",
  "event_type": "interview_scheduled",
  "event_subtype": "Technical Round",
  "recruiter_id": "r456-7890-abcd-ef12",
  "recruiter_email": "recruiter@company.com",
  "metadata": {
    "interviewer": "John Doe",
    "start_time": "2025-01-20T10:00:00Z",
    "duration_minutes": 60,
    "meeting_url": "https://zoom.us/j/123456789"
  },
  "email_sent": true,
  "timestamp": ISODate("2025-01-15T11:00:00Z")
}

// Data Snapshot Event
{
  "id": "h0d4e6f7-8g9h-0i1j-2k3l-m4n5o6p7q8r9",
  "candidate_id": "c123-4567-89ab-cdef",
  "event_type": "data_snapshot",
  "recruiter_id": "r456-7890-abcd-ef12",
  "recruiter_email": "dpo@company.com",
  "metadata": {
    "snapshot_size": 15420
  },
  "timestamp": ISODate("2025-01-15T09:00:00Z")
}
```

---

### 2. appointment_letters
**Purpose**: Track generated appointment letters

```javascript
{
  _id: ObjectId,
  id: String (UUID),
  candidate_id: String (UUID),
  designation: String,
  joining_date: ISODate,
  ctc_annual: Number,
  ctc_breakup: {
    basic_salary: Number,
    hra: Number,
    special_allowance: Number,
    performance_bonus: Number,
    // ... additional components
  },
  reporting_manager: String,
  work_location: String,
  pdf_url: String, // S3 URL or base64
  email_sent: Boolean,
  sent_at: ISODate (Optional),
  created_at: ISODate
}
```

**Indexes**:
- `candidate_id` (unique)
- `created_at` (descending)

---

### 3. interview_schedules
**Purpose**: Track all scheduled interviews

```javascript
{
  _id: ObjectId,
  id: String (UUID),
  candidate_id: String (UUID),
  job_id: String (UUID),
  interviewer_user_id: String (UUID),
  interviewer_name: String,
  interviewer_email: String,
  interview_type: String, // "Screening", "Technical Round", etc.
  start_time: ISODate,
  end_time: ISODate,
  duration_minutes: Number,
  meeting_url: String (Optional),
  status: String, // "scheduled", "completed", "cancelled"
  include_resume: Boolean,
  include_scorecard_link: Boolean,
  created_by: String (UUID),
  created_at: ISODate,
  updated_at: ISODate
}
```

**Indexes**:
- `candidate_id` (ascending)
- `interviewer_user_id` (ascending)
- `start_time` (ascending)
- Compound: `(candidate_id, start_time)`

---

### 4. withdrawal_requests
**Purpose**: Track candidate-initiated withdrawals

```javascript
{
  _id: ObjectId,
  id: String (UUID),
  candidate_id: String (UUID),
  reason: String, // "Better Offer", "Process Speed", etc.
  purge_immediately: Boolean,
  status: String, // "pending", "completed"
  created_at: ISODate,
  processed_at: ISODate (Optional)
}
```

**Indexes**:
- `candidate_id` (ascending)
- `status` (ascending)
- `created_at` (descending)

---

### 5. anonymized_candidates
**Purpose**: Retain statistical data after PII purge (DPDP compliance)

```javascript
{
  _id: ObjectId,
  id: String (UUID), // Original candidate ID
  job_id: String (UUID),
  stage: String, // "rejected_purged"
  experience_years: Number (Optional),
  skills_count: Number,
  purged_at: ISODate,
  purged_by: String (UUID), // Recruiter ID
  original_stage: String
}
```

**Indexes**:
- `job_id` (ascending)
- `purged_at` (descending)

**Purpose**: Used for aggregate reporting and analytics while maintaining DPDP compliance

---

### 6. audit_logs (Enhanced)
**Purpose**: Comprehensive audit trail for all system actions

```javascript
{
  _id: ObjectId,
  id: String (UUID),
  event_type: String, // "data_purge", "data_access", "email_sent", etc.
  candidate_id: String (UUID) (Optional),
  recruiter_id: String (UUID),
  timestamp: ISODate,
  details: Object, // Event-specific details
  ip_address: String (Optional),
  user_agent: String (Optional)
}
```

**Example Data Purge Audit Log**:
```javascript
{
  "id": "audit_123",
  "event_type": "data_purge",
  "candidate_id": "c123-4567",
  "recruiter_id": "r456-7890",
  "timestamp": ISODate("2025-01-15T10:35:00Z"),
  "details": {
    "candidate_name_hash": 123456789,
    "pii_fields_deleted": ["name", "email", "phone", "resume_url"],
    "related_records_deleted": {
      "candidates": 1,
      "scorecards": "all",
      "interviews": "all"
    }
  }
}
```

---

## Data Relationships

```
candidates (1) -----> (N) lifecycle_events
candidates (1) -----> (1) appointment_letters
candidates (1) -----> (N) interview_schedules
candidates (1) -----> (N) withdrawal_requests
candidates (1) -----> (1) anonymized_candidates (after purge)

users (interviewers) (1) -----> (N) interview_schedules
jobs (1) -----> (N) interview_schedules
```

---

## DPDP Act 2023 Compliance Features

### 1. Right to Access
- **Implementation**: `lifecycle_events` collection with `event_type: "data_snapshot"`
- **API**: `GET /api/lifecycle/candidate-snapshot/{candidate_id}`
- **Output**: Complete JSON export of all candidate data

### 2. Right to Erasure
- **Implementation**: Data purge service that:
  - Deletes from `candidates`, `scorecards`, `interview_schedules`
  - Creates record in `anonymized_candidates`
  - Logs in `audit_logs` with `event_type: "data_purge"`
- **API**: `POST /api/lifecycle/send-rejection` (with `purge_data: true`)
- **Irreversible**: Yes, as per DPDP requirements

### 3. Consent Logging
- **Implementation**: `consent_log` embedded in candidate document
- **Fields**: timestamp, ip_address, method, consent_given

### 4. Audit Trail
- **Implementation**: All lifecycle events logged
- **Retention**: Permanent (required for compliance)
- **Access**: Admin and DPO roles only

---

## Indexes for Performance

```javascript
// lifecycle_events
db.lifecycle_events.createIndex({ "candidate_id": 1, "timestamp": -1 })
db.lifecycle_events.createIndex({ "event_type": 1 })
db.lifecycle_events.createIndex({ "data_purged": 1 })

// interview_schedules
db.interview_schedules.createIndex({ "candidate_id": 1, "start_time": 1 })
db.interview_schedules.createIndex({ "interviewer_user_id": 1, "start_time": 1 })
db.interview_schedules.createIndex({ "status": 1 })

// appointment_letters
db.appointment_letters.createIndex({ "candidate_id": 1 }, { unique: true })
db.appointment_letters.createIndex({ "created_at": -1 })

// withdrawal_requests
db.withdrawal_requests.createIndex({ "candidate_id": 1 })
db.withdrawal_requests.createIndex({ "status": 1, "created_at": -1 })

// anonymized_candidates
db.anonymized_candidates.createIndex({ "job_id": 1 })
db.anonymized_candidates.createIndex({ "purged_at": -1 })
```

---

## Backup & Retention Policy

### Active Data
- **Candidates**: Until rejection or onboarding complete
- **Lifecycle Events**: Permanent (compliance requirement)
- **Appointment Letters**: 7 years (statutory requirement)
- **Interview Schedules**: Until interview completed + 6 months
- **Audit Logs**: Permanent (compliance requirement)

### Purged Data
- **Anonymized Records**: 3 years (for statistical analysis)
- **PII**: Immediately deleted, non-recoverable

### Backup Schedule
- **Daily**: Incremental backups
- **Weekly**: Full backups
- **Monthly**: Archive to cold storage

---

## Query Examples

### Get All Lifecycle Events for Candidate
```javascript
db.lifecycle_events.find({ 
  candidate_id: "c123-4567" 
}).sort({ timestamp: -1 })
```

### Get All Data Purge Events
```javascript
db.lifecycle_events.find({ 
  event_type: "rejection",
  data_purged: true 
}).sort({ timestamp: -1 })
```

### Get Upcoming Interviews for Interviewer
```javascript
db.interview_schedules.find({
  interviewer_user_id: "r456-7890",
  start_time: { $gte: new Date() },
  status: "scheduled"
}).sort({ start_time: 1 })
```

### Aggregate: Rejection Reasons
```javascript
db.lifecycle_events.aggregate([
  { $match: { event_type: "rejection" } },
  { $group: {
      _id: "$metadata.reason",
      count: { $sum: 1 }
  }},
  { $sort: { count: -1 } }
])
```

### Compliance Report: Data Purges This Month
```javascript
db.audit_logs.find({
  event_type: "data_purge",
  timestamp: {
    $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  }
}).count()
```
