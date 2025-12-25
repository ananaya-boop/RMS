# Dual-Pane Modal Engine & Lifecycle Workflows - Implementation Summary

## ✅ Completed Features

### 1. **Reusable Dual-Pane Modal Component**
**File**: `/app/frontend/src/components/DualPaneModal.js`

A flexible, reusable component that provides:
- **Left Pane**: Editable form fields
- **Right Pane**: Live preview (Email/PDF)
- **Real-time updates**: Preview refreshes as form data changes
- **Responsive design**: Professional UI with Tailwind CSS
- **Loading states**: Spinners and disabled states during submission

**Props**:
- `isOpen`, `onClose`, `title`
- `leftPane`, `rightPane` (React components)
- `onSubmit`, `submitButtonText`
- `formData`, `onFormChange`, `previewData`

---

### 2. **Rejection Workflow with DPDP Data Purge**
**Files**:
- Backend: `/app/backend/lifecycle_engine.py` (RejectionEmailTemplate, DataPurgeService)
- Frontend: `/app/frontend/src/components/RejectionWorkflow.js`
- API: `POST /api/lifecycle/send-rejection`

**Features**:
- ✅ Dropdown selection for rejection reasons
- ✅ Optional custom message field
- ✅ Live email preview with DPDP notice
- ✅ Checkbox for email sending
- ✅ Checkbox for immediate data purge
- ✅ **Automatic PII deletion**: name, email, phone, resume, documents
- ✅ **Anonymized records** retained for statistics
- ✅ **Audit logging** for compliance
- ✅ Email template includes DPDP Act 2023 data purge notice

**Data Purged**:
- Candidate personal information
- Resume files (from S3)
- Interview scorecards
- Interview schedules
- All PII fields

**Compliance**:
- ✅ DPDP Act 2023 compliant
- ✅ Audit trail maintained
- ✅ Non-recoverable deletion
- ✅ Retention of anonymized statistical data

---

### 3. **Onboarding Workflow with Appointment Letter**
**Files**:
- Backend: `/app/backend/lifecycle_engine.py` (AppointmentLetterPDF, OnboardingEmailTemplate)
- Frontend: `/app/frontend/src/components/OnboardingWorkflow.js`
- API: `POST /api/lifecycle/send-onboarding`

**Features**:
- ✅ **Editable CTC Breakup** (Annexure A)
  - Add/remove salary components dynamically
  - Real-time total calculation
  - Components: Basic, HRA, Allowances, Bonus, etc.
- ✅ Joining date picker
- ✅ Reporting manager field
- ✅ Work location and department
- ✅ Probation period (months)
- ✅ Notice period (days)
- ✅ **PDF Generation** with ReportLab
  - Professional A4 format
  - Company logo placeholder
  - Detailed CTC breakup table
  - Statutory compliance clauses (PF, TDS, POSH)
  - Terms & conditions
  - Signature sections
- ✅ **PDF Preview** in right pane
- ✅ **Email with PDF attachment**
- ✅ **S3 Upload** (or base64 fallback if S3 not configured)

**PDF Includes**:
- Header with logo placeholder
- Candidate details
- Position details
- CTC breakup table
- Statutory compliance (PF/UAN, POSH, TDS)
- Terms & conditions
- Document checklist
- Acceptance signature section

---

### 4. **Interview Scheduling Sidebar**
**Files**:
- Backend: `/app/backend/lifecycle_engine.py` (ICSGenerator, InterviewEmailTemplate)
- Frontend: `/app/frontend/src/components/InterviewSchedulingSidebar.js`
- API: `POST /api/lifecycle/schedule-interview`

**Features**:
- ✅ **Sticky sidebar** interface
- ✅ Interview type selection (Screening, Technical, HR, Managerial, Final)
- ✅ Date & time picker (IST)
- ✅ Duration selector (in minutes)
- ✅ **Searchable interviewer list**
  - Filter by name or email
  - Shows role badges
  - Radio selection
- ✅ Meeting link input (Zoom/Teams)
- ✅ **Email notifications**
  - Sent to candidate
  - Sent to interviewer
