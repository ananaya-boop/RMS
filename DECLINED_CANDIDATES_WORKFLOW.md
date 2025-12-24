# Declined Candidates Workflow - Technical Documentation

## Overview
A comprehensive candidate rejection system with DPDP Act 2023 compliance, including a dedicated sidebar for pending rejections, confirmation modal, automated email notifications, and audit logging.

## Architecture

### 1. Declined Sidebar UI
**Location**: Right side of Kanban Board
**Trigger**: Click "Declined (N)" button or decline a candidate

**Features**:
- Rose-bordered sidebar with red accent
- List of candidates in "Pending Rejection" state
- Click candidate to open confirmation modal
- Real-time counter showing number of declined candidates

### 2. Candidate States
- **Active Pipeline**: `sourced`, `screened`, `technical`, `hr_round`, `offer`, `onboarding`
- **Declined**: Moved to sidebar, awaiting final action (data still exists)
- **Rejected**: Fully purged from system (data deleted)

### 3. Confirmation Modal (Double-Check)
When clicking a declined candidate, a modal appears with:

**Option 1: "Yes, Reject & Purge Data"**
- Permanently deletes all candidate data
- Sends automated rejection email
- Creates audit log entry
- Irreversible action

**Option 2: "Move Back to Sourced Pipeline"**
- Restores candidate to initial "Sourced" stage
- Preserves all data
- Updates stage history

**Option 3: "Cancel"**
- Closes modal without action

### 4. Data Purge & Email Flow

#### Backend Flow:
```
1. Retrieve candidate & job data
2. Create audit log entry (before deletion)
3. Send rejection email via Resend API
4. Hard delete candidate data:
   - Main candidate record
   - Interview scorecards
   - POSH reports
   - Sensitive data (PAN, Aadhaar, UAN)
5. Return success response
```

#### Email Template:
- Professional rejection letter
- Thanks for application
- Informs about data deletion (DPDP Act compliance)
- Automated, unmonitored email notice

## API Endpoints

### 1. Decline Candidate
```http
PUT /api/candidates/{candidate_id}/stage
Authorization: Bearer {token}
Content-Type: application/json

{
  "stage": "declined"
}
```

**Response**: Updated candidate object with stage="declined"

### 2. Reject & Purge (Final Action)
```http
POST /api/candidates/{candidate_id}/reject-and-purge
Authorization: Bearer {token}
```

**Actions**:
- Creates audit log
- Sends rejection email
- Deletes all candidate data

**Response**:
```json
{
  "success": true,
  "message": "Candidate rejected, data purged, and notification sent",
  "audit_log_id": "uuid"
}
```

### 3. Restore to Sourced
```http
POST /api/candidates/{candidate_id}/restore-to-sourced
Authorization: Bearer {token}
```

**Actions**:
- Updates stage to "sourced"
- Adds stage history entry
- Preserves all data

**Response**:
```json
{
  "success": true,
  "message": "Candidate restored to Sourced stage"
}
```

### 4. Get Audit Logs (Admin/DPO Only)
```http
GET /api/audit-logs
Authorization: Bearer {token}
```

**Response**: Array of audit log entries (last 100)

## Frontend Components

### DeclinedSidebar Component
**Location**: `/app/frontend/src/components/DeclinedSidebar.js`

**Props**:
- `declinedCandidates`: Array of candidates with stage="declined"
- `onClose`: Callback to close sidebar
- `onRefresh`: Callback to refresh candidate list

**Features**:
- Fixed position right sidebar
- Scrollable candidate list
- Click handler for confirmation modal
- Real-time counter

### KanbanBoard Updates
**Location**: `/app/frontend/src/pages/KanbanBoard.js`

**New Features**:
1. "✕ Decline" button on each candidate card
2. "Declined (N)" button in header
3. `getDeclinedCandidates()` filter function
4. `handleDeclineCandidate()` API call
5. DeclinedSidebar integration

## Audit Logging

### Audit Log Structure
```javascript
{
  id: "uuid",
  action: "candidate_purged" | "direct_purge",
  candidate_id: "uuid",
  candidate_email: "email@example.com",
  candidate_name: "Full Name",
  performed_by: "recruiter@company.com",
  performed_by_name: "Recruiter Name",
  timestamp: "ISO 8601 datetime",
  reason: "Rejected by recruiter" | "Admin/DPO direct purge"
}
```

### Viewing Audit Logs
- Admin and DPO roles only
- Navigate to Compliance Dashboard
- Last 100 actions displayed
- Includes candidate email/name but no PII after deletion

## Email Notification

### Configuration
```env
RESEND_API_KEY="re_your_api_key"
SENDER_EMAIL="onboarding@resend.dev"
```

