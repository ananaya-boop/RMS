# TAT (Turn Around Time) Analytics System - Schema & Architecture

## Database Schema

### 1. pipeline_logs Collection (MongoDB)

```javascript
{
  "id": "uuid",
  "candidate_id": "uuid",
  "candidate_name": "Priya Sharma",
  "job_id": "uuid",
  "job_title": "Senior Full Stack Developer",
  
  // Stage transition details
  "from_stage": "hr_round",
  "to_stage": "offer",
  "transition_timestamp": "2025-01-20T14:30:00Z",
  
  // TAT calculations (in hours)
  "time_in_previous_stage_hours": 48,
  "time_in_previous_stage_days": 2,
  
  // Metadata
  "performed_by": "recruiter@rms.com",
  "performed_by_name": "Sarah Recruiter",
  "notes": "Candidate passed HR round with flying colors",
  
  // Stage entry/exit tracking
  "stage_entry_timestamp": "2025-01-18T14:30:00Z",
  "stage_exit_timestamp": "2025-01-20T14:30:00Z",
  
  "created_at": "2025-01-20T14:30:00Z"
}
```

### 2. candidate_tat_summary Collection (Computed/Cached)

```javascript
{
  "id": "uuid",
  "candidate_id": "uuid",
  "candidate_name": "Priya Sharma",
  "job_id": "uuid",
  "job_title": "Senior Full Stack Developer",
  
  // Bifurcated TAT by stage (in hours)
  "stage_tats": {
    "sourced": 24,           // Time spent in sourced
    "screening": 12,          // Time in screening
    "round_1_technical": 72,  // Time in Round 1
    "round_2_recommended": 48, // Time in Round 2
    "round_3_final": 36,      // Time in Round 3
    "hr_round": 48,           // Time in HR Round
    "offer": 120,             // Time in Offer (waiting for acceptance)
    "onboarding": 168         // Time in Onboarding (7 days)
  },
  
  // Aggregated TAT metrics (in hours and days)
  "screening_tat_hours": 24,
  "screening_tat_days": 1,
  
  "technical_tat_hours": 156,  // Sum of Round 1 + Round 2 + Round 3
  "technical_tat_days": 6.5,
  
  "hr_tat_hours": 48,
  "hr_tat_days": 2,
  
  "offer_tat_hours": 120,
  "offer_tat_days": 5,
  
  // Total TAT
  "total_tat_hours": 528,      // Sum of all stages
  "total_tat_days": 22,
  
  // Standard TAT thresholds (configurable per company)
  "exceeded_thresholds": ["hr_round", "offer"],
  
  // Current status
  "current_stage": "onboarding",
  "is_completed": true,
  "completion_date": "2025-02-05T10:00:00Z",
  
  "last_updated": "2025-02-05T10:00:00Z"
}
```

### 3. Standard TAT Thresholds (Configuration)