- ✅ **.ics Calendar file generation**
  - Standard ICS format
  - Works with Google Calendar, Outlook, Apple Calendar
  - Includes 15-minute reminder
  - Attached to emails
  - Available for download
- ✅ Auto-populated from user database

**ICS File Features**:
- VCALENDAR 2.0 format
- Organizer and attendees
- Meeting URL as location
- 15-minute reminder alarm
- RSVP tracking

---

### 5. **Candidate Privacy Hub**
**Files**:
- Backend: `/app/backend/lifecycle_engine.py` (DataPurgeService)
- Frontend: `/app/frontend/src/components/PrivacyHubPanel.js`
- APIs: 
  - `GET /api/lifecycle/candidate-snapshot/{id}`
  - `POST /api/lifecycle/candidate-withdrawal`

**Features**:

#### A. Data Snapshot (Right to Access)
- ✅ **Generate complete data export**
- ✅ JSON format download
- ✅ Includes:
  - Personal information
  - Resume and documents
  - Interview feedback
  - Scorecards
  - Stage history
  - All lifecycle events
- ✅ Audit logged
- ✅ DPDP Act 2023 compliant

#### B. Candidate Withdrawal
- ✅ **Dropdown for withdrawal reasons**:
  - Better Offer Received
  - Process Taking Too Long
  - Role Mismatch
  - Personal Reasons
  - Salary Expectations Not Met
  - Location Issues
  - Other
- ✅ **Optional immediate data purge**
- ✅ Status tracking (pending/completed)
- ✅ Audit logged

---

### 6. **Backend API Endpoints**

#### Rejection APIs
```
POST /api/lifecycle/rejection-preview
- Generates email preview
- Shows DPDP data purge notice
- Returns: HTML content, subject, recipient

POST /api/lifecycle/send-rejection
- Sends rejection email
- Purges candidate data (if requested)
- Creates audit log
- Returns: success status, email_sent, data_purged
```

#### Onboarding APIs
```
POST /api/lifecycle/onboarding-preview
- Generates PDF preview
- Generates email preview
- Returns: PDF base64, HTML content

POST /api/lifecycle/send-onboarding
- Generates appointment letter PDF
- Uploads to S3 (or base64 fallback)
- Sends email with PDF attachment
- Updates candidate stage to "onboarding"
- Creates lifecycle event log
- Returns: success, pdf_url, email_sent
```

#### Interview APIs
```
POST /api/lifecycle/schedule-interview
- Creates interview schedule
- Generates .ics calendar file
- Sends email to candidate and interviewer
- Attaches .ics file to emails
- Creates lifecycle event log
- Returns: success, interview_id, ics_file, email_sent
```

#### Privacy APIs
```
GET /api/lifecycle/candidate-snapshot/{id}
- Exports all candidate data as JSON
- Creates audit log
- Returns: complete data snapshot

POST /api/lifecycle/candidate-withdrawal
- Records withdrawal request
- Optional immediate data purge
- Creates lifecycle event log
- Returns: success, withdrawal_id, data_purged
```

#### Lifecycle Tracking
```
GET /api/lifecycle/events/{candidate_id}
- Returns all lifecycle events for candidate
- Sorted by timestamp (newest first)
```

---

### 7. **Database Schema**

#### New Collections:

**lifecycle_events**
```javascript
{
  id: UUID,
  candidate_id: UUID,
  event_type: "rejection" | "onboarding" | "interview_scheduled" | "data_snapshot" | "withdrawal",
  event_subtype: String (optional),
  recruiter_id: UUID,
  recruiter_email: String,
  metadata: Object,
  email_sent: Boolean,
  email_id: String,
  pdf_generated: Boolean,
  pdf_url: String,
  data_purged: Boolean,
  timestamp: ISODate
}
```

**appointment_letters**
```javascript
{
  id: UUID,
  candidate_id: UUID,
  designation: String,
  joining_date: ISODate,
  ctc_annual: Number,
  ctc_breakup: Object,
  reporting_manager: String,
  work_location: String,
  pdf_url: String,
  email_sent: Boolean,
  sent_at: ISODate,
  created_at: ISODate
}
```

