"""
Emergent Integration Module
Handles offer management, statutory compliance, and employee master export
"""

from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field, validator
from datetime import datetime, timezone
import uuid
import csv
import io
import base64
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.units import inch

# ============= MODELS =============

class EmergentSalaryComponents(BaseModel):
    """Emergent-specific salary breakup components"""
    basic: float = 0  # Basic Salary
    hra: float = 0  # House Rent Allowance
    conveyance: float = 0  # Conveyance Allowance
    special_allowance: float = 0  # Special Allowance
    lta: float = 0  # Leave Travel Allowance
    employer_pf: float = 0  # Employer PF Contribution
    
    @property
    def gross_salary(self) -> float:
        """Calculate gross salary (excluding employer PF)"""
        return self.basic + self.hra + self.conveyance + self.special_allowance + self.lta
    
    @property
    def ctc(self) -> float:
        """Calculate total CTC (including employer PF)"""
        return self.gross_salary + self.employer_pf
    
    def to_dict(self) -> Dict[str, float]:
        return {
            "Basic Salary": self.basic,
            "House Rent Allowance (HRA)": self.hra,
            "Conveyance Allowance": self.conveyance,
            "Special Allowance": self.special_allowance,
            "Leave Travel Allowance (LTA)": self.lta,
            "Employer PF Contribution": self.employer_pf
        }

class StatutoryCompliance(BaseModel):
    """Statutory and compliance data for Emergent sync"""
    pan: Optional[str] = None  # PAN Card
    aadhaar_masked: Optional[str] = None  # Last 4 digits only
    uan: Optional[str] = None  # Universal Account Number (PF)
    esic_number: Optional[str] = None  # ESIC Number
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_branch: Optional[str] = None
    bank_name: Optional[str] = None
    
    @validator('pan')
    def validate_pan(cls, v):
        if v and len(v) != 10:
            raise ValueError('PAN must be 10 characters')
        return v.upper() if v else v
    
    @validator('aadhaar_masked')
    def validate_aadhaar(cls, v):
        if v and len(v) != 4:
            raise ValueError('Aadhaar should be last 4 digits only')
        return v
    
    @validator('bank_ifsc')
    def validate_ifsc(cls, v):
        if v and len(v) != 11:
            raise ValueError('IFSC code must be 11 characters')
        return v.upper() if v else v
    
    def is_ready_for_emergent(self) -> bool:
        """Check if all mandatory fields are filled"""
        return all([
            self.pan,
            self.aadhaar_masked,
            self.uan,
            self.bank_account_number,
            self.bank_ifsc,
            self.bank_name
        ])

class OfferLetterRequest(BaseModel):
    """Request to generate offer letter with Emergent components"""
    candidate_id: str
    designation: str
    department: str
    work_location: str
    joining_date: str  # YYYY-MM-DD
    salary_components: EmergentSalaryComponents
    reporting_manager: str
    probation_months: int = 6
    notice_period_days: int = 30
    send_email: bool = True

class EmergentEmployeeExport(BaseModel):
    """Employee data formatted for Emergent import"""
    employee_id: str
    first_name: str
    last_name: str
    email: str
    phone: str
    designation: str
    department: str
    joining_date: str  # DD/MM/YYYY
    work_location: str
    reporting_manager: str
    
    # Salary components
    basic: float
    hra: float
    conveyance: float
    special_allowance: float
    lta: float
    employer_pf: float
    gross_salary: float
    ctc: float
    
    # Statutory details
    pan: str
    aadhaar_last_4: str
    uan: str
    esic_number: Optional[str]
    bank_account_number: str
    bank_ifsc: str
    bank_branch: str
    bank_name: str
    
    # Employment details
    probation_months: int
    notice_period_days: int
    employment_type: str = "Full Time"
    status: str = "Active"

