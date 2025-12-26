# Offer Acceptance/Decline Workflow - Architecture

## Event-Driven Architecture

### Event Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    OFFER ACCEPTANCE FLOW                     │
└─────────────────────────────────────────────────────────────┘

Candidate in "Offer" Stage
        ↓
    [Accept Offer Button]
        ↓
┌───────────────────────────────┐
│ ON_OFFER_ACCEPTED Event       │
│ - Timestamp: now()            │
│ - Candidate ID                │
│ - Job ID                      │
│ - Acceptance method: portal   │
└───────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────┐
│ AUTOMATED ACTIONS (Parallel Execution)                    │
├───────────────────────────────────────────────────────────┤
│ 1. Update Candidate Status                                │
│    - stage: "offer" → "onboarding"                        │
│    - offer_status.acceptance_status: "accepted"           │
│    - offer_status.acceptance_date: now()                  │
│                                                            │
│ 2. Create Pipeline Log                                    │
│    - from_stage: "offer"                                  │
│    - to_stage: "onboarding"                               │
│    - Calculate final offer TAT                            │
│                                                            │
│ 3. Update TAT Summary                                     │
│    - is_completed: false (still in onboarding)            │
│    - offer_tat_finalized: true                            │
│                                                            │
│ 4. Update Job Requisition                                 │
│    - open_positions: open_positions - 1                   │
│    - filled_positions: filled_positions + 1               │
│    - status: "active" OR "closed" (if fully filled)       │
│                                                            │
│ 5. Send Notifications                                     │
│    - To Recruiter: "[Name] accepted offer!"               │
│    - To Admin: "Ready for Employee Master sync"           │
│    - To Candidate: "Welcome to Emergent! Next steps..."   │
│                                                            │
│ 6. Create Lifecycle Event                                 │
│    - event_type: "offer_accepted"                         │
│    - metadata: { acceptance_date, joining_date }          │
└───────────────────────────────────────────────────────────┘
        ↓
Candidate in "Onboarding" Stage
        ↓
    [Hired Button]
        ↓
┌───────────────────────────────┐
│ ON_CANDIDATE_HIRED Event      │
│ - Lock profile (read-only)    │
│ - Finalize Total TAT          │
│ - Mark as "Complete"          │
└───────────────────────────────┘
        ↓
Candidate Profile LOCKED
TAT Analytics FINALIZED


┌─────────────────────────────────────────────────────────────┐
│                   OFFER DECLINE FLOW                         │
└─────────────────────────────────────────────────────────────┘

Candidate in "Offer" Stage
        ↓
    [Decline Offer Button]
        ↓
┌───────────────────────────────┐
│ Decline Reason Capture Modal  │
│ - Better Offer Elsewhere      │
│ - Salary Mismatch            │
│ - Location Issues            │
│ - Personal Reasons           │
│ - Company Culture Concerns   │
│ - Other (text input)         │
└───────────────────────────────┘
        ↓
┌───────────────────────────────┐
│ ON_OFFER_DECLINED Event       │
│ - Timestamp: now()            │
│ - Candidate ID                │
│ - Job ID                      │
│ - Decline reason              │
└───────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────┐
│ AUTOMATED ACTIONS (Parallel Execution)                    │
├───────────────────────────────────────────────────────────┤
│ 1. Update Candidate Status                                │
│    - stage: "offer" → "declined"                          │
│    - offer_status.acceptance_status: "declined"           │
│    - offer_status.decline_date: now()                     │
│    - offer_status.decline_reason: captured_reason         │
│                                                            │
│ 2. Create Pipeline Log                                    │
│    - from_stage: "offer"                                  │
│    - to_stage: "declined"                                 │
│    - notes: "Declined: [reason]"                          │
│                                                            │
│ 3. Update TAT Summary                                     │
│    - Mark as incomplete (declined)                        │
│    - Store for rejection analytics                        │
│                                                            │
│ 4. RE-OPEN JOB REQUISITION (Self-Healing!)               │
│    - open_positions: open_positions + 1                   │
│    - filled_positions: filled_positions - 1               │
│    - status: "active" (reactivate if was closed)          │
│    - Add note: "Re-opened due to offer decline"           │
│                                                            │
│ 5. Send Notifications                                     │
│    - To Recruiter: "[Name] declined offer - [reason]"     │
│    - To Admin: "Job requisition re-opened"                │
│    - To Candidate: "Thank you for considering..."         │
│                                                            │
│ 6. DPDP Compliance Action                                 │
│    - Show modal: "Data Retention Options"                 │
│      Option A: Purge immediately                          │
│      Option B: Retain for 6 months (re-engagement)        │
│    - If purge → anonymize data                            │
│    - If retain → set purge_scheduled_date                 │
│                                                            │
│ 7. Rejection Analytics                                    │
│    - Update rejection_reasons collection                  │
│    - Increment decline_count for job                      │
│    - Calculate offer_acceptance_rate                      │
│                                                            │
│ 8. Create Lifecycle Event                                 │
│    - event_type: "offer_declined"                         │
│    - metadata: { decline_reason, decline_date }           │
└───────────────────────────────────────────────────────────┘
        ↓