```javascript
{
  "company_id": "emergent",
  "standard_tats": {
    "sourced": {
      "hours": 48,
      "days": 2,
      "description": "Initial sourcing to screening"
    },
    "screening": {
      "hours": 24,
      "days": 1,
      "description": "Resume screening"
    },
    "round_1_technical": {
      "hours": 72,
      "days": 3,
      "description": "First technical round"
    },
    "round_2_recommended": {
      "hours": 72,
      "days": 3,
      "description": "Second technical round"
    },
    "round_3_final": {
      "hours": 48,
      "days": 2,
      "description": "Final technical round"
    },
    "hr_round": {
      "hours": 48,
      "days": 2,
      "description": "HR discussion and negotiation"
    },
    "offer": {
      "hours": 72,
      "days": 3,
      "description": "Offer acceptance waiting period"
    },
    "onboarding": {
      "hours": 168,
      "days": 7,
      "description": "Onboarding preparation"
    }
  },
  
  // Total TAT targets
  "target_total_tat_days": 21,  // 3 weeks
  "target_technical_tat_days": 8, // 8 days for all tech rounds
  
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

## MongoDB Aggregation Queries

### 1. Calculate Individual Candidate TAT

```javascript
// Get TAT for a specific candidate
db.pipeline_logs.aggregate([
  {
    $match: {
      candidate_id: "candidate-uuid"
    }
  },
  {
    $sort: { transition_timestamp: 1 }
  },
  {
    $group: {
      _id: "$from_stage",
      stage: { $first: "$from_stage" },
      entry_time: { $first: "$stage_entry_timestamp" },
      exit_time: { $last: "$stage_exit_timestamp" },
      time_in_stage_hours: { $sum: "$time_in_previous_stage_hours" }
    }
  },
  {
    $project: {
      _id: 0,
      stage: 1,
      time_in_stage_hours: 1,
      time_in_stage_days: { $divide: ["$time_in_stage_hours", 24] }
    }
  }
])
```

### 2. Calculate Average TAT by Job Role

```javascript
// Get average TAT for a specific job
db.candidate_tat_summary.aggregate([
  {
    $match: {
      job_id: "job-uuid",
      is_completed: true
    }
  },
  {
    $group: {
      _id: "$job_id",
      job_title: { $first: "$job_title" },
      avg_screening_tat_days: { $avg: "$screening_tat_days" },
      avg_technical_tat_days: { $avg: "$technical_tat_days" },
      avg_hr_tat_days: { $avg: "$hr_tat_days" },
      avg_offer_tat_days: { $avg: "$offer_tat_days" },
      avg_total_tat_days: { $avg: "$total_tat_days" },
      total_candidates: { $sum: 1 }
    }
  },
  {
    $project: {
      _id: 0,
      job_title: 1,
      avg_screening_tat_days: { $round: ["$avg_screening_tat_days", 1] },
      avg_technical_tat_days: { $round: ["$avg_technical_tat_days", 1] },
      avg_hr_tat_days: { $round: ["$avg_hr_tat_days", 1] },
      avg_offer_tat_days: { $round: ["$avg_offer_tat_days", 1] },
      avg_total_tat_days: { $round: ["$avg_total_tat_days", 1] },
      total_candidates: 1
    }
  }
])
```

### 3. Identify Candidates Exceeding TAT Thresholds

```javascript
// Find candidates stuck in stages beyond threshold
db.candidates.aggregate([
  {
    $lookup: {
      from: "pipeline_logs",
      localField: "id",
      foreignField: "candidate_id",
      as: "stage_logs"
    }
  },
  {
    $addFields: {
      last_transition: { $arrayElemAt: [{ $sortArray: { input: "$stage_logs", sortBy: { transition_timestamp: -1 } } }, 0] },
      hours_in_current_stage: {
        $divide: [
          { $subtract: [new Date(), "$last_transition.stage_entry_timestamp"] },
          3600000  // Convert ms to hours
        ]
      }
    }
  },
  {
    $match: {
      $or: [
        { current_stage: "hr_round", hours_in_current_stage: { $gt: 48 } },
        { current_stage: "offer", hours_in_current_stage: { $gt: 72 } },
        { current_stage: "screening", hours_in_current_stage: { $gt: 24 } }
      ]
    }
  },
  {
    $project: {
      name: 1,
      email: 1,
      job_title: 1,
      current_stage: 1,
      hours_in_current_stage: { $round: ["$hours_in_current_stage", 1] },
      exceeded_by_hours: {
        $subtract: [
          "$hours_in_current_stage",
          { $literal: 48 }  // Standard threshold
        ]
      }
    }
  }
])
```

## API Endpoints

### 1. TAT Analytics Endpoints

```javascript
// Get TAT summary for a candidate
GET /api/analytics/tat/candidate/{candidate_id}

// Get average TAT for a job
GET /api/analytics/tat/job/{job_id}

// Get average TAT across all jobs
GET /api/analytics/tat/overview

// Get candidates exceeding TAT thresholds
GET /api/analytics/tat/exceeded?threshold_type=hr_round

// Get TAT comparison between multiple jobs
GET /api/analytics/tat/compare?job_ids=job1,job2,job3

// Export TAT data for Emergent Employee Master
GET /api/analytics/tat/export?format=csv&job_id=xxx
```

### 2. Pipeline Event Logging Endpoint

```javascript
// Create pipeline log entry (auto-triggered on stage change)
POST /api/pipeline-logs
{
  "candidate_id": "uuid",
  "from_stage": "hr_round",
  "to_stage": "offer",
  "notes": "Candidate cleared HR round"
}

// Get pipeline history for candidate
GET /api/pipeline-logs/candidate/{candidate_id}
```

## React Components

### 1. CandidateTATSummary Component

```jsx
// Displays TAT breakdown for a candidate
<CandidateTATSummary
  candidate={candidate}
  tatData={tatData}
  thresholds={standardThresholds}
  showExceeded={true}