### Email Content
- **Subject**: "Update regarding your application for {Job Title}"
- **Body**:
  - Thank you message
  - Rejection notification
  - **Privacy Notice**: Data deletion confirmation (DPDP Act)
  - Best wishes for future
- **Footer**: Automated message notice

### Email Trigger
- Sent automatically on "Reject & Purge" action
- Non-blocking (runs in thread)
- Continues with deletion even if email fails
- Error logged but doesn't stop process

## DPDP Act 2023 Compliance

### Data Minimization
✅ Candidates in "declined" state are pending deletion
✅ Data deleted permanently after rejection confirmation

### Right to Erasure
✅ Automated data purge on rejection
✅ Manual purge available (Admin/DPO)
✅ All related data deleted (scorecards, reports, sensitive data)

### Transparency
✅ Candidate notified of data deletion via email
✅ Audit logs maintain accountability without storing PII

### Consent & Purpose Limitation
✅ Data only retained while recruitment is active
✅ Rejected candidates' data not kept

## User Experience Flow

### Recruiter Workflow:
1. Review candidate in Kanban pipeline
2. Click "✕ Decline" button on candidate card
3. Candidate moves to "Declined Candidates" sidebar
4. Click "Declined (1)" button to view sidebar
5. Click on declined candidate
6. Confirmation modal appears with 2 options:
   - **Reject & Purge**: Final deletion with email
   - **Restore to Sourced**: Give second chance
7. Confirm action
8. Toast notification confirms completion

### Admin/DPO Workflow:
1. View Compliance Dashboard
2. Access audit logs
3. See all rejection actions with:
   - Who performed action
   - When it was performed
   - Which candidate (without PII after deletion)

## Testing

### Manual Testing Steps:
1. Login as recruiter
2. Navigate to Kanban Board
3. Click "✕ Decline" on any candidate
4. Verify candidate appears in declined sidebar
5. Click "Declined (1)" button
6. Click on candidate in sidebar
7. Verify confirmation modal appears
8. Test "Restore to Sourced" - candidate should return to pipeline
9. Decline again and test "Reject & Purge"
10. Verify candidate deleted and email sent (if configured)
11. Check audit logs in Compliance Dashboard

### API Testing:
```bash
# Decline candidate
curl -X PUT "$API_URL/api/candidates/{id}/stage" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"stage":"declined"}'

# Reject and purge
curl -X POST "$API_URL/api/candidates/{id}/reject-and-purge" \
  -H "Authorization: Bearer $TOKEN"

# Restore to sourced
curl -X POST "$API_URL/api/candidates/{id}/restore-to-sourced" \
  -H "Authorization: Bearer $TOKEN"

# View audit logs (Admin only)
curl -X GET "$API_URL/api/audit-logs" \
  -H "Authorization: Bearer $TOKEN"
```

## Security Considerations

### Access Control
- Decline action: Any authenticated recruiter
- Restore action: Any authenticated recruiter
- Reject & Purge: Any authenticated recruiter (irreversible)
- Audit logs: Admin and DPO only

### Data Protection
- Hard delete ensures data not recoverable
- Audit logs don't store full PII after deletion
- Email sent to candidate's last known email before deletion
- MongoDB cascading delete removes all related documents

## Future Enhancements

1. **Bulk Rejection**: Select multiple declined candidates for batch processing
2. **Rejection Reasons**: Add dropdown for rejection reason in audit log
3. **Email Templates**: Customizable email templates per job/department
4. **Auto-Purge**: Scheduled job to auto-purge declined candidates after X days
5. **SMS Notification**: Optional SMS in addition to email
6. **Analytics**: Dashboard showing rejection rates by stage
7. **Candidate Portal**: Allow candidates to request data deletion themselves

## Troubleshooting

### Email Not Sending
- Check `RESEND_API_KEY` in `/app/backend/.env`
- Verify API key is valid at https://resend.com/dashboard
- Check backend logs: `tail -f /var/log/supervisor/backend.err.log`
- Email failure doesn't stop deletion process

### Sidebar Not Appearing
- Ensure frontend is running: `sudo supervisorctl status frontend`
- Clear browser cache and reload
- Check browser console for errors (F12)

### Candidate Not Moving to Declined
- Verify JWT token is valid (logout/login)
- Check backend API response in Network tab
- Ensure candidate exists and is in active stage

## Code References

- Backend: `/app/backend/server.py` (lines with "reject-and-purge", "restore-to-sourced", "audit_logs")
- Frontend Sidebar: `/app/frontend/src/components/DeclinedSidebar.js`
- Frontend Kanban: `/app/frontend/src/pages/KanbanBoard.js`
- Email Template: Inline in `reject_and_purge_candidate()` function

---

**Last Updated**: December 2025
**Version**: 1.0
**Compliance**: DPDP Act 2023