class OfferLetterPDF:
    """Generate offer letter PDF with Emergent salary components"""
    
    @staticmethod
    def generate(data: Dict[str, Any]) -> bytes:
        """Generate offer letter PDF"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
        
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
        
        story = []
        
        # Header
        story.append(Paragraph("[COMPANY LOGO]", title_style))
        story.append(Spacer(1, 0.2*inch))
        story.append(Paragraph("OFFER LETTER", title_style))
        story.append(Spacer(1, 0.3*inch))
        
        # Date
        date_str = datetime.now().strftime("%B %d, %Y")
        story.append(Paragraph(f"<b>Date:</b> {date_str}", body_style))
        story.append(Paragraph(f"<b>Ref No:</b> HR/OFFER/{data['candidate_id'][:8].upper()}", body_style))
        story.append(Spacer(1, 0.3*inch))
        
        # Candidate details
        story.append(Paragraph(f"<b>{data['candidate_name']}</b>", body_style))
        story.append(Paragraph(f"{data['candidate_email']}", body_style))
        story.append(Spacer(1, 0.2*inch))
        
        # Main content
        story.append(Paragraph("Dear <b>" + data['candidate_name'] + "</b>,", body_style))
        story.append(Spacer(1, 0.15*inch))
        
        intro = f"""
        We are delighted to offer you the position of <b>{data['designation']}</b> in the 
        <b>{data['department']}</b> department at our <b>{data['work_location']}</b> office. 
        You will be reporting to <b>{data['reporting_manager']}</b>.
        """
        story.append(Paragraph(intro, body_style))
        story.append(Spacer(1, 0.2*inch))
        
        # Employment terms
        story.append(Paragraph("TERMS OF EMPLOYMENT", heading_style))
        
        terms_data = [
            ["<b>Position</b>", data['designation']],
            ["<b>Department</b>", data['department']],
            ["<b>Work Location</b>", data['work_location']],
            ["<b>Reporting To</b>", data['reporting_manager']],
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
        
        # Salary components (Annexure A)
        story.append(Paragraph("COMPENSATION STRUCTURE (Annexure A)", heading_style))
        story.append(Paragraph(f"Your Cost to Company (CTC) is <b>INR {data['ctc']:,.2f}</b> per annum:", body_style))
        story.append(Spacer(1, 0.1*inch))
        
        salary_data = [["<b>Component</b>", "<b>Annual (INR)</b>", "<b>Monthly (INR)</b>"]]
        for component, amount in data['salary_components'].items():
            monthly = amount / 12
            salary_data.append([component, f"{amount:,.2f}", f"{monthly:,.2f}"])
        
        # Add gross and CTC rows
        salary_data.append(["<b>Gross Salary</b>", f"<b>{data['gross_salary']:,.2f}</b>", f"<b>{data['gross_salary']/12:,.2f}</b>"])
        salary_data.append(["<b>Total CTC</b>", f"<b>{data['ctc']:,.2f}</b>", f"<b>{data['ctc']/12:,.2f}</b>"])
        
        salary_table = Table(salary_data, colWidths=[2.5*inch, 2*inch, 2*inch])
        salary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2e7d32')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('FONTNAME', (0, 1), (-1, -3), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -3), 9),
            ('BACKGROUND', (0, 1), (-1, -3), colors.white),
            ('BACKGROUND', (0, -2), (-1, -2), colors.HexColor('#e8f5e9')),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#c8e6c9')),
            ('FONTNAME', (0, -2), (-1, -1), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(salary_table)
        story.append(Spacer(1, 0.2*inch))
        
        # Note about deductions
        note = """
        <i>Note: The above salary is subject to deductions as per Income Tax Act 1961, 
        Provident Fund Act 1952, and other applicable statutory requirements.</i>
        """
        story.append(Paragraph(note, body_style))
        story.append(Spacer(1, 0.3*inch))
        
        # Acceptance
        story.append(Paragraph("ACCEPTANCE", heading_style))
        acceptance = f"""
        Please sign and return this letter by <b>{data['acceptance_deadline']}</b> to confirm your acceptance.
        Upon acceptance, you will receive further communication regarding pre-joining formalities including 
        document submission (PAN, Aadhaar, UAN, Bank details, etc.).
        """
        story.append(Paragraph(acceptance, body_style))
        story.append(Spacer(1, 0.5*inch))
        
        story.append(Paragraph("We look forward to welcoming you to our team!", body_style))
        story.append(Spacer(1, 0.5*inch))
        
        story.append(Paragraph("Sincerely,", body_style))
        story.append(Spacer(1, 0.8*inch))
        story.append(Paragraph("_________________________", body_style))
        story.append(Paragraph("<b>HR Manager</b>", body_style))
        
        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()

class EmergentExportService:
    """Export candidate data in Emergent Employee Master format"""
    
    @staticmethod
    def generate_csv(employees: List[EmergentEmployeeExport]) -> bytes:
        """Generate CSV file for Emergent import"""
        output = io.StringIO()
        
        # Define headers matching Emergent format
        headers = [
            'Employee ID',
            'First Name',
            'Last Name',
            'Email',
            'Phone',
            'Designation',
            'Department',
            'Joining Date',
            'Work Location',
            'Reporting Manager',
            'Basic Salary',
            'HRA',
            'Conveyance Allowance',
            'Special Allowance',
            'LTA',
            'Employer PF',
            'Gross Salary',
            'CTC',
            'PAN',
            'Aadhaar (Last 4)',
            'UAN',
            'ESIC Number',
            'Bank Account Number',
            'Bank IFSC',
            'Bank Branch',
            'Bank Name',
            'Probation (Months)',
            'Notice Period (Days)',
            'Employment Type',
            'Status'
        ]
        
        writer = csv.DictWriter(output, fieldnames=headers)
        writer.writeheader()
        
        for emp in employees:
            writer.writerow({
                'Employee ID': emp.employee_id,
                'First Name': emp.first_name,
                'Last Name': emp.last_name,
                'Email': emp.email,
                'Phone': emp.phone,
                'Designation': emp.designation,
                'Department': emp.department,
                'Joining Date': emp.joining_date,
                'Work Location': emp.work_location,
                'Reporting Manager': emp.reporting_manager,
                'Basic Salary': emp.basic,
                'HRA': emp.hra,
                'Conveyance Allowance': emp.conveyance,
                'Special Allowance': emp.special_allowance,
                'LTA': emp.lta,
                'Employer PF': emp.employer_pf,
                'Gross Salary': emp.gross_salary,
                'CTC': emp.ctc,
                'PAN': emp.pan,
                'Aadhaar (Last 4)': emp.aadhaar_last_4,
                'UAN': emp.uan,
                'ESIC Number': emp.esic_number or '',
                'Bank Account Number': emp.bank_account_number,
                'Bank IFSC': emp.bank_ifsc,
                'Bank Branch': emp.bank_branch,
                'Bank Name': emp.bank_name,
                'Probation (Months)': emp.probation_months,
                'Notice Period (Days)': emp.notice_period_days,
                'Employment Type': emp.employment_type,
                'Status': emp.status
            })
        
        output.seek(0)
        return output.getvalue().encode('utf-8')

class OfferEmailTemplate:
    """Email template for offer letter"""
    
    @staticmethod
    def render_html(data: Dict[str, Any]) -> str:
        """Generate HTML email for offer"""
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #2e7d32 0%, #4caf50 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ padding: 30px 20px; background-color: #f9f9f9; }}
                .highlight {{ background-color: #e8f5e9; padding: 20px; border-left: 4px solid #2e7d32; margin: 20px 0; border-radius: 4px; }}
                .salary-box {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
                .footer {{ background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }}
                .ctc {{ font-size: 32px; font-weight: bold; color: #2e7d32; text-align: center; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0; font-size: 28px;">🎉 Congratulations!</h1>
                    <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">You have an offer from Our Company</p>
                </div>
                
                <div class="content">
                    <p style="font-size: 16px;">Dear <strong>{data['candidate_name']}</strong>,</p>
                    
                    <div class="highlight">
                        <h2 style="margin-top: 0; color: #2e7d32;">We're excited to offer you the role!</h2>
                        <p style="margin: 0;"><strong>Position:</strong> {data['designation']}</p>
                        <p style="margin: 5px 0;"><strong>Department:</strong> {data['department']}</p>
                        <p style="margin: 5px 0;"><strong>Location:</strong> {data['work_location']}</p>
                        <p style="margin: 5px 0 0 0;"><strong>Joining Date:</strong> {data['joining_date']}</p>
                    </div>
                    
                    <div class="salary-box">
                        <h3 style="margin-top: 0; text-align: center; color: #555;">Your Package</h3>
                        <div class="ctc">₹ {data['ctc']:,.0f}</div>
                        <p style="text-align: center; color: #666; margin: 0;">Cost to Company (Annual)</p>
                    </div>
                    
                    <h3 style="color: #2e7d32;">What's Next?</h3>
                    <ol style="padding-left: 20px;">
                        <li style="margin-bottom: 10px;"><strong>Review the attached offer letter</strong> carefully</li>
                        <li style="margin-bottom: 10px;"><strong>Sign and return</strong> by {data['acceptance_deadline']}</li>
                        <li style="margin-bottom: 10px;"><strong>Prepare documents:</strong> PAN, Aadhaar, UAN, Bank details, certificates</li>
                        <li style="margin-bottom: 10px;"><strong>Complete pre-joining formalities</strong> (we'll guide you)</li>
                    </ol>
                    
                    <div class="highlight">
                        <p style="margin: 0;"><strong>⏰ Action Required:</strong> Please confirm your acceptance within 3 business days.</p>
                    </div>
                    
                    <p>If you have any questions, feel free to reach out to our HR team.</p>
                    
                    <p style="margin-top: 30px;">Welcome to the team!<br>
                    <strong>HR Department</strong></p>
                </div>
                
                <div class="footer">
                    <p style="margin: 0;">This is an official offer from Our Company</p>
                    <p style="margin: 5px 0 0 0;">&copy; {datetime.now().year} Our Company. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        return html