**interview_schedules** (Enhanced)
```javascript
{
  id: UUID,
  candidate_id: UUID,
  job_id: UUID,
  interviewer_user_id: UUID,
  interviewer_name: String,
  interviewer_email: String,
  interview_type: String,
  start_time: ISODate,
  end_time: ISODate,
  duration_minutes: Number,
  meeting_url: String,
  status: "scheduled" | "completed" | "cancelled",
  created_by: UUID,
  created_at: ISODate,
  updated_at: ISODate
}
```

**withdrawal_requests**
```javascript
{
  id: UUID,
  candidate_id: UUID,
  reason: String,
  purge_immediately: Boolean,
  status: "pending" | "completed",
  created_at: ISODate,
  processed_at: ISODate
}
```

**anonymized_candidates**
```javascript
{
  id: UUID (original candidate_id),
  job_id: UUID,
  stage: "rejected_purged",
  experience_years: Number,
  skills_count: Number,
  purged_at: ISODate,
  purged_by: UUID,
  original_stage: String
}
```

---

### 8. **Email Templates**

#### Rejection Email
- Professional HTML design
- Personalized greeting
- Rejection reason box
- Custom message section (optional)
- **DPDP Act 2023 data purge notice** (highlighted)
- Footer with legal info
- Responsive design

#### Onboarding Email
- Celebration theme with emojis
- Key details table
- Next steps checklist
- Document requirements
- CTA for acceptance
- PDF attachment notice

#### Interview Email
- Clean professional design
- Interview details table
- Preparation tips
- Calendar invite notice
- Contact information

---

### 9. **PDF Generation Engine**

**Technology**: ReportLab
**Format**: A4 size
**Fonts**: Helvetica (system font - fast loading)

**Features**:
- Professional layout
- Company logo placeholder (configurable)
- Tables with styling
- Multi-page support
- Page numbering
- Headers and footers
- Color coding
- Proper spacing and margins

---

### 10. **S3 Integration**

**File**: `/app/backend/lifecycle_engine.py` (S3Manager class)

**Features**:
- ✅ Automatic initialization with AWS credentials
- ✅ **Fallback to base64** if S3 not configured
- ✅ Presigned URLs (7-day expiry)
- ✅ Organized folder structure:
  - `/appointment_letters/`
  - `/pdfs/`
- ✅ Private ACL (secure by default)
- ✅ File deletion support

**Configuration** (`.env`):
```
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
S3_BUCKET_NAME=rms-documents
```

---

### 11. **Compliance Features (DPDP Act 2023)**

#### ✅ Right to Access
- Data snapshot generation
- Complete JSON export
- Audit logged

#### ✅ Right to Erasure
- Permanent PII deletion
- S3 file deletion
- Related records cleanup
- Anonymized data retention
- Audit logged with hash
- Non-recoverable

#### ✅ Data Portability
- JSON format export
- Includes all related data
- Machine-readable format

#### ✅ Audit Trail
- All lifecycle events logged
- Immutable logs
- Timestamp and actor tracking
- Event metadata stored

#### ✅ Consent Management
- Existing consent_log in candidate model
- Tracked for every data collection

---

### 12. **Security Features**

- ✅ **JWT Authentication** on all endpoints
- ✅ **Role-based access** (via current_user)
- ✅ **Data encryption** for sensitive fields
- ✅ **Audit logging** for all actions
- ✅ **Secure file storage** (S3 with presigned URLs)
- ✅ **Input validation** with Pydantic models
- ✅ **SQL injection protection** (MongoDB parameterized queries)
- ✅ **XSS protection** (React auto-escaping)

---

### 13. **Technical Stack**

#### Backend
- FastAPI (Python)
- Motor (async MongoDB)
- ReportLab (PDF generation)
- boto3 (AWS S3)
- Resend (Email service)
- Pydantic (Data validation)

#### Frontend
- React 19
- Axios (HTTP client)
- Tailwind CSS (Styling)
- Lucide React (Icons)

#### Storage
- MongoDB (Database)
- AWS S3 (File storage)
- Local fallback (base64)

---

## 📝 How to Use

