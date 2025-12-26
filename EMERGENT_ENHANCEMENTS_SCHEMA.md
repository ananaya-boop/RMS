# Emergent-Specific RMS Enhancements

## Database Schema

### 1. Enhanced Candidate Model (additions)

```javascript
{
  // ... existing fields ...
  
  // Emergent-Specific Statutory Data
  "statutory_data": {
    "pan": "ABCDE1234F",
    "aadhaar_masked": "XXXX-XXXX-1234",
    "uan": "123456789012",
    "esic_number": null
  },
  
  // Bank Details for Payroll
  "bank_details": {
    "account_number": "1234567890",
    "ifsc_code": "HDFC0001234",
    "bank_name": "HDFC Bank",
    "branch": "Bangalore Branch",
    "account_holder_name": "Priya Sharma"
  },
  
  // Emergent Employee Master Fields
  "emergent_employee_data": {
    "personal_email": "priya.personal@gmail.com",
    "emergency_contact_name": "Raj Sharma",
    "emergency_contact_number": "+91-9876543210",
    "blood_group": "O+",
    "permanent_address": {
      "line1": "123 Main Street",
      "line2": "Koramangala",
      "city": "Bangalore",
      "state": "Karnataka",
      "pincode": "560095"
    },
    "current_address_same_as_permanent": true,
    "current_address": null
  },
  
  // Offer Status Tracking
  "offer_status": {
    "offer_sent_date": "2025-01-15T10:30:00Z",
    "offer_acceptance_status": "pending", // pending, accepted, declined, negotiating
    "offer_declined_reason": null,
    "digital_signature_date": null,
    "renegotiation_count": 0,
    "last_offer_ctc": 2500000
  }
}
```

### 2. Salary Components Table (Emergent Payroll Structure)

```javascript
{
  "id": "uuid",
  "candidate_id": "uuid",
  "offer_id": "uuid",
  "version": 1, // For tracking re-negotiations
  
  // Basic Components (Annual amounts)
  "basic_salary": 600000,        // 40% of gross typically
  "hra": 300000,                 // 50% of basic
  "conveyance_allowance": 19200, // ₹1600/month * 12
  "special_allowance": 800000,   // Balancing component
  "lta": 30000,                  // Leave Travel Allowance
  "medical_allowance": 15000,    // ₹1250/month * 12
  
  // Variable Components
  "performance_bonus": 250000,   // Annual variable
  "joining_bonus": 100000,       // One-time
  
  // Employer Contributions (not part of CTC in hand)
  "employer_pf": 72000,          // 12% of basic (if basic > 15k/month)
  "employer_esic": 0,            // 3.25% if gross < 21k/month, else 0
  "gratuity": 28800,            // 4.81% of basic
  
  // Deductions
  "employee_pf": 72000,          // 12% of basic
  "employee_esic": 0,            // 0.75% if applicable
  "professional_tax": 2400,      // State-wise (Karnataka: ₹200/month)
  
  // Calculated Fields
  "gross_annual_ctc": 1500000,   // Sum of all components
  "take_home_monthly": 110000,   // After deductions
  "in_hand_annual": 1320000,     // Annual take-home
  
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T10:30:00Z"
}
```

### 3. Offer Lifecycle Events

```javascript
{
  "id": "uuid",
  "candidate_id": "uuid",
  "event_type": "offer_sent | offer_viewed | offer_accepted | offer_declined | offer_renegotiation_requested",
  "timestamp": "2025-01-15T10:30:00Z",
  "metadata": {
    "ctc_offered": 2500000,
    "pdf_url": "https://s3.../offer-letter.pdf",
    "decline_reason": "better_offer_elsewhere",
    "notes": "Candidate requested salary hike of 15%"
  },
  "performed_by": "recruiter_id"
}
```

### 4. Employee Master Export Format

CSV/Excel headers matching Emergent's import template:

```csv
Employee Code,Employee Name,Date of Joining,Department,Designation,Work Location,
PAN Number,Aadhaar Number,UAN,Bank Account Number,IFSC Code,
Basic Salary,HRA,Conveyance Allowance,Special Allowance,LTA,Medical Allowance,
Performance Bonus,PF Applicable,ESIC Applicable,Professional Tax,
Personal Email,Mobile Number,Emergency Contact Name,Emergency Contact Number,
Reporting Manager,Probation Months,Notice Period Days,Blood Group,
Address Line 1,Address Line 2,City,State,Pincode
```

## API Endpoints

### 1. Offer Management
- `POST /api/offers/create-draft` - Create offer draft when moving to offer stage
- `GET /api/offers/preview/{candidate_id}` - Get offer letter preview
- `POST /api/offers/send` - Send offer to candidate
- `PUT /api/offers/accept/{candidate_id}` - Candidate accepts offer
- `PUT /api/offers/decline/{candidate_id}` - Candidate declines offer
- `POST /api/offers/renegotiate/{candidate_id}` - Request renegotiation

### 2. Employee Master Export
- `GET /api/export/employee-master` - Export all onboarding candidates
- `GET /api/export/employee-master/{candidate_id}` - Export single candidate