/>
```

**Features:**
- Horizontal progress bar showing time in each stage
- Red markers for exceeded thresholds
- Tooltip with exact hours/days
- Comparison with standard TAT

### 2. TATDashboardCard Component

```jsx
// Dashboard card showing average TAT metrics
<TATDashboardCard
  jobId={selectedJobId}
  averageTAT={averageTATData}
  candidatesExceeded={[...]}
/>
```

**Features:**
- Average Total TAT metric (prominent display)
- Bifurcated TAT by stage
- Trend indicators (↑ slower, ↓ faster)
- Link to detailed TAT report

### 3. TATProgressBar Component

```jsx
// Visual progress bar for TAT
<TATProgressBar
  stages={[
    { name: 'Screening', hours: 24, threshold: 48, exceeded: false },
    { name: 'Technical', hours: 156, threshold: 168, exceeded: false },
    { name: 'HR Round', hours: 72, threshold: 48, exceeded: true },
    { name: 'Offer', hours: 120, threshold: 72, exceeded: true }
  ]}
/>
```

**Visual:**
```
Screening  ████░░░░ 24h / 48h (✓)
Technical  ████████ 156h / 168h (✓)
HR Round   ██████████████ 72h / 48h (!) RED
Offer      ██████████████████ 120h / 72h (!) RED
```

### 4. TATComparisonChart Component

```jsx
// Compare TAT across multiple jobs
<TATComparisonChart
  jobs={[
    { title: 'Senior Developer', avgTAT: 22 },
    { title: 'Data Scientist', avgTAT: 18 },
    { title: 'DevOps Engineer', avgTAT: 15 }
  ]}
/>
```

**Chart Type:** Bar chart or line chart showing TAT comparison

## TAT Calculation Logic

### Formula Implementation

```javascript
// Calculate time in stage (hours)
function calculateTimeInStage(entryTimestamp, exitTimestamp) {
  const entry = new Date(entryTimestamp);
  const exit = new Date(exitTimestamp);
  const diffMs = exit - entry;
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffHours / 24;
  
  return {
    hours: Math.round(diffHours * 10) / 10,  // Round to 1 decimal
    days: Math.round(diffDays * 10) / 10
  };
}

// Calculate total TAT
function calculateTotalTAT(stageTATs) {
  const totalHours = Object.values(stageTATs).reduce((sum, hours) => sum + hours, 0);
  return {
    hours: totalHours,
    days: Math.round((totalHours / 24) * 10) / 10
  };
}

// Check if TAT exceeded threshold
function isTATExceeded(actualHours, thresholdHours) {
  return actualHours > thresholdHours;
}

// Calculate percentage of threshold used
function getTATPercentage(actualHours, thresholdHours) {
  return Math.round((actualHours / thresholdHours) * 100);
}
```

## Business Rules

### 1. TAT Tracking Rules

**When to start counting:**
- **Sourced stage**: From candidate creation timestamp
- **All other stages**: From stage entry timestamp (recorded in pipeline_logs)

**When to stop counting:**
- **Stage exit**: When candidate moves to next stage
- **If candidate remains**: Use current timestamp for calculation

**Exclusions:**
- **Declined stage**: Not counted in TAT calculations
- **Withdrawn candidates**: TAT calculation stops at withdrawal
- **Weekends**: Currently counted (future: option to exclude)

### 2. Standard TAT Thresholds (Emergent)

```javascript
{
  screening: 2 days (48 hours),
  technical_rounds: 8 days (192 hours total for all 3 rounds),
  hr_round: 2 days (48 hours),
  offer: 3 days (72 hours),
  total_target: 21 days (504 hours)
}
```

### 3. Color Coding

```javascript
// Green: Within threshold
if (actualTAT <= threshold) → Green ✓

// Yellow: 80-100% of threshold
if (actualTAT > threshold * 0.8 && actualTAT <= threshold) → Yellow ⚠