Candidate in "Declined" Stage
        ↓
Moved to "Offer Declined" Sidebar
```

## Database Schema Updates

### 1. Jobs Collection (Updated)

```javascript
{
  "id": "uuid",
  "title": "Senior Full Stack Developer",
  "department": "Engineering",
  "location": "Bangalore",
  
  // Requisition tracking
  "total_positions": 3,          // Total headcount approved
  "open_positions": 2,            // Currently open (decrements on hire)
  "filled_positions": 1,          // Successfully filled
  "offered_positions": 2,         // Currently in offer stage
  "declined_positions": 1,        // Declined offers (for analytics)
  
  "status": "active",             // active, closed, on_hold
  "created_by": "admin_id",
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-20T10:00:00Z",
  
  // Analytics
  "offer_acceptance_rate": 0.75,  // 75% of offers accepted
  "average_tat_days": 18.5,
  "fastest_hire_days": 12,
  "slowest_hire_days": 28,
  
  // Compliance
  "hiring_complete_date": null,   // When all positions filled
  "requisition_notes": "Re-opened on 2025-01-20 due to offer decline"
}
```

### 2. Candidates Collection (Updated)

```javascript
{
  "id": "uuid",
  "name": "Priya Sharma",
  "email": "priya@email.com",
  
  // Stage tracking
  "stage": "onboarding",
  "current_stage": "onboarding",
  "previous_stage": "offer",
  
  // Offer status tracking
  "offer_status": {
    "offer_sent_date": "2025-01-15T10:00:00Z",
    "offer_acceptance_status": "accepted",  // pending, accepted, declined, negotiating
    "acceptance_date": "2025-01-18T14:30:00Z",
    "acceptance_method": "portal",          // portal, email, phone
    "decline_date": null,
    "decline_reason": null,
    "decline_reason_category": null,        // better_offer, salary, location, personal, culture
    "renegotiation_count": 0,
    "joining_date": "2025-02-01",
    "joining_confirmed": false,
    "last_offer_ctc": 2500000
  },
  
  // Hiring finalization
  "is_hired": false,                        // Set to true when "Hired" button clicked
  "hired_date": null,
  "hired_by": null,
  "profile_locked": false,                  // Locked after hiring
  
  // DPDP compliance for declined candidates
  "data_retention": {
    "purge_scheduled": false,
    "purge_date": null,
    "retention_reason": null,               // re_engagement, legal_requirement
    "retention_expires": null               // 6 months from decline
  }
}
```

### 3. Rejection Analytics Collection (NEW)

```javascript
{
  "id": "uuid",
  "job_id": "uuid",
  "job_title": "Senior Full Stack Developer",
  "candidate_id": "uuid",
  "candidate_name": "Vikram Singh",
  
  "decline_date": "2025-01-20T10:00:00Z",
  "decline_reason_category": "better_offer",
  "decline_reason_text": "Accepted offer from another company with 20% higher CTC",
  
  // TAT at time of decline
  "tat_at_decline_days": 21,
  "stages_completed": ["sourced", "screening", "technical", "hr_round", "offer"],
  
  // Offer details
  "ctc_offered": 2500000,
  "ctc_expected": 3000000,
  "ctc_gap_percentage": 20,
  
  "created_at": "2025-01-20T10:00:00Z"
}
```

### 4. Job Requisition History (NEW)

```javascript
{
  "id": "uuid",
  "job_id": "uuid",
  "event_type": "position_filled | position_reopened | requisition_closed",
  "timestamp": "2025-01-20T10:00:00Z",
  
  "previous_open_positions": 2,
  "new_open_positions": 3,
  
  "triggered_by": "offer_declined",         // offer_accepted, offer_declined, manual
  "candidate_id": "uuid",
  "candidate_name": "Vikram Singh",
  "notes": "Position re-opened due to candidate declining offer (better offer elsewhere)",
  
  "performed_by": "system",                 // system, admin_id, recruiter_id
  "created_at": "2025-01-20T10:00:00Z"
}
```

## MongoDB Update Queries

### 1. ON_OFFER_ACCEPTED - Update Job Requisition

```javascript
// Decrement open positions, increment filled positions
db.jobs.updateOne(
  { id: job_id },
  {
    $inc: {
      open_positions: -1,
      filled_positions: 1,
      offered_positions: -1
    },
    $set: {
      updated_at: new Date().toISOString(),
      status: open_positions - 1 === 0 ? "closed" : "active"
    },
    $push: {
      requisition_history: {
        event: "position_filled",
        candidate_id: candidate_id,
        candidate_name: candidate_name,
        timestamp: new Date().toISOString()
      }
    }
  }
)