### 3. Statutory Data Management
- `PUT /api/candidates/{id}/statutory-data` - Update PAN, Aadhaar, UAN
- `PUT /api/candidates/{id}/bank-details` - Update bank information
- `PUT /api/candidates/{id}/emergent-data` - Update Emergent-specific fields

## React Components Structure

### 1. EmergentOfferModal.js
- Left Pane: Editable salary components (Emergent structure)
- Right Pane: Live PDF preview with Annexure A
- Salary calculator with PF/ESIC logic
- Mandatory fields validation
- Auto-save draft functionality

### 2. OfferDeclinedSidebar.js
- List of candidates who declined offers
- Re-negotiate button → reopens EmergentOfferModal
- Finalize Rejection button → triggers data purge workflow
- Decline reason display

### 3. StatutoryDataForm.js
- Collects PAN, Aadhaar, UAN
- Bank details form
- Emergent employee master fields
- Validation for Indian formats (PAN: ABCDE1234F, IFSC, etc.)

### 4. EmployeeMasterExport.js
- Button to trigger export
- Date range selector
- CSV/Excel format option
- Preview before download

## Workflow Implementation

### HR to Offer Transition
```
1. User drags candidate from "HR Round" to "Offer"
2. System intercepts the drop action
3. Checks if offer draft exists
4. If no draft:
   - Shows EmergentOfferModal (mandatory)
   - Pre-fills with candidate's expected CTC
   - Requires all statutory data before allowing save
5. If draft exists:
   - Shows "View/Edit Offer" option
6. On successful offer creation:
   - Updates candidate stage to "offer"
   - Sends email with PDF if enabled
   - Creates audit log
```

### Offer Declined Workflow
```
1. Candidate declines offer (via email link or portal)
2. System moves candidate to "Offer Declined" sidebar
3. Recruiter sees two options:
   a. Re-negotiate:
      - Reopens EmergentOfferModal
      - Increments renegotiation_count
      - Allows editing salary components
   b. Finalize Rejection:
      - Shows DPDP data purge confirmation
      - Sends final rejection email
      - Anonymizes/purges data based on selection
```

### Onboarding Export Workflow
```
1. Candidate accepts offer and signs digitally
2. System automatically moves to "Onboarding" stage
3. Trigger: Generate Employee Master CSV entry
4. Export includes all Emergent-required fields
5. Recruiter downloads CSV for batch import into Emergent
6. One-click import eliminates manual data entry
```

## PF/ESIC Calculation Logic

### Provident Fund (PF)
- Applicable if Basic Salary > ₹15,000/month (₹1,80,000/year)
- Employee Contribution: 12% of Basic
- Employer Contribution: 12% of Basic (3.67% goes to EPF, 8.33% to EPS)
- Calculation: `basic_salary * 0.12`

### ESI (Employees' State Insurance)
- Applicable if Gross Salary ≤ ₹21,000/month (₹2,52,000/year)
- Employee Contribution: 0.75% of Gross
- Employer Contribution: 3.25% of Gross
- Calculation: `gross_salary * 0.0075` (employee), `gross_salary * 0.0325` (employer)

### Professional Tax (State-wise)
- Karnataka: ₹200/month = ₹2,400/year (if monthly gross > ₹15,000)
- Maharashtra: ₹2,500/year
- Tamil Nadu: ₹2,400/year
- Other states: Varies

## Validation Rules

### PAN Number
- Format: `^[A-Z]{5}[0-9]{4}[A-Z]{1}$`
- Example: ABCDE1234F

### Aadhaar Number
- 12 digits
- Store only masked: XXXX-XXXX-1234
- Never store full number (DPDP compliance)

### UAN (Universal Account Number)
- 12 digits
- Format: `^[0-9]{12}$`

### IFSC Code
- Format: `^[A-Z]{4}0[A-Z0-9]{6}$`
- Example: HDFC0001234

### Bank Account Number
- 9-18 digits
- Alphanumeric allowed for some banks

## Security & Compliance

### Data Protection
- All sensitive data (PAN, Aadhaar, Bank) encrypted at rest
- Aadhaar stored only in masked format
- Access logged for audit trail
- RBAC: Only DPO/Admin can view full statutory data

### DPDP Act 2023 Compliance
- Explicit consent before collecting statutory data
- Right to erasure: Complete data purge on offer decline
- Data portability: Employee Master export in standard format
- Audit logs for all sensitive data access

## Job Requisition Broadcasting (Future Enhancement)

### LinkedIn Integration
```javascript
{
  "job_id": "uuid",
  "platform": "linkedin",
  "post_id": "linkedin_post_id",
  "posted_at": "2025-01-15T10:30:00Z",
  "applications_received": 45,
  "views": 1200,
  "status": "active"
}
```

### Naukri.com Integration
```javascript
{
  "job_id": "uuid",
  "platform": "naukri",
  "resdex_code": "NAUKRI123456",
  "posted_at": "2025-01-15T10:30:00Z",
  "applications_received": 78,
  "credits_used": 2,
  "status": "active"
}
```

### Source Tracking
- Track which platform each candidate came from
- ROI analysis per platform
- Auto-update candidate source in RMS