### 1. **Rejection Workflow**
```
1. Navigate to candidate in Declined sidebar
2. Click "Reject Candidate"
3. RejectionWorkflow modal opens
4. Select rejection reason
5. Add optional custom message
6. Preview email in right pane
7. Check/uncheck "Purge data"
8. Click "Confirm & Send Rejection"
9. Email sent + Data purged (if checked)
```

### 2. **Onboarding Workflow**
```
1. Drag candidate to "Onboarding" column
2. OnboardingWorkflow modal opens
3. Fill in:
   - Designation, Department, Location
   - Reporting Manager
   - Joining Date
   - CTC Breakup (add/remove components)
4. Preview PDF and email in right pane
5. Click "Generate & Send Letter"
6. PDF generated + Email sent with attachment
```

### 3. **Interview Scheduling**
```
1. Click "Schedule Interview" on candidate card
2. InterviewSchedulingSidebar opens
3. Select interview type
4. Choose date and time
5. Set duration
6. Search and select interviewer
7. Add meeting URL (Zoom/Teams)
8. Click "Schedule Interview"
9. Emails sent + .ics file generated
```

### 4. **Privacy Hub**
```
1. Go to candidate profile
2. Navigate to "Privacy" tab
3. Click "Generate Snapshot" for data export
4. OR Click "Process Withdrawal"
5. Select withdrawal reason
6. Optionally purge data immediately
```

---

## 🔧 Configuration

### Environment Variables

**Backend** (`.env`):
```env
# Email Service
RESEND_API_KEY=re_xxxxxxxxxxxxx
SENDER_EMAIL=noreply@company.com

# AWS S3 (Optional - uses base64 if not configured)
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_REGION=us-east-1
S3_BUCKET_NAME=rms-documents
```

**Frontend** (`.env`):
```env
REACT_APP_BACKEND_URL=https://your-backend-url.com
```

---

## 📊 Monitoring & Analytics

### Lifecycle Events Tracking
All events are logged in `lifecycle_events` collection:
- Rejection emails sent
- Data purges executed
- Appointment letters generated
- Interviews scheduled
- Data snapshots created
- Withdrawals processed

### Query Examples
```javascript
// Count rejections this month
db.lifecycle_events.count({
  event_type: "rejection",
  timestamp: { $gte: new Date("2025-01-01") }
})

// Get all data purges
db.lifecycle_events.find({
  event_type: "rejection",
  data_purged: true
}).sort({ timestamp: -1 })
```

---

## 🎯 Key Achievements

✅ **Reusable Architecture**: DualPaneModal can be extended for other workflows
✅ **DPDP Compliance**: Full implementation of data rights
✅ **Professional PDFs**: Publication-ready appointment letters
✅ **Calendar Integration**: Universal .ics files work with all calendar apps
✅ **Email Templates**: Production-ready HTML emails
✅ **Audit Trail**: Complete compliance logging
✅ **S3 Integration**: Cloud storage with local fallback
✅ **Security**: JWT auth, role-based access, encrypted storage
✅ **Responsive UI**: Mobile-friendly interfaces
✅ **Error Handling**: Graceful fallbacks and user-friendly messages

---

## 📚 Documentation Files Created

1. `/app/LIFECYCLE_ENGINE_SCHEMA.md` - Complete database schema
2. `/app/backend/lifecycle_engine.py` - Backend engine (900+ lines)
3. Component files (8 React components)
4. This summary file

---

## 🚀 Next Steps (Optional Enhancements)

1. **Bulk Operations**: Reject multiple candidates at once
2. **Email Tracking**: Track opens and clicks
3. **SMS Notifications**: Add SMS support via Twilio
4. **Interview Reminders**: Automated reminders 24h before
5. **Calendar Sync**: Two-way sync with Google Calendar
6. **Digital Signatures**: E-signature for appointment letters
7. **Template Editor**: Visual email template editor
8. **Localization**: Multi-language support
9. **Advanced Analytics**: Dashboard for lifecycle metrics
10. **Video Interviews**: Built-in video conferencing

---

**Implementation Complete! ✅**

All deliverables completed as per requirements.
