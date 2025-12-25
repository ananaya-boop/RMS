"""
Lifecycle Engine for Candidate Communication & Compliance
Handles: Rejection with Data Purge, Onboarding Letters, Interview Scheduling, Privacy Hub
"""

from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, EmailStr, Field
import uuid
import boto3
from botocore.exceptions import ClientError
import os
import io
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, Image
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
import logging
import base64

logger = logging.getLogger(__name__)

# ============= MODELS =============

class LifecycleEvent(BaseModel):
    """Track all candidate lifecycle events for audit trail"""
    model_config = {"extra": "ignore"}
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    candidate_id: str
    event_type: str  # rejection, onboarding, interview_scheduled, data_snapshot, withdrawal, stage_change
    event_subtype: Optional[str] = None  # For granular tracking
    recruiter_id: str
    recruiter_email: EmailStr
    metadata: Dict[str, Any] = {}
    email_sent: bool = False
    email_id: Optional[str] = None
    pdf_generated: bool = False
    pdf_url: Optional[str] = None
    data_purged: bool = False
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RejectionRequest(BaseModel):
    """Rejection email with DPDP data purge notice"""
    candidate_id: str
    reason: str
    custom_message: Optional[str] = None
    purge_data: bool = True  # Default to purge as per DPDP
    send_email: bool = True