// Update candidate to onboarding
db.candidates.updateOne(
  { id: candidate_id },
  {
    $set: {
      stage: "onboarding",
      current_stage: "onboarding",
      previous_stage: "offer",
      "offer_status.acceptance_status": "accepted",
      "offer_status.acceptance_date": new Date().toISOString(),
      "offer_status.acceptance_method": "portal",
      updated_at: new Date().toISOString()
    }
  }
)

// Update TAT summary
db.candidate_tat_summary.updateOne(
  { candidate_id: candidate_id },
  {
    $set: {
      current_stage: "onboarding",
      offer_tat_finalized: true,
      last_updated: new Date().toISOString()
    }
  }
)
```

### 2. ON_OFFER_DECLINED - Re-open Job Requisition (Self-Healing)

```javascript
// RE-OPEN position (increment open_positions)
db.jobs.updateOne(
  { id: job_id },
  {
    $inc: {
      open_positions: 1,              // Self-healing: re-open the position!
      filled_positions: -1,
      offered_positions: -1,
      declined_positions: 1            // Track declines for analytics
    },
    $set: {
      updated_at: new Date().toISOString(),
      status: "active",                // Reactivate if was closed
      requisition_notes: `Re-opened on ${new Date().toISOString()} due to offer decline by ${candidate_name}`
    },
    $push: {
      requisition_history: {
        event: "position_reopened",
        candidate_id: candidate_id,
        candidate_name: candidate_name,
        decline_reason: decline_reason,
        timestamp: new Date().toISOString()
      }
    }
  }
)

// Update candidate to declined
db.candidates.updateOne(
  { id: candidate_id },
  {
    $set: {
      stage: "declined",
      current_stage: "declined",
      previous_stage: "offer",
      "offer_status.acceptance_status": "declined",
      "offer_status.decline_date": new Date().toISOString(),
      "offer_status.decline_reason": decline_reason_text,
      "offer_status.decline_reason_category": decline_reason_category,
      updated_at: new Date().toISOString()
    }
  }
)

// Create rejection analytics entry
db.rejection_analytics.insertOne({
  id: uuid(),
  job_id: job_id,
  job_title: job_title,
  candidate_id: candidate_id,
  candidate_name: candidate_name,
  decline_date: new Date().toISOString(),
  decline_reason_category: decline_reason_category,
  decline_reason_text: decline_reason_text,
  tat_at_decline_days: tat_data.total_tat_days,
  ctc_offered: offer_data.ctc_annual,
  created_at: new Date().toISOString()
})

// Recalculate job acceptance rate
const total_offers = await db.candidates.countDocuments({
  job_id: job_id,
  stage: { $in: ["offer", "onboarding", "declined"] }
})

const accepted_offers = await db.candidates.countDocuments({
  job_id: job_id,
  "offer_status.acceptance_status": "accepted"
})

const acceptance_rate = accepted_offers / total_offers

