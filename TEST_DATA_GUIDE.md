# RMS Test Data Guide

## 🎉 Your RMS is Now Fully Populated with Test Data!

The database has been seeded with realistic Indian recruitment data to help you explore all features of the Talent Cockpit RMS.

## 📊 What's Been Created

### 1. Job Requisitions (4)
- **Senior Full Stack Developer** - Bangalore (Engineering)
- **Data Scientist** - Hyderabad (Data & Analytics)
- **Product Manager** - Mumbai (Product)
- **DevOps Engineer** - Pune (Engineering)

### 2. Candidates (8) - Distributed Across Pipeline Stages

#### 🟢 Offer Stage (1)
- **Priya Sharma** - Senior Full Stack Developer
  - 6 years experience, React/Node.js expert
  - Expected CTC: ₹25,00,000
  - Status: Offer ready to be sent

#### 🟡 Onboarding Stage (1)
- **Sneha Iyer** - DevOps Engineer
  - 4 years experience, Kubernetes/AWS
  - Status: Selected, joining soon
  - Has appointment letter ready

#### 🔵 HR Round Stage (1)
- **Ananya Reddy** - Data Scientist
  - 4 years experience, ML/Python expert
  - Expected CTC: ₹28,00,000
  - Interview scheduled for tomorrow

#### 🔵 Technical Round Stage (2)
- **Rahul Verma** - Full Stack Developer
  - Interview scheduled in 1 day
- **Rohan Mehta** - DevOps Engineer (Referral)
  - 3 years experience

#### 🟠 Screened Stage (1)
- **Arjun Patel** - Product Manager
  - 5 years experience, SaaS background
  - Expected CTC: ₹30,00,000

#### ⚪ Sourced Stage (1)
- **Meera Krishnan** - Data Scientist
  - 3 years experience, new applicant

#### 🔴 Declined Stage (1)
- **Vikram Singh** - Full Stack Developer
  - Pending rejection workflow

### 3. Interview Schedules (3)
All scheduled in the next 24-48 hours:
- Priya Sharma - Technical Round (Google Meet)
- Rahul Verma - Technical Round (Zoom)
- Ananya Reddy - HR Round (Google Meet)

### 4. Interview Scorecards (2)
- Priya Sharma: 8.5/10 - Strong Yes recommendation
- Ananya Reddy: 8.5/10 - Yes recommendation

### 5. Withdrawal Requests (2)
- **Vikram Singh** (Declined stage)
  - Reason: Accepted other offer
  - Requesting data purge: Yes
  - Status: Pending review

- **Arjun Patel** (Screened stage)
  - Reason: Personal reasons
  - Requesting data purge: No
  - Status: Pending review

### 6. POSH Reports (1)
- Anonymous report about inappropriate behavior
- Status: Under review

### 7. Lifecycle Events (4)
- Stage progression tracking for Priya Sharma

## 🎯 Features You Can Now Test

### 1. Dashboard View
- View active job requisitions count
- See candidate pipeline distribution
- Check time-to-hire metrics

### 2. Kanban Board (`/kanban`)
- Drag and drop candidates between stages
- View candidates in each pipeline stage
- See declined candidates in sidebar
- Add tags to candidates

### 3. Candidate Profiles
Click any candidate to see:
- Complete profile with resume details
- Interview timeline and history
- Scorecard feedback
- Compliance sidebar (DPDP Act 2023)
- Consent logs
- Statutory data (PAN, Aadhaar)

### 4. Rejection Workflow (New Feature!)
For **Vikram Singh** (Declined stage):
- Click "Send Rejection"
- Preview rejection email in dual-pane modal
- Choose to purge data (DPDP compliance)
- Send rejection with automatic data anonymization

### 5. Onboarding Workflow (New Feature!)
For **Priya Sharma** (Offer stage):
- Click "Send Onboarding"
- Edit CTC breakup components
- Preview appointment letter PDF
- Send offer with PDF attachment

### 6. Interview Scheduling (New Feature!)
For any candidate:
- Schedule new interviews
- Generate .ics calendar invites
- Send to both candidate and interviewer

### 7. Withdrawal Requests (`/withdrawals`)
- Review 2 pending withdrawal requests
- Process with or without data purge
- DPDP Act 2023 compliant

### 8. Compliance Dashboard
- View all consent logs
- Export candidate data (JSON)
- Check POSH reports
- Data protection metrics

### 9. Privacy Hub (Candidate Profile)
- Data Snapshot: Export full candidate data
- Withdrawal: Process candidate withdrawal requests

## 🔐 Login Credentials

**Admin Access:**
- Email: `admin@rms.com`
- Password: `admin123`

**Other Test Accounts:**
- Recruiter: `recruiter@rms.com` / `recruiter123`
- Hiring Manager: `manager@rms.com` / `manager123`
- DPO: `dpo@rms.com` / `dpo123`

## 🚀 Recommended Testing Flow

1. **Login** as admin@rms.com
2. **Dashboard** - Get overview of recruitment pipeline
3. **Kanban Board** - See all candidates, try drag & drop
4. **Click Priya Sharma** - View detailed candidate profile
5. **Send Onboarding** - Try the onboarding workflow with PDF generation
6. **Click Vikram Singh** - View declined candidate
7. **Send Rejection** - Try rejection workflow with data purge
8. **Withdrawals Page** - Review and process withdrawal requests
9. **Schedule Interview** - Try scheduling for any candidate
10. **Compliance Dashboard** - View DPDP compliance data

## 💡 Tips

- All dates are relative to current time
- Interview schedules are set for tomorrow
- CTC values are in Indian Rupees (₹)
- Phone numbers follow Indian format (+91)
- Locations are major Indian tech hubs
- Skills are relevant to each job role

## 🎨 UI Features to Notice

- **Professional Design** - Clean, modern interface
- **Responsive Layout** - Works on all screen sizes
- **Real-time Updates** - Stage changes reflect immediately
- **Dual-Pane Modals** - Live preview for emails and PDFs
- **DPDP Compliance** - Privacy warnings and data protection
- **Kanban Drag & Drop** - Smooth candidate movement
- **Tags System** - Visual candidate categorization

## 📝 Notes

- All test data follows DPDP Act 2023 compliance
- Sensitive data (PAN, Aadhaar) is properly masked
- Consent logs are maintained for all candidates
- Email sending is configured (may need Resend API key for production)
- S3 storage has fallback to base64 (works without AWS credentials)

---

**Enjoy exploring your fully functional Talent Cockpit RMS! 🎉**