class RejectionEmailTemplate(BaseModel):
    """Template for rejection email"""
    candidate_name: str
    reason: str
    custom_message: Optional[str] = None
    company_name: str = "Our Company"
    recruiter_name: str = "Hiring Team"
    
    def render_html(self) -> str:
        """Generate HTML email content"""
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #f8f9fa; padding: 20px; text-align: center; border-bottom: 3px solid #333; }}
                .content {{ padding: 30px 20px; }}
                .footer {{ background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666; }}
                .notice-box {{ background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }}
                .dpdp-notice {{ background-color: #e7f3ff; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>Application Status Update</h2>
                </div>
                <div class="content">
                    <p>Dear {self.candidate_name},</p>
                    
                    <p>Thank you for your interest in the position at {self.company_name} and for taking the time to interview with us.</p>
                    
                    <div class="notice-box">
                        <p><strong>Application Status:</strong> Not Selected</p>
                        <p><strong>Reason:</strong> {self.reason}</p>
                    </div>
                    
                    {f'<p>{self.custom_message}</p>' if self.custom_message else ''}
                    
                    <p>We appreciate the time and effort you invested in the interview process. We wish you the very best in your job search and future career endeavors.</p>
                    
                    <div class="dpdp-notice">
                        <h4>Data Privacy Notice (DPDP Act 2023 Compliance)</h4>
                        <p>As per the Digital Personal Data Protection Act 2023, we are required to inform you that:</p>
                        <ul>
                            <li>Your personal data will be <strong>permanently deleted</strong> from our systems within 7 business days.</li>
                            <li>This includes your resume, interview feedback, and all personally identifiable information (PII).</li>
                            <li>We will retain only anonymized statistical data for compliance and reporting purposes.</li>
                            <li>An audit log of this data purge will be maintained for regulatory compliance.</li>
                        </ul>
                        <p>If you have any questions about this process or wish to exercise your data rights, please contact our Data Protection Officer at dpo@{self.company_name.lower().replace(' ', '')}.com</p>
                    </div>
                    
                    <p>Thank you once again for your interest.</p>
                    
                    <p>Best regards,<br>{self.recruiter_name}<br>{self.company_name}</p>
                </div>
                <div class="footer">
                    <p>This is an automated email. Please do not reply to this address.</p>
                    <p>&copy; {datetime.now().year} {self.company_name}. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        return html

class OnboardingLetterRequest(BaseModel):
    """Request to generate and send appointment letter"""
    candidate_id: str
    designation: str
    joining_date: str  # YYYY-MM-DD format
    ctc_annual: float
    ctc_breakup: Dict[str, float]  # {"basic": 500000, "hra": 200000, ...}
    reporting_manager: str
    work_location: str
    department: str
    probation_months: int = 6
    notice_period_days: int = 30
    send_email: bool = True

class AppointmentLetterPDF:
    """Generate professional appointment letter PDF"""
    
    @staticmethod
    def generate(data: Dict[str, Any]) -> bytes:
        """Generate appointment letter PDF"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
        
        # Styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            textColor=colors.HexColor('#1a1a1a'),
            spaceAfter=30,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=12,
            textColor=colors.HexColor('#1a1a1a'),
            spaceAfter=12,
            fontName='Helvetica-Bold'
        )
        
        body_style = ParagraphStyle(
            'CustomBody',
            parent=styles['BodyText'],
            fontSize=10,
            textColor=colors.HexColor('#333333'),
            alignment=TA_JUSTIFY,
            fontName='Helvetica'
        )
        
        # Build document
        story = []
        
        # Header with logo placeholder
        story.append(Paragraph("[COMPANY LOGO]", title_style))
        story.append(Spacer(1, 0.2*inch))
        
        # Title
        story.append(Paragraph("LETTER OF APPOINTMENT", title_style))
        story.append(Spacer(1, 0.3*inch))
        
        # Date and reference
        date_str = datetime.now().strftime("%B %d, %Y")
        story.append(Paragraph(f"<b>Date:</b> {date_str}", body_style))
        story.append(Paragraph(f"<b>Ref No:</b> HR/APPT/{data['candidate_id'][:8].upper()}", body_style))
        story.append(Spacer(1, 0.3*inch))
        
        # Candidate details
        story.append(Paragraph(f"<b>{data['candidate_name']}</b>", body_style))
        story.append(Paragraph(f"{data['candidate_email']}", body_style))
        story.append(Spacer(1, 0.2*inch))
        
        # Main content
        story.append(Paragraph("Dear <b>" + data['candidate_name'] + "</b>,", body_style))
        story.append(Spacer(1, 0.15*inch))
        
        intro_text = f"""
        We are pleased to offer you the position of <b>{data['designation']}</b> at Our Company, 
        reporting to <b>{data['reporting_manager']}</b>. Your employment will be based at our 
        <b>{data['work_location']}</b> office in the <b>{data['department']}</b> department.
        """
        story.append(Paragraph(intro_text, body_style))
        story.append(Spacer(1, 0.2*inch))
        
        # Terms section
        story.append(Paragraph("TERMS OF EMPLOYMENT", heading_style))
        
        terms_data = [
            ["<b>Designation</b>", data['designation']],
            ["<b>Department</b>", data['department']],
            ["<b>Work Location</b>", data['work_location']],
            ["<b>Reporting Manager</b>", data['reporting_manager']],
            ["<b>Date of Joining</b>", data['joining_date']],
            ["<b>Probation Period</b>", f"{data['probation_months']} months"],
            ["<b>Notice Period</b>", f"{data['notice_period_days']} days"],
        ]
        
        terms_table = Table(terms_data, colWidths=[2.5*inch, 4*inch])
        terms_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8f9fa')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        story.append(terms_table)
        story.append(Spacer(1, 0.3*inch))
        
        # CTC Section
        story.append(Paragraph("COMPENSATION (Annexure A)", heading_style))
        story.append(Paragraph(f"Your Cost to Company (CTC) is <b>INR {data['ctc_annual']:,.2f}</b> per annum, comprising:", body_style))
        story.append(Spacer(1, 0.1*inch))
        
        # CTC Breakup table
        ctc_data = [["<b>Component</b>", "<b>Annual (INR)</b>", "<b>Monthly (INR)</b>"]]
        for component, amount in data['ctc_breakup'].items():
            monthly = amount / 12
            ctc_data.append([component.replace('_', ' ').title(), f"{amount:,.2f}", f"{monthly:,.2f}"])
        
        # Add total row
        ctc_data.append(["<b>Total CTC</b>", f"<b>{data['ctc_annual']:,.2f}</b>", f"<b>{data['ctc_annual']/12:,.2f}</b>"])
        
        ctc_table = Table(ctc_data, colWidths=[2.5*inch, 2*inch, 2*inch])
        ctc_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#333333')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('FONTNAME', (0, 1), (-1, -2), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -2), 9),
            ('BACKGROUND', (0, 1), (-1, -2), colors.white),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#f0f0f0')),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(ctc_table)
        story.append(Spacer(1, 0.3*inch))
        
        # Statutory compliance
        story.append(Paragraph("STATUTORY COMPLIANCE", heading_style))
        compliance_text = """
        1. <b>Provident Fund (PF):</b> You will be enrolled in the Employees' Provident Fund as per the EPF Act 1952. 
        Your UAN (Universal Account Number) will be provided upon joining.<br/><br/>
        2. <b>Professional Tax:</b> Deducted as per state regulations.<br/><br/>
        3. <b>Income Tax (TDS):</b> Deducted at source as per IT Act 1961, based on your tax declarations.<br/><br/>
        4. <b>POSH Policy:</b> You are required to complete the mandatory Prevention of Sexual Harassment (POSH) training 
        within 30 days of joining. Our organization is committed to maintaining a safe and respectful workplace.
        """
        story.append(Paragraph(compliance_text, body_style))
        story.append(Spacer(1, 0.3*inch))
        
        # Page break for next section
        story.append(PageBreak())
        
        # Terms and conditions
        story.append(Paragraph("GENERAL TERMS & CONDITIONS", heading_style))
        
        terms_text = """
        1. This offer is contingent upon satisfactory verification of your educational qualifications, 
        experience certificates, and background checks.<br/><br/>
        2. During your probation period, either party may terminate this employment with 
        {probation_notice} days' notice or payment in lieu thereof.<br/><br/>
        3. Post-probation, the notice period will be {notice_period} days from either side.<br/><br/>
        4. You will be required to sign a confidentiality and non-disclosure agreement on your joining date.<br/><br/>
        5. This appointment is subject to our company's policies, rules, and regulations as amended from time to time.<br/><br/>
        6. You are required to submit the following documents within 7 days of joining:<br/>
        - Copy of PAN Card<br/>
        - Copy of Aadhaar Card<br/>
        - Educational certificates (10th, 12th, Graduation, Post-Graduation)<br/>
        - Experience/Relieving letters from previous employers<br/>
        - Passport size photographs (3 copies)<br/>
        - Bank account details with cancelled cheque
        """.format(
            probation_notice=max(7, data['notice_period_days'] // 4),
            notice_period=data['notice_period_days']
        )
        story.append(Paragraph(terms_text, body_style))
        story.append(Spacer(1, 0.3*inch))
        
        # Closing
        closing_text = """
        We are excited to welcome you to our team and look forward to a mutually beneficial association. 
        Please sign and return a copy of this letter as your acceptance of this offer.
        """
        story.append(Paragraph(closing_text, body_style))
        story.append(Spacer(1, 0.4*inch))
        
        # Signature section
        story.append(Paragraph("For Our Company:", body_style))
        story.append(Spacer(1, 0.8*inch))
        story.append(Paragraph("_________________________", body_style))
        story.append(Paragraph("<b>HR Manager</b>", body_style))
        story.append(Paragraph(f"Date: {date_str}", body_style))
        story.append(Spacer(1, 0.5*inch))
        
        # Acceptance section
        story.append(Paragraph("ACCEPTANCE", heading_style))
        acceptance_text = """
        I, <b>{candidate_name}</b>, hereby accept the terms and conditions of employment as stated in this letter.
        """.format(candidate_name=data['candidate_name'])
        story.append(Paragraph(acceptance_text, body_style))
        story.append(Spacer(1, 0.8*inch))
        story.append(Paragraph("_________________________", body_style))
        story.append(Paragraph(f"<b>{data['candidate_name']}</b>", body_style))
        story.append(Paragraph("Signature & Date", body_style))
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()

class InterviewScheduleRequest(BaseModel):
    """Schedule interview with calendar invite"""
    candidate_id: str
    job_id: str
    interviewer_user_id: str
    interview_type: str  # Screening, Technical, HR Round, Final
    start_time: datetime
    duration_minutes: int = 60
    meeting_url: Optional[str] = None
    send_email: bool = True
    generate_ics: bool = True

class ICSGenerator:
    """Generate .ics calendar file"""
    
    @staticmethod
    def generate(event_data: Dict[str, Any]) -> str:
        """Generate ICS file content"""
        # Format: YYYYMMDDTHHMMSSZ
        start_dt = event_data['start_time']
        end_dt = start_dt + timedelta(minutes=event_data['duration_minutes'])
        
        dtstamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
        dtstart = start_dt.strftime('%Y%m%dT%H%M%SZ')
        dtend = end_dt.strftime('%Y%m%dT%H%M%SZ')
        
        ics_content = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Talent Cockpit//Interview Schedule//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:{event_data['uid']}@talentcockpit.com
DTSTAMP:{dtstamp}
DTSTART:{dtstart}
DTEND:{dtend}
SUMMARY:{event_data['summary']}
DESCRIPTION:{event_data['description']}
LOCATION:{event_data.get('meeting_url', 'Virtual')}
STATUS:CONFIRMED
SEQUENCE:0
ORGANIZER;CN={event_data['organizer_name']}:MAILTO:{event_data['organizer_email']}
ATTENDEE;CN={event_data['candidate_name']};RSVP=TRUE:MAILTO:{event_data['candidate_email']}
ATTENDEE;CN={event_data['interviewer_name']};RSVP=TRUE:MAILTO:{event_data['interviewer_email']}
BEGIN:VALARM
TRIGGER:-PT15M
ACTION:DISPLAY
DESCRIPTION:Interview Reminder - 15 minutes
END:VALARM
END:VEVENT
END:VCALENDAR"""
        
        return ics_content

class S3Manager:
    """AWS S3 file management"""
    
    def __init__(self):
        self.s3_client = None
        self.bucket_name = os.environ.get('S3_BUCKET_NAME', 'rms-documents')
        self.region = os.environ.get('AWS_REGION', 'us-east-1')
        
        # Initialize S3 client only if credentials are available
        if os.environ.get('AWS_ACCESS_KEY_ID') and os.environ.get('AWS_SECRET_ACCESS_KEY'):
            try:
                self.s3_client = boto3.client(
                    's3',
                    aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
                    aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY'),
                    region_name=self.region
                )
                logger.info("S3 client initialized successfully")
            except Exception as e:
                logger.warning(f"Failed to initialize S3 client: {e}")
                self.s3_client = None
        else:
            logger.info("S3 credentials not found, will use local storage")
    
    def upload_pdf(self, pdf_bytes: bytes, filename: str, folder: str = "pdfs") -> Optional[str]:
        """Upload PDF to S3 or return base64 for local storage"""
        if self.s3_client:
            try:
                key = f"{folder}/{filename}"
                self.s3_client.put_object(
                    Bucket=self.bucket_name,
                    Key=key,
                    Body=pdf_bytes,
                    ContentType='application/pdf',
                    ACL='private'
                )
                # Generate presigned URL (valid for 7 days)
                url = self.s3_client.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': self.bucket_name, 'Key': key},
                    ExpiresIn=604800  # 7 days
                )
                logger.info(f"PDF uploaded to S3: {key}")
                return url
            except ClientError as e:
                logger.error(f"Failed to upload to S3: {e}")
                # Fallback to base64
                return f"data:application/pdf;base64,{base64.b64encode(pdf_bytes).decode('utf-8')}"
        else:
            # Return base64 encoded PDF for local storage
            return f"data:application/pdf;base64,{base64.b64encode(pdf_bytes).decode('utf-8')}"
    
    def delete_file(self, file_url: str) -> bool:
        """Delete file from S3"""
        if self.s3_client and not file_url.startswith('data:'):
            try:
                # Extract key from URL
                key = file_url.split(f"{self.bucket_name}/")[-1].split("?")[0]
                self.s3_client.delete_object(Bucket=self.bucket_name, Key=key)
                logger.info(f"File deleted from S3: {key}")
                return True
            except Exception as e:
                logger.error(f"Failed to delete from S3: {e}")
                return False
        return True

# Initialize S3 manager
s3_manager = S3Manager()


class DataPurgeService:
    """Handle DPDP-compliant data purging"""
    
    @staticmethod
    async def purge_candidate_pii(db, candidate_id: str, recruiter_id: str) -> Dict[str, Any]:
        """
        Permanently delete or anonymize PII as per DPDP Act 2023
        Retain only non-identifiable statistical data
        """
        candidate = await db.candidates.find_one({"id": candidate_id})
        if not candidate:
            raise ValueError("Candidate not found")
        
        # Create anonymized record for statistical purposes
        anonymized_data = {
            "id": candidate_id,
            "job_id": candidate['job_id'],
            "stage": "rejected_purged",
            "experience_years": candidate.get('experience_years'),
            "skills_count": len(candidate.get('skills', [])),
            "purged_at": datetime.now(timezone.utc),
            "purged_by": recruiter_id,
            "original_stage": candidate.get('stage')
        }
        
        # Store anonymized data
        await db.anonymized_candidates.insert_one(anonymized_data)
        
        # Delete from all collections
        deleted_count = await db.candidates.delete_one({"id": candidate_id})
        await db.scorecards.delete_many({"candidate_id": candidate_id})
        await db.interview_schedules.delete_many({"candidate_id": candidate_id})
        
        # Also delete any stored resume files (if using S3)
        if candidate.get('resume_url'):
            s3_manager.delete_file(candidate['resume_url'])
        
        # Create audit log
        audit_log = {
            "id": str(uuid.uuid4()),
            "event_type": "data_purge",
            "candidate_id": candidate_id,
            "recruiter_id": recruiter_id,
            "timestamp": datetime.now(timezone.utc),
            "details": {
                "candidate_name_hash": hash(candidate.get('name', '')),
                "pii_fields_deleted": ["name", "email", "phone", "resume_url", "resume_text"],
                "related_records_deleted": {
                    "candidates": deleted_count.deleted_count,
                    "scorecards": "all",
                    "interviews": "all"
                }
            }
        }
        await db.audit_logs.insert_one(audit_log)
        
        logger.info(f"PII purged for candidate {candidate_id} by recruiter {recruiter_id}")
        
        return {
            "success": True,
            "candidate_id": candidate_id,
            "purged_at": audit_log['timestamp'],
            "audit_log_id": audit_log['id']
        }


# Email templates for onboarding
class OnboardingEmailTemplate:
    """Email template for appointment letter"""
    
    @staticmethod
    def render_html(data: Dict[str, Any]) -> str:
        """Generate HTML email for onboarding"""
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #2e7d32; color: white; padding: 30px; text-align: center; }}
                .content {{ padding: 30px 20px; background-color: #f9f9f9; }}
                .highlight {{ background-color: #e8f5e9; padding: 20px; border-left: 4px solid #2e7d32; margin: 20px 0; }}
                .footer {{ background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666; }}
                .button {{ display: inline-block; padding: 12px 30px; background-color: #2e7d32; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }}
                .details-table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
                .details-table td {{ padding: 10px; border-bottom: 1px solid #ddd; }}
                .details-table td:first-child {{ font-weight: bold; width: 40%; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Congratulations!</h1>
                    <h2>Welcome to Our Company</h2>
                </div>
                <div class="content">
                    <p>Dear <strong>{data['candidate_name']}</strong>,</p>
                    
                    <p>We are thrilled to offer you the position of <strong>{data['designation']}</strong> at Our Company!</p>
                    
                    <div class="highlight">
                        <h3>Your Journey Starts Here</h3>
                        <p>Please find your official Letter of Appointment attached to this email. This document contains all the details of your employment, including compensation, benefits, and terms of service.</p>
                    </div>
                    
                    <h3>Key Details</h3>
                    <table class="details-table">
                        <tr>
                            <td>Position</td>
                            <td>{data['designation']}</td>
                        </tr>
                        <tr>
                            <td>Department</td>
                            <td>{data['department']}</td>
                        </tr>
                        <tr>
                            <td>Joining Date</td>
                            <td>{data['joining_date']}</td>
                        </tr>
                        <tr>
                            <td>Work Location</td>
                            <td>{data['work_location']}</td>
                        </tr>
                        <tr>
                            <td>Reporting Manager</td>
                            <td>{data['reporting_manager']}</td>
                        </tr>
                        <tr>
                            <td>Annual CTC</td>
                            <td>INR {data['ctc_annual']:,.2f}</td>
                        </tr>
                    </table>
                    
                    <h3>Next Steps</h3>
                    <ol>
                        <li><strong>Review & Sign:</strong> Please review the attached appointment letter carefully, sign it, and send a scanned copy to hr@company.com</li>
                        <li><strong>Document Submission:</strong> Prepare the documents mentioned in the letter (PAN, Aadhaar, certificates, etc.)</li>
                        <li><strong>Background Verification:</strong> You will receive a separate email from our verification partner</li>
                        <li><strong>Pre-Joining Formalities:</strong> Our HR team will reach out to you for address verification and other formalities</li>
                    </ol>
                    
                    <div class="highlight">
                        <p><strong>Important:</strong> Please confirm your acceptance by replying to this email within 3 business days.</p>
                    </div>
                    
                    <p>If you have any questions, please don't hesitate to reach out to our HR team.</p>
                    
                    <p>We look forward to having you on board!</p>
                    
                    <p>Warm regards,<br>
                    <strong>HR Team</strong><br>
                    Our Company</p>
                </div>
                <div class="footer">
                    <p>This is an official communication from Our Company.</p>
                    <p>&copy; {datetime.now().year} Our Company. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        return html

class InterviewEmailTemplate:
    """Email template for interview scheduling"""
    
    @staticmethod
    def render_html(data: Dict[str, Any]) -> str:
        """Generate HTML email for interview invitation"""
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #1976d2; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 30px 20px; }}
                .info-box {{ background-color: #e3f2fd; padding: 20px; border-left: 4px solid #1976d2; margin: 20px 0; }}
                .details-table {{ width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #f9f9f9; }}
                .details-table td {{ padding: 12px; border-bottom: 1px solid #ddd; }}
                .details-table td:first-child {{ font-weight: bold; width: 40%; background-color: #e3f2fd; }}
                .button {{ display: inline-block; padding: 12px 30px; background-color: #1976d2; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }}
                .footer {{ background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>Interview Scheduled</h2>
                </div>
                <div class="content">
                    <p>Dear <strong>{data['candidate_name']}</strong>,</p>
                    
                    <p>Your interview for the position of <strong>{data['job_title']}</strong> has been scheduled.</p>
                    
                    <div class="info-box">
                        <h3>📅 Interview Details</h3>
                    </div>
                    
                    <table class="details-table">
                        <tr>
                            <td>Interview Type</td>
                            <td>{data['interview_type']}</td>
                        </tr>
                        <tr>
                            <td>Date & Time</td>
                            <td>{data['start_time_formatted']} (IST)</td>
                        </tr>
                        <tr>
                            <td>Duration</td>
                            <td>{data['duration_minutes']} minutes</td>
                        </tr>
                        <tr>
                            <td>Interviewer</td>
                            <td>{data['interviewer_name']}</td>
                        </tr>
                        {f"<tr><td>Meeting Link</td><td><a href='{data['meeting_url']}'>{data['meeting_url']}</a></td></tr>" if data.get('meeting_url') else ""}
                    </table>
                    
                    <div class="info-box">
                        <h4>What to Prepare:</h4>
                        <ul>
                            <li>Review your resume and be ready to discuss your experience</li>
                            <li>Research about our company and the role</li>
                            <li>Prepare questions you'd like to ask the interviewer</li>
                            <li>Ensure you have a stable internet connection (for virtual interviews)</li>
                            <li>Join the meeting 5 minutes early</li>
                        </ul>
                    </div>
                    
                    <p><strong>Calendar Invite:</strong> A calendar invite (.ics file) is attached to this email. Please add it to your calendar.</p>
                    
                    <p>If you need to reschedule, please inform us at least 24 hours in advance.</p>
                    
                    <p>We look forward to speaking with you!</p>
                    
                    <p>Best regards,<br>
                    <strong>Recruitment Team</strong><br>
                    Our Company</p>
                </div>
                <div class="footer">
                    <p>This is an automated email. For any queries, please contact hr@company.com</p>
                </div>
            </div>
        </body>
        </html>
        """
        return html