// Red: Exceeded threshold
if (actualTAT > threshold) → Red ⚠️
```

## Emergent Employee Master Export

### TAT Fields in CSV Export

```csv
Employee Name,Job Title,Total TAT (Days),Screening TAT,Technical TAT,HR TAT,Offer TAT,
Priya Sharma,Senior Full Stack Developer,22,1,6.5,2,5,
Ananya Reddy,Data Scientist,18,1,5,2,3,
Sneha Iyer,DevOps Engineer,15,1,4,1,2,
```

### Export Format

```javascript
{
  "candidate_name": "Priya Sharma",
  "job_title": "Senior Full Stack Developer",
  "total_tat_days": 22,
  "screening_tat_days": 1,
  "technical_tat_days": 6.5,
  "hr_tat_days": 2,
  "offer_tat_days": 5,
  "stages_exceeded": ["hr_round", "offer"],
  "hiring_efficiency_score": 85,  // Out of 100
  "application_date": "2025-01-10",
  "offer_date": "2025-01-25",
  "joining_date": "2025-02-01"
}
```

## Dashboard Integration

### Top-Level Metrics

```
┌──────────────────────────────────────────────┐
│ Average Total TAT: 19.5 days                │
│ Target: 21 days | Status: ✓ On Track        │
│                                              │
│ Fastest Hire: 12 days (DevOps Engineer)     │
│ Slowest Hire: 28 days (Senior Developer)    │
└──────────────────────────────────────────────┘
```

### Bifurcated View (By Job Role)

```
Role: Senior Full Stack Developer
┌──────────────────────────────────────────────┐
│ Stage             TAT      Threshold  Status │
├──────────────────────────────────────────────┤
│ Screening         1.5d     2d        ✓      │
│ Technical Rounds  6.5d     8d        ✓      │
│ HR Round          3d       2d        ⚠️ RED  │
│ Offer            5d       3d        ⚠️ RED  │
├──────────────────────────────────────────────┤
│ Total TAT        22d      21d       ⚠️      │
└──────────────────────────────────────────────┘
```

## Performance Considerations

### Indexing Strategy

```javascript
// Create indexes for fast TAT queries
db.pipeline_logs.createIndex({ "candidate_id": 1, "transition_timestamp": 1 });
db.pipeline_logs.createIndex({ "job_id": 1 });
db.candidate_tat_summary.createIndex({ "job_id": 1 });
db.candidate_tat_summary.createIndex({ "exceeded_thresholds": 1 });
```

### Caching Strategy

```javascript
// Cache average TAT per job (refresh every hour)
{
  "cache_key": "avg_tat_job_xxx",
  "data": { avgTotalTAT: 19.5 },
  "ttl": 3600  // 1 hour
}

// Compute candidate_tat_summary asynchronously
// Trigger: On stage change, queue background job to recalculate
```

## Alerting & Notifications

### TAT Threshold Alerts

```javascript
// Alert when candidate exceeds standard TAT
if (hoursInStage > threshold) {
  sendAlert({
    type: "TAT_EXCEEDED",
    candidate: "Priya Sharma",
    stage: "HR Round",
    exceeded_by: "24 hours",
    action_required: "Expedite HR round or escalate"
  });
}
```

### Email Notifications

```
Subject: TAT Alert - Candidate Stuck in HR Round

Hi Sarah,

Candidate Priya Sharma (Senior Full Stack Developer) has been 
in the HR Round for 72 hours, exceeding the standard TAT of 48 hours.

Current Status:
- Stage: HR Round
- Time in Stage: 72 hours (3 days)
- Threshold: 48 hours (2 days)
- Exceeded by: 24 hours

Action Required:
Please expedite the HR round or move the candidate to the next stage.

[View Candidate Profile] [View TAT Dashboard]
```

## Reports & Analytics

### TAT Analytics Dashboard

**Metrics to Display:**
1. Average Total TAT (company-wide)
2. Average TAT by Department
3. Average TAT by Job Role
4. Average TAT by Recruiter
5. Trend over time (monthly)
6. Bottleneck stages (stages with highest average TAT)
7. Candidates currently exceeding TAT
8. Fastest hires this month
9. Comparison: This month vs. Last month

### Export Reports

**1. TAT Summary Report (CSV):**
- All completed candidates with TAT breakdown
- Filterable by job, department, date range

**2. TAT Comparison Report (Excel):**
- Compare TAT across multiple jobs
- Charts and visualizations included

**3. Emergent Employee Master (CSV):**
- Enhanced with TAT data
- Ready for direct import into Emergent

---

**Implementation Priority:**
1. **Phase 1**: Pipeline logging + Basic TAT calculation
2. **Phase 2**: Dashboard integration + Visual components
3. **Phase 3**: Threshold alerts + Notifications
4. **Phase 4**: Advanced analytics + Reports