db.jobs.updateOne(
  { id: job_id },
  { $set: { offer_acceptance_rate: acceptance_rate } }
)
```

### 3. ON_CANDIDATE_HIRED - Finalize and Lock

```javascript
// Mark candidate as hired and lock profile
db.candidates.updateOne(
  { id: candidate_id },
  {
    $set: {
      is_hired: true,
      hired_date: new Date().toISOString(),
      hired_by: current_user_id,
      profile_locked: true,
      updated_at: new Date().toISOString()
    }
  }
)

// Finalize TAT summary
db.candidate_tat_summary.updateOne(
  { candidate_id: candidate_id },
  {
    $set: {
      is_completed: true,
      completion_date: new Date().toISOString(),
      current_stage: "hired",
      last_updated: new Date().toISOString()
    }
  }
)

// Create lifecycle event
db.lifecycle_events.insertOne({
  id: uuid(),
  candidate_id: candidate_id,
  event_type: "candidate_hired",
  timestamp: new Date().toISOString(),
  performed_by: current_user_id,
  metadata: {
    hired_date: new Date().toISOString(),
    final_tat_days: tat_summary.total_tat_days,
    job_title: candidate.job_title
  }
})
```

## API Endpoints

### 1. Offer Acceptance

```javascript
POST /api/offers/accept/{candidate_id}
Body: {
  "acceptance_method": "portal",  // portal, email, phone
  "joining_date": "2025-02-01",
  "notes": "Excited to join the team!"
}

Response: {
  "success": true,
  "message": "Offer accepted successfully!",
  "candidate": {
    "id": "uuid",
    "name": "Priya Sharma",
    "stage": "onboarding",
    "joining_date": "2025-02-01"
  },
  "job_updated": {
    "open_positions": 1,
    "filled_positions": 2
  },
  "notifications_sent": ["recruiter@rms.com", "admin@rms.com"]
}
```

### 2. Offer Decline

```javascript
POST /api/offers/decline/{candidate_id}
Body: {
  "decline_reason_category": "better_offer",
  "decline_reason_text": "Accepted higher CTC offer from another company",
  "data_retention_option": "purge_immediately" // or "retain_6_months"
}

Response: {
  "success": true,
  "message": "Offer declined. Job requisition re-opened.",
  "candidate": {
    "id": "uuid",
    "name": "Vikram Singh",
    "stage": "declined",
    "data_purge_scheduled": true
  },
  "job_updated": {
    "open_positions": 3,  // Re-opened!
    "status": "active"
  },
  "rejection_analytics_id": "uuid"
}
```

### 3. Mark as Hired

```javascript
POST /api/candidates/{candidate_id}/mark-hired
Body: {
  "hired_date": "2025-02-01",
  "notes": "Candidate joined successfully"
}

Response: {
  "success": true,
  "message": "Candidate marked as hired. Profile locked.",
  "candidate": {
    "id": "uuid",
    "name": "Priya Sharma",
    "is_hired": true,
    "profile_locked": true
  },
  "tat_finalized": {
    "total_tat_days": 18,
    "is_completed": true
  }
}
```

### 4. Get Job Requisition Status

```javascript
GET /api/jobs/{job_id}/requisition-status

Response: {
  "job_id": "uuid",
  "title": "Senior Full Stack Developer",
  "total_positions": 3,
  "open_positions": 1,
  "filled_positions": 2,
  "offered_positions": 1,
  "declined_positions": 1,
  "status": "active",
  "offer_acceptance_rate": 0.67,
  "requisition_history": [
    {
      "event": "position_filled",
      "candidate_name": "Sneha Iyer",
      "timestamp": "2025-01-10T10:00:00Z"
    },
    {
      "event": "position_reopened",
      "candidate_name": "Vikram Singh",
      "decline_reason": "better_offer",
      "timestamp": "2025-01-20T10:00:00Z"
    }
  ]
}
```

## Notification System

### Email Templates

**1. Offer Accepted - To Recruiter:**
```
Subject: 🎉 [Priya Sharma] Accepted Your Offer!

Hi Sarah,

Great news! Priya Sharma has accepted the offer for Senior Full Stack Developer position.

Joining Date: February 1, 2025
CTC: ₹25,00,000

Next Steps:
✓ Candidate moved to Onboarding stage
✓ Job requisition updated (1 position remaining)
✓ Data ready for Emergent Employee Master sync

[View Candidate Profile] [Start Onboarding Workflow]
```

**2. Offer Declined - To Recruiter:**
```
Subject: ⚠️ [Vikram Singh] Declined Offer - Position Re-opened

Hi Sarah,

Vikram Singh has declined the offer for Senior Full Stack Developer.

Decline Reason: Accepted better offer elsewhere
TAT at Decline: 21 days

Automated Actions Completed:
✓ Position automatically re-opened (now 3 open positions)
✓ Job requisition status: Active
✓ Rejection analytics updated

Action Required:
Review pipeline and source new candidates for this role.

[View Job Requisition] [Source Candidates]
```

## React Components

### 1. OfferActionButtons Component

```jsx
<OfferActionButtons
  candidate={candidate}
  onAccept={handleAcceptOffer}
  onDecline={handleDeclineOffer}
  onRenegotiate={handleRenegotiate}
/>
```

### 2. DeclineReasonModal Component

```jsx
<DeclineReasonModal
  isOpen={showDeclineModal}
  onClose={() => setShowDeclineModal(false)}
  onSubmit={(reason, dataRetention) => {
    handleOfferDecline(reason, dataRetention)
  }}
  reasons={[
    'better_offer',
    'salary_mismatch',
    'location_issues',
    'personal_reasons',
    'company_culture',
    'other'
  ]}
/>
```

### 3. HiredButton Component

```jsx
// In Onboarding section of Kanban
<HiredButton
  candidate={candidate}
  onMarkHired={(hiredDate) => {
    finalizeHiring(candidate.id, hiredDate)
  }}
  disabled={!candidate.joining_confirmed}
/>
```

### 4. JobRequisitionSync Component

```jsx
// Real-time job requisition status
<JobRequisitionSync
  job={selectedJob}
  showAlert={openPositions > 0}
  alertMessage={`${openPositions} positions still open`}
/>
```

## Business Rules

### 1. Job Status Auto-Update

```javascript
if (job.open_positions === 0 && job.filled_positions === job.total_positions) {
  job.status = "closed"
  job.hiring_complete_date = new Date()
}

if (job.open_positions > 0) {
  job.status = "active"  // Even if previously closed
}
```

### 2. Offer Acceptance Rate Calculation

```javascript
offer_acceptance_rate = 
  accepted_offers / (accepted_offers + declined_offers)

// Example: 2 accepted, 1 declined = 2/3 = 0.67 = 67%
```

### 3. Data Retention Rules (DPDP Compliance)

```javascript
if (decline_option === "purge_immediately") {
  // Anonymize sensitive data
  candidate.name = "REDACTED-" + candidate.id.slice(0, 8)
  candidate.email = "redacted@purged.data"
  candidate.phone = "REDACTED"
  candidate.statutory_data = null
  candidate.bank_details = null
  candidate.data_retention.purge_scheduled = true
}

if (decline_option === "retain_6_months") {
  // Schedule purge for 6 months later
  candidate.data_retention.retention_expires = 
    new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000)
  candidate.data_retention.retention_reason = "re_engagement"
}
```

## Testing Scenarios

### Test Case 1: Happy Path (Offer → Onboarding → Hired)
1. Candidate "Priya Sharma" in Offer stage
2. Click "Accept Offer" → moves to Onboarding
3. Job open_positions: 2 → 1 (decremented)
4. Click "Hired" button → profile locked
5. TAT finalized: 18 days (completed: true)

### Test Case 2: Offer Decline with Self-Healing
1. Candidate "Vikram Singh" in Offer stage
2. Click "Decline Offer" → capture reason
3. Job open_positions: 1 → 2 (incremented!)
4. Job status: "active" (re-opened)
5. Candidate moves to "Declined" sidebar
6. Rejection analytics created

### Test Case 3: Multiple Declines
1. Job has 3 total positions
2. 2 candidates accept offers
3. 1 candidate declines
4. Result: open_positions = 1, filled = 2
5. Job still active (not all filled)

---

**Implementation Priority:**
1. Backend API endpoints (accept, decline, mark_hired)
2. Job requisition sync logic
3. Frontend buttons and modals
4. Notification system
5. Rejection analytics dashboard
