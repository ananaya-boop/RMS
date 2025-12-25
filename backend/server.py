from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import PyPDF2
from docx import Document
import io
import re
import asyncio
import resend
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.units import inch
import tempfile

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Resend configuration
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

# Security
security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ============= MODELS =============

class UserRole(str):
    ADMIN = "admin"
    RECRUITER = "recruiter"
    HIRING_MANAGER = "hiring_manager"
    DPO = "dpo"

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    role: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "recruiter"

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class JobRequisition(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    department: str
    location: str
    description: str
    requirements: List[str]
    status: str = "active"  # active, closed, on_hold
    created_by: str
    hiring_manager: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class JobCreate(BaseModel):
    title: str
    department: str
    location: str
    description: str
    requirements: List[str]
    hiring_manager: Optional[str] = None

class CandidateStage(str):
    SOURCED = "sourced"
    SCREENED = "screened"
    TECHNICAL = "technical"
    HR_ROUND = "hr_round"
    OFFER = "offer"
    ONBOARDING = "onboarding"
    DECLINED = "declined"  # Pending rejection - in declined sidebar
    REJECTED = "rejected"  # Fully rejected and purged

class ConsentLog(BaseModel):
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ip_address: Optional[str] = None
    method: str  # "form_upload", "email_confirmation"
    consent_given: bool

class SensitiveData(BaseModel):
    pan: Optional[str] = None
    aadhaar_masked: Optional[str] = None  # Store only last 4 digits
    uan: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None

class Candidate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    job_id: str
    name: str
    email: EmailStr
    phone: Optional[str] = None
    skills: List[str] = []
    experience_years: Optional[int] = None
    resume_url: Optional[str] = None
    resume_text: Optional[str] = None
    stage: str = CandidateStage.SOURCED
    consent_log: Optional[ConsentLog] = None
    posh_reports: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    stage_history: List[Dict[str, Any]] = []

class CandidateCreate(BaseModel):
    job_id: str
    name: str
    email: EmailStr
    phone: Optional[str] = None
    skills: List[str] = []
    experience_years: Optional[int] = None

class StageUpdate(BaseModel):
    stage: str

class Scorecard(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    candidate_id: str
    interviewer_name: str
    interviewer_email: EmailStr
    round_name: str  # "Technical", "HR", etc.
    rating: int  # 1-5
    feedback: str
    recommendation: str  # "strong_hire", "hire", "no_hire"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ScorecardCreate(BaseModel):
    candidate_id: str
    interviewer_name: str
    interviewer_email: EmailStr
    round_name: str
    rating: int
    feedback: str
    recommendation: str

class POSHReport(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    candidate_id: str
    reported_by: str
    incident_type: str
    description: str
    action_taken: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class POSHReportCreate(BaseModel):
    candidate_id: str
    incident_type: str
    description: str

class InterviewSchedule(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    candidate_id: str
    job_id: str
    interviewer_user_id: str
    interviewer_name: str
    interviewer_email: EmailStr
    interview_type: str  # Screening, Technical, HR Round, Final
    start_time: datetime
    end_time: datetime
    duration_minutes: int
    meeting_url: Optional[str] = None
    status: str = "scheduled"  # scheduled, completed, cancelled
    include_resume: bool = True
    include_scorecard_link: bool = True
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ScheduleCreate(BaseModel):
    candidate_id: str
    job_id: str
    interviewer_user_id: str
    interview_type: str
    start_time: datetime
    duration_minutes: int
    meeting_url: Optional[str] = None
    include_resume: bool = True
    include_scorecard_link: bool = True

class WithdrawalRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    candidate_id: str
    reason: str  # Better Offer, Process Speed, Role Mismatch, Personal Reasons
    purge_immediately: bool = False
    status: str = "pending"  # pending, completed
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    processed_at: Optional[datetime] = None

class WithdrawalCreate(BaseModel):
    candidate_id: str
    reason: str
    purge_immediately: bool = False

class AppointmentLetter(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    candidate_id: str
    designation: str
    joining_date: datetime
    ctc_annual: float
    ctc_breakup: Dict[str, float]  # {"basic": 500000, "hra": 200000, "bonus": 100000}
    reporting_manager: str
    work_location: str
    pdf_url: Optional[str] = None
    email_sent: bool = False
    sent_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AppointmentLetterCreate(BaseModel):
    candidate_id: str
    designation: str
    joining_date: datetime
    ctc_annual: float
    ctc_breakup: Dict[str, float]
    reporting_manager: str
    work_location: str

class EmailRequest(BaseModel):
    recipient_email: EmailStr
    subject: str
    html_content: str

# ============= HELPER FUNCTIONS =============

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_token(token)
    user_email = payload.get("sub")
    if not user_email:
        raise HTTPException(status_code=401, detail="Invalid authentication")
    
    user = await db.users.find_one({"email": user_email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user)

def parse_resume_text(file_content: bytes, filename: str) -> str:
    """Extract text from PDF or DOCX files"""
    try:
        if filename.endswith('.pdf'):
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text()
            return text
        elif filename.endswith('.docx'):
            doc = Document(io.BytesIO(file_content))
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
            return text
        else:
            return ""
    except Exception as e:
        logging.error(f"Error parsing resume: {str(e)}")
        return ""

def extract_candidate_info(text: str) -> Dict[str, Any]:
    """Extract name, email, phone, skills from resume text"""
    info = {
        "email": None,
        "phone": None,
        "skills": []
    }
    
    # Extract email
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    emails = re.findall(email_pattern, text)
    if emails:
        info["email"] = emails[0]
    
    # Extract phone (Indian format)
    phone_pattern = r'(?:\+91|91)?[\s-]?[6-9]\d{9}'
    phones = re.findall(phone_pattern, text)
    if phones:
        info["phone"] = phones[0].strip()
    
    # Extract common skills
    common_skills = [
        "Python", "Java", "JavaScript", "React", "Node.js", "MongoDB", "SQL",
        "AWS", "Docker", "Kubernetes", "FastAPI", "Django", "Flask",
        "Machine Learning", "Data Science", "AI", "DevOps", "CI/CD"
    ]
    found_skills = []
    text_lower = text.lower()
    for skill in common_skills:
        if skill.lower() in text_lower:
            found_skills.append(skill)
    info["skills"] = found_skills
    
    return info

# ============= AUTH ROUTES =============

@api_router.post("/auth/register", response_model=User)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    hashed_password = bcrypt.hashpw(user_data.password.encode('utf-8'), bcrypt.gensalt())
    
    user_dict = user_data.model_dump(exclude={"password"})
    user_obj = User(**user_dict)
    
    doc = user_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['password_hash'] = hashed_password.decode('utf-8')
    
    await db.users.insert_one(doc)
    return user_obj

@api_router.post("/auth/login")
async def login(login_data: LoginRequest):
    user = await db.users.find_one({"email": login_data.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    if not bcrypt.checkpw(login_data.password.encode('utf-8'), user['password_hash'].encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create access token
    access_token = create_access_token({"sub": user['email'], "role": user['role']})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user['id'],
            "email": user['email'],
            "name": user['name'],
            "role": user['role']
        }
    }

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# ============= JOB ROUTES =============

@api_router.post("/jobs", response_model=JobRequisition)
async def create_job(job_data: JobCreate, current_user: User = Depends(get_current_user)):
    job_dict = job_data.model_dump()
    job_dict['created_by'] = current_user.id
    job_obj = JobRequisition(**job_dict)
    
    doc = job_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.jobs.insert_one(doc)
    return job_obj

@api_router.get("/jobs", response_model=List[JobRequisition])
async def get_jobs(current_user: User = Depends(get_current_user)):
    jobs = await db.jobs.find({}, {"_id": 0}).to_list(1000)
    
    for job in jobs:
        if isinstance(job['created_at'], str):
            job['created_at'] = datetime.fromisoformat(job['created_at'])
    
    return jobs

@api_router.get("/jobs/{job_id}", response_model=JobRequisition)
async def get_job(job_id: str, current_user: User = Depends(get_current_user)):
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if isinstance(job['created_at'], str):
        job['created_at'] = datetime.fromisoformat(job['created_at'])
    
    return JobRequisition(**job)

# ============= CANDIDATE ROUTES =============

@api_router.post("/candidates", response_model=Candidate)
async def create_candidate(candidate_data: CandidateCreate, current_user: User = Depends(get_current_user)):
    candidate_obj = Candidate(**candidate_data.model_dump())
    candidate_obj.consent_log = ConsentLog(
        method="manual_entry",
        consent_given=True
    )
    
    doc = candidate_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    if doc['consent_log']:
        doc['consent_log']['timestamp'] = doc['consent_log']['timestamp'].isoformat()
    
    await db.candidates.insert_one(doc)
    return candidate_obj

@api_router.get("/candidates", response_model=List[Candidate])
async def get_candidates(job_id: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {}
    if job_id:
        query['job_id'] = job_id
    
    candidates = await db.candidates.find(query, {"_id": 0}).to_list(1000)
    
    for candidate in candidates:
        if isinstance(candidate['created_at'], str):
            candidate['created_at'] = datetime.fromisoformat(candidate['created_at'])
        if isinstance(candidate['updated_at'], str):
            candidate['updated_at'] = datetime.fromisoformat(candidate['updated_at'])
        if candidate.get('consent_log') and isinstance(candidate['consent_log'].get('timestamp'), str):
            candidate['consent_log']['timestamp'] = datetime.fromisoformat(candidate['consent_log']['timestamp'])
    
    return candidates

@api_router.get("/candidates/{candidate_id}", response_model=Candidate)
async def get_candidate(candidate_id: str, current_user: User = Depends(get_current_user)):
    candidate = await db.candidates.find_one({"id": candidate_id}, {"_id": 0})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    if isinstance(candidate['created_at'], str):
        candidate['created_at'] = datetime.fromisoformat(candidate['created_at'])
    if isinstance(candidate['updated_at'], str):
        candidate['updated_at'] = datetime.fromisoformat(candidate['updated_at'])
    if candidate.get('consent_log') and isinstance(candidate['consent_log'].get('timestamp'), str):
        candidate['consent_log']['timestamp'] = datetime.fromisoformat(candidate['consent_log']['timestamp'])
    
    return Candidate(**candidate)

@api_router.put("/candidates/{candidate_id}/stage", response_model=Candidate)
async def update_candidate_stage(candidate_id: str, stage_data: StageUpdate, current_user: User = Depends(get_current_user)):
    candidate = await db.candidates.find_one({"id": candidate_id}, {"_id": 0})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Add to stage history
    stage_history = candidate.get('stage_history', [])
    stage_history.append({
        "stage": stage_data.stage,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "updated_by": current_user.email
    })
    
    await db.candidates.update_one(
        {"id": candidate_id},
        {
            "$set": {
                "stage": stage_data.stage,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "stage_history": stage_history
            }
        }
    )
    
    updated_candidate = await db.candidates.find_one({"id": candidate_id}, {"_id": 0})
    
    if isinstance(updated_candidate['created_at'], str):
        updated_candidate['created_at'] = datetime.fromisoformat(updated_candidate['created_at'])
    if isinstance(updated_candidate['updated_at'], str):
        updated_candidate['updated_at'] = datetime.fromisoformat(updated_candidate['updated_at'])
    if updated_candidate.get('consent_log') and isinstance(updated_candidate['consent_log'].get('timestamp'), str):
        updated_candidate['consent_log']['timestamp'] = datetime.fromisoformat(updated_candidate['consent_log']['timestamp'])
    
    return Candidate(**updated_candidate)

@api_router.post("/candidates/upload-resume")
async def upload_resume(file: UploadFile = File(...), job_id: str = "", current_user: User = Depends(get_current_user)):
    if not file.filename.endswith(('.pdf', '.docx')):
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported")
    
    # Read file content
    content = await file.read()
    
    # Parse resume
    resume_text = parse_resume_text(content, file.filename)
    if not resume_text:
        raise HTTPException(status_code=400, detail="Could not parse resume")
    
    # Extract candidate info
    candidate_info = extract_candidate_info(resume_text)
    
    # Extract name (first line or first few words)
    lines = [line.strip() for line in resume_text.split('\n') if line.strip()]
    name = lines[0] if lines else "Unknown"
    
    # Create candidate
    candidate_obj = Candidate(
        job_id=job_id,
        name=name,
        email=candidate_info.get('email') or f"candidate_{uuid.uuid4().hex[:8]}@example.com",
        phone=candidate_info.get('phone'),
        skills=candidate_info.get('skills', []),
        resume_text=resume_text[:5000],  # Store first 5000 chars
        resume_url=file.filename
    )
    
    candidate_obj.consent_log = ConsentLog(
        method="resume_upload",
        consent_given=True
    )
    
    doc = candidate_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    if doc['consent_log']:
        doc['consent_log']['timestamp'] = doc['consent_log']['timestamp'].isoformat()
    
    await db.candidates.insert_one(doc)
    
    return {
        "success": True,
        "candidate_id": candidate_obj.id,
        "parsed_data": {
            "name": name,
            "email": candidate_info.get('email'),
            "phone": candidate_info.get('phone'),
            "skills": candidate_info.get('skills', [])
        }
    }

@api_router.post("/candidates/{candidate_id}/reject-and-purge")
async def reject_and_purge_candidate(candidate_id: str, current_user: User = Depends(get_current_user)):
    """
    Final rejection with data purge and automated email notification.
    This is called after the recruiter confirms rejection from the declined sidebar.
    """
    # Get candidate data before deletion for email
    candidate = await db.candidates.find_one({"id": candidate_id}, {"_id": 0})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Get job details for email
    job = await db.jobs.find_one({"id": candidate['job_id']}, {"_id": 0})
    job_title = job['title'] if job else "the position"
    
    # Create audit log entry BEFORE deletion
    audit_log = {
        "id": str(uuid.uuid4()),
        "action": "candidate_purged",
        "candidate_id": candidate_id,
        "candidate_email": candidate['email'],
        "candidate_name": candidate['name'],
        "performed_by": current_user.email,
        "performed_by_name": current_user.name,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "reason": "Rejected by recruiter"
    }
    await db.audit_logs.insert_one(audit_log)
    
    # Send rejection email if Resend is configured
    if RESEND_API_KEY:
        email_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #1e1b4b; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background-color: #f8fafc; }}
                .footer {{ padding: 20px; text-align: center; font-size: 12px; color: #666; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>Application Status Update</h2>
                </div>
                <div class="content">
                    <p>Dear {candidate['name']},</p>
                    
                    <p>Thank you for your interest in the <strong>{job_title}</strong> position and for taking the time to apply with us.</p>
                    
                    <p>After careful consideration, we regret to inform you that we will not be moving forward with your application at this time. This decision was not easy, as we received many qualified applications.</p>
                    
                    <p>We truly appreciate the time and effort you invested in the application process.</p>
                    
                    <p><strong>Privacy Notice:</strong> In compliance with the DPDP Act 2023 and our commitment to protecting your privacy, we have permanently deleted all your personal information from our recruitment system, including your resume and contact details.</p>
                    
                    <p>We wish you the very best in your job search and future career endeavors.</p>
                    
                    <p>Best regards,<br>The Recruitment Team</p>
                </div>
                <div class="footer">
                    <p>This is an automated message. Please do not reply to this email.</p>
                    <p>Your data has been deleted from our system as per DPDP Act 2023 compliance.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        try:
            params = {
                "from": SENDER_EMAIL,
                "to": [candidate['email']],
                "subject": f"Update regarding your application for {job_title}",
                "html": email_html
            }
            await asyncio.to_thread(resend.Emails.send, params)
            logging.info(f"Rejection email sent to {candidate['email']}")
        except Exception as e:
            logging.error(f"Failed to send rejection email: {str(e)}")
            # Continue with deletion even if email fails
    
    # Hard delete candidate and all related data
    await db.candidates.delete_one({"id": candidate_id})
    await db.scorecards.delete_many({"candidate_id": candidate_id})
    await db.posh_reports.delete_many({"candidate_id": candidate_id})
    await db.sensitive_data.delete_one({"candidate_id": candidate_id})
    
    return {
        "success": True,
        "message": "Candidate rejected, data purged, and notification sent",
        "audit_log_id": audit_log['id']
    }

@api_router.post("/candidates/{candidate_id}/restore-to-sourced")
async def restore_candidate_to_sourced(candidate_id: str, current_user: User = Depends(get_current_user)):
    """Restore a declined candidate back to the Sourced stage"""
    candidate = await db.candidates.find_one({"id": candidate_id}, {"_id": 0})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    if candidate['stage'] != 'declined':
        raise HTTPException(status_code=400, detail="Only declined candidates can be restored")
    
    # Update stage to sourced
    stage_history = candidate.get('stage_history', [])
    stage_history.append({
        "stage": "sourced",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "updated_by": current_user.email,
        "action": "restored_from_declined"
    })
    
    await db.candidates.update_one(
        {"id": candidate_id},
        {
            "$set": {
                "stage": "sourced",
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "stage_history": stage_history
            }
        }
    )
    
    return {"success": True, "message": "Candidate restored to Sourced stage"}

@api_router.delete("/candidates/{candidate_id}/purge")
async def purge_candidate(candidate_id: str, current_user: User = Depends(get_current_user)):
    """DPDP Act - Right to Erasure (Direct purge without rejection flow)"""
    if current_user.role not in ["admin", "dpo"]:
        raise HTTPException(status_code=403, detail="Only Admin or DPO can purge data")
    
    candidate = await db.candidates.find_one({"id": candidate_id}, {"_id": 0})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Create audit log
    audit_log = {
        "id": str(uuid.uuid4()),
        "action": "direct_purge",
        "candidate_id": candidate_id,
        "candidate_email": candidate['email'],
        "candidate_name": candidate['name'],
        "performed_by": current_user.email,
        "performed_by_name": current_user.name,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "reason": "Admin/DPO direct purge (DPDP Act compliance)"
    }
    await db.audit_logs.insert_one(audit_log)
    
    # Delete candidate and related data
    await db.candidates.delete_one({"id": candidate_id})
    await db.scorecards.delete_many({"candidate_id": candidate_id})
    await db.posh_reports.delete_many({"candidate_id": candidate_id})
    await db.sensitive_data.delete_one({"candidate_id": candidate_id})
    
    return {"success": True, "message": "Candidate data permanently deleted"}

@api_router.get("/candidates/{candidate_id}/export")
async def export_candidate_data(candidate_id: str, current_user: User = Depends(get_current_user)):
    """DPDP Act - Data Portability"""
    candidate = await db.candidates.find_one({"id": candidate_id}, {"_id": 0})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    scorecards = await db.scorecards.find({"candidate_id": candidate_id}, {"_id": 0}).to_list(100)
    sensitive_data = await db.sensitive_data.find_one({"candidate_id": candidate_id}, {"_id": 0})
    
    export_data = {
        "candidate": candidate,
        "scorecards": scorecards,
        "sensitive_data": sensitive_data or {}
    }
    
    return export_data

# ============= SCORECARD ROUTES =============

@api_router.post("/scorecards", response_model=Scorecard)
async def create_scorecard(scorecard_data: ScorecardCreate, current_user: User = Depends(get_current_user)):
    scorecard_obj = Scorecard(**scorecard_data.model_dump())
    
    doc = scorecard_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.scorecards.insert_one(doc)
    return scorecard_obj

@api_router.get("/scorecards", response_model=List[Scorecard])
async def get_scorecards(candidate_id: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {}
    if candidate_id:
        query['candidate_id'] = candidate_id
    
    scorecards = await db.scorecards.find(query, {"_id": 0}).to_list(1000)
    
    for scorecard in scorecards:
        if isinstance(scorecard['created_at'], str):
            scorecard['created_at'] = datetime.fromisoformat(scorecard['created_at'])
    
    return scorecards

# ============= POSH ROUTES =============

@api_router.post("/posh-reports", response_model=POSHReport)
async def create_posh_report(report_data: POSHReportCreate, current_user: User = Depends(get_current_user)):
    report_dict = report_data.model_dump()
    report_dict['reported_by'] = current_user.email
    report_obj = POSHReport(**report_dict)
    
    doc = report_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.posh_reports.insert_one(doc)
    return report_obj

@api_router.get("/posh-reports", response_model=List[POSHReport])
async def get_posh_reports(current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "dpo"]:
        raise HTTPException(status_code=403, detail="Only Admin or DPO can view POSH reports")
    
    reports = await db.posh_reports.find({}, {"_id": 0}).to_list(1000)
    
    for report in reports:
        if isinstance(report['created_at'], str):
            report['created_at'] = datetime.fromisoformat(report['created_at'])
    
    return reports

# ============= INTERVIEW SCHEDULING =============

@api_router.post("/schedules", response_model=InterviewSchedule)
async def create_interview_schedule(schedule_data: ScheduleCreate, current_user: User = Depends(get_current_user)):
    """Schedule an interview with conflict detection and automated notifications"""
    
    # Get interviewer details
    interviewer = await db.users.find_one({"id": schedule_data.interviewer_user_id}, {"_id": 0})
    if not interviewer:
        raise HTTPException(status_code=404, detail="Interviewer not found")
    
    # Get candidate details
    candidate = await db.candidates.find_one({"id": schedule_data.candidate_id}, {"_id": 0})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Get job details
    job = await db.jobs.find_one({"id": schedule_data.job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Validate time is not in the past
    if schedule_data.start_time < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Cannot schedule interviews in the past")
    
    # Calculate end time
    end_time = schedule_data.start_time + timedelta(minutes=schedule_data.duration_minutes)
    
    # Check for interviewer conflicts
    conflicts = await db.schedules.find({
        "interviewer_user_id": schedule_data.interviewer_user_id,
        "status": "scheduled",
        "$or": [
            {
                "start_time": {"$lte": schedule_data.start_time.isoformat()},
                "end_time": {"$gte": schedule_data.start_time.isoformat()}
            },
            {
                "start_time": {"$lte": end_time.isoformat()},
                "end_time": {"$gte": end_time.isoformat()}
            },
            {
                "start_time": {"$gte": schedule_data.start_time.isoformat()},
                "end_time": {"$lte": end_time.isoformat()}
            }
        ]
    }).to_list(10)
    
    if conflicts:
        raise HTTPException(
            status_code=409, 
            detail=f"Interviewer {interviewer['name']} is already booked during this time slot"
        )
    
    # Create schedule object
    schedule_obj = InterviewSchedule(
        **schedule_data.model_dump(),
        interviewer_name=interviewer['name'],
        interviewer_email=interviewer['email'],
        end_time=end_time,
        created_by=current_user.id
    )
    
    doc = schedule_obj.model_dump()
    doc['start_time'] = doc['start_time'].isoformat()
    doc['end_time'] = doc['end_time'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.schedules.insert_one(doc)
    
    # Send confirmation email to candidate
    if RESEND_API_KEY:
        try:
            # Format date/time for email
            interview_datetime = schedule_data.start_time.strftime("%B %d, %Y at %I:%M %p UTC")
            
            # Build interviewer kit attachments info
            kit_info = ""
            if schedule_data.include_resume:
                kit_info += "<li>Your resume will be shared with the interviewer</li>"
            if schedule_data.include_scorecard_link:
                kit_info += "<li>Interview feedback scorecard will be provided</li>"
            
            email_html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background-color: #1e1b4b; color: white; padding: 20px; text-align: center; }}
                    .content {{ padding: 20px; background-color: #f8fafc; }}
                    .details-box {{ background-color: white; border-left: 4px solid #4f46e5; padding: 15px; margin: 15px 0; }}
                    .meeting-link {{ display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 15px 0; }}
                    .footer {{ padding: 20px; text-align: center; font-size: 12px; color: #666; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>Interview Scheduled!</h2>
                    </div>
                    <div class="content">
                        <p>Dear {candidate['name']},</p>
                        
                        <p>Great news! We would like to invite you for an interview for the <strong>{job['title']}</strong> position.</p>
                        
                        <div class="details-box">
                            <h3 style="margin-top: 0;">Interview Details</h3>
                            <p><strong>Interview Type:</strong> {schedule_data.interview_type}</p>
                            <p><strong>Date & Time:</strong> {interview_datetime}</p>
                            <p><strong>Duration:</strong> {schedule_data.duration_minutes} minutes</p>
                            <p><strong>Interviewer:</strong> {interviewer['name']}</p>
                        </div>
                        
                        {f'<a href="{schedule_data.meeting_url}" class="meeting-link">Join Meeting</a>' if schedule_data.meeting_url else '<p><em>Meeting link will be shared shortly.</em></p>'}
                        
                        {f'<ul>{kit_info}</ul>' if kit_info else ''}
                        
                        <p>Please confirm your availability by replying to this email. If you need to reschedule, please let us know as soon as possible.</p>
                        
                        <p>We look forward to speaking with you!</p>
                        
                        <p>Best regards,<br>The Recruitment Team</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated confirmation. Please reply to confirm your attendance.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            params = {
                "from": SENDER_EMAIL,
                "to": [candidate['email']],
                "subject": f"Interview Scheduled - {job['title']} at {interview_datetime}",
                "html": email_html
            }
            await asyncio.to_thread(resend.Emails.send, params)
            logging.info(f"Interview confirmation email sent to {candidate['email']}")
        except Exception as e:
            logging.error(f"Failed to send interview confirmation email: {str(e)}")
    
    return schedule_obj

@api_router.get("/schedules", response_model=List[InterviewSchedule])
async def get_schedules(
    candidate_id: Optional[str] = None,
    interviewer_user_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get interview schedules with optional filters"""
    query = {}
    if candidate_id:
        query['candidate_id'] = candidate_id
    if interviewer_user_id:
        query['interviewer_user_id'] = interviewer_user_id
    if status:
        query['status'] = status
    
    schedules = await db.schedules.find(query, {"_id": 0}).sort("start_time", -1).to_list(1000)
    
    for schedule in schedules:
        if isinstance(schedule['start_time'], str):
            schedule['start_time'] = datetime.fromisoformat(schedule['start_time'])
        if isinstance(schedule['end_time'], str):
            schedule['end_time'] = datetime.fromisoformat(schedule['end_time'])
        if isinstance(schedule['created_at'], str):
            schedule['created_at'] = datetime.fromisoformat(schedule['created_at'])
        if isinstance(schedule['updated_at'], str):
            schedule['updated_at'] = datetime.fromisoformat(schedule['updated_at'])
    
    return schedules

@api_router.put("/schedules/{schedule_id}/status")
async def update_schedule_status(
    schedule_id: str,
    status: str,
    current_user: User = Depends(get_current_user)
):
    """Update interview schedule status (scheduled, completed, cancelled)"""
    if status not in ["scheduled", "completed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.schedules.update_one(
        {"id": schedule_id},
        {
            "$set": {
                "status": status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    return {"success": True, "message": f"Schedule status updated to {status}"}

@api_router.get("/users/interviewers")
async def get_interviewers(current_user: User = Depends(get_current_user)):
    """Get list of users who can be interviewers (for searchable dropdown)"""
    interviewers = await db.users.find(
        {"role": {"$in": ["admin", "recruiter", "hiring_manager"]}},
        {"_id": 0, "id": 1, "name": 1, "email": 1, "role": 1}
    ).to_list(1000)
    
    return interviewers

# ============= APPOINTMENT LETTER AUTOMATION =============

@api_router.post("/candidates/{candidate_id}/generate-appointment-letter")
async def generate_appointment_letter(
    candidate_id: str,
    appointment_data: AppointmentLetterCreate,
    current_user: User = Depends(get_current_user)
):
    """
    Generate and send appointment letter when candidate is onboarded.
    Triggered when candidate moves to 'Onboarded' stage.
    """
    # Get candidate details
    candidate = await db.candidates.find_one({"id": candidate_id}, {"_id": 0})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Get job details
    job = await db.jobs.find_one({"id": candidate['job_id']}, {"_id": 0})
    company_name = "Talent Cockpit Inc."  # Can be made configurable
    
    # Create appointment letter object
    letter_obj = AppointmentLetter(**appointment_data.model_dump())
    
    # Generate PDF
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
    doc = SimpleDocTemplate(temp_file.name, pagesize=letter)
    story = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=20,
        textColor=colors.HexColor('#1e1b4b'),
        spaceAfter=20,
        alignment=1  # Center
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#1e1b4b'),
        spaceAfter=10
    )
    
    # Header
    story.append(Spacer(1, 0.5*inch))
    story.append(Paragraph(f"<b>{company_name}</b>", title_style))
    story.append(Paragraph("APPOINTMENT LETTER", title_style))
    story.append(Spacer(1, 0.3*inch))
    
    # Date
    story.append(Paragraph(f"Date: {datetime.now(timezone.utc).strftime('%B %d, %Y')}", styles['Normal']))
    story.append(Spacer(1, 0.2*inch))
    
    # Candidate details
    story.append(Paragraph(f"<b>{candidate['name']}</b>", styles['Normal']))
    story.append(Paragraph(candidate['email'], styles['Normal']))
    if candidate.get('phone'):
        story.append(Paragraph(candidate['phone'], styles['Normal']))
    story.append(Spacer(1, 0.3*inch))
    
    # Salutation
    story.append(Paragraph(f"Dear {candidate['name']},", styles['Normal']))
    story.append(Spacer(1, 0.2*inch))
    
    # Main content
    story.append(Paragraph("<b>Subject: Appointment as " + appointment_data.designation + "</b>", styles['Normal']))
    story.append(Spacer(1, 0.2*inch))
    
    content_text = f"""
    We are pleased to inform you that you have been selected for the position of <b>{appointment_data.designation}</b> 
    with {company_name}. We are confident that your skills and experience will be valuable assets to our team.
    """
    story.append(Paragraph(content_text, styles['Normal']))
    story.append(Spacer(1, 0.2*inch))
    
    # Terms of Employment
    story.append(Paragraph("<b>Terms of Employment:</b>", heading_style))
    
    terms_data = [
        ['Position:', appointment_data.designation],
        ['Joining Date:', appointment_data.joining_date.strftime('%B %d, %Y')],
        ['Work Location:', appointment_data.work_location],
        ['Reporting Manager:', appointment_data.reporting_manager],
        ['Annual CTC:', f"₹ {appointment_data.ctc_annual:,.2f}"],
    ]
    
    terms_table = Table(terms_data, colWidths=[2*inch, 4*inch])
    terms_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(terms_table)
    story.append(Spacer(1, 0.3*inch))
    
    # CTC Breakup
    story.append(Paragraph("<b>Salary Breakup (Annual):</b>", heading_style))
    
    ctc_data = [['Component', 'Amount (₹)']]
    for component, amount in appointment_data.ctc_breakup.items():
        ctc_data.append([component.replace('_', ' ').title(), f"₹ {amount:,.2f}"])
    ctc_data.append(['<b>Total CTC</b>', f"<b>₹ {appointment_data.ctc_annual:,.2f}</b>"])
    
    ctc_table = Table(ctc_data, colWidths=[3*inch, 2*inch])
    ctc_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4f46e5')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(ctc_table)
    story.append(Spacer(1, 0.3*inch))
    
    # Terms and Conditions
    story.append(Paragraph("<b>Terms and Conditions:</b>", heading_style))
    terms_text = """
    1. Your employment will be subject to satisfactory verification of documents and references.<br/>
    2. You will be on probation for a period of 6 months from the date of joining.<br/>
    3. This appointment is subject to your acceptance within 7 days of receiving this letter.<br/>
    4. You agree to abide by all company policies and procedures.<br/>
    5. Your employment may be terminated by either party with 30 days' notice or payment in lieu thereof.
    """
    story.append(Paragraph(terms_text, styles['Normal']))
    story.append(Spacer(1, 0.3*inch))
    
    # Closing
    closing_text = """
    We look forward to welcoming you to our team. Please sign and return a copy of this letter as your acceptance 
    of this offer. Should you have any questions, please feel free to contact our HR department.
    """
    story.append(Paragraph(closing_text, styles['Normal']))
    story.append(Spacer(1, 0.5*inch))
    
    # Signature section
    story.append(Paragraph("Sincerely,", styles['Normal']))
    story.append(Spacer(1, 0.5*inch))
    story.append(Paragraph(f"<b>{company_name}</b>", styles['Normal']))
    story.append(Paragraph("Human Resources Department", styles['Normal']))
    story.append(Spacer(1, 0.5*inch))
    
    # Acceptance section
    story.append(Paragraph("=" * 80, styles['Normal']))
    story.append(Paragraph("<b>ACCEPTANCE</b>", heading_style))
    acceptance_text = """
    I accept the terms and conditions mentioned in this appointment letter.<br/><br/>
    Signature: _________________________<br/><br/>
    Name: """ + candidate['name'] + """<br/><br/>
    Date: _________________________
    """
    story.append(Paragraph(acceptance_text, styles['Normal']))
    
    # Footer
    story.append(Spacer(1, 0.3*inch))
    story.append(Paragraph("This is a computer-generated document and does not require a physical signature.", 
                          ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=colors.gray)))
    
    # Build PDF
    doc.build(story)
    
    # Read PDF content
    with open(temp_file.name, 'rb') as f:
        pdf_content = f.read()
    
    # Store PDF in database as base64
    import base64
    pdf_base64 = base64.b64encode(pdf_content).decode('utf-8')
    
    # Save appointment letter record
    letter_dict = letter_obj.model_dump()
    letter_dict['created_at'] = letter_dict['created_at'].isoformat()
    letter_dict['joining_date'] = letter_dict['joining_date'].isoformat()
    if letter_dict.get('sent_at'):
        letter_dict['sent_at'] = letter_dict['sent_at'].isoformat()
    letter_dict['pdf_base64'] = pdf_base64  # Store PDF
    
    await db.appointment_letters.insert_one(letter_dict)
    
    # Send email with attachment
    if RESEND_API_KEY:
        try:
            email_html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: linear-gradient(135deg, #1e1b4b 0%, #4f46e5 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                    .content {{ padding: 30px; background-color: #f8fafc; }}
                    .highlight {{ background-color: #eef2ff; border-left: 4px solid #4f46e5; padding: 15px; margin: 20px 0; }}
                    .cta-button {{ display: inline-block; background-color: #4f46e5; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }}
                    .footer {{ padding: 20px; text-align: center; font-size: 12px; color: #666; background-color: #f1f5f9; border-radius: 0 0 10px 10px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1 style="margin: 0;">🎉 Congratulations!</h1>
                        <p style="margin: 10px 0 0 0; font-size: 18px;">Welcome to {company_name}</p>
                    </div>
                    <div class="content">
                        <p>Dear <strong>{candidate['name']}</strong>,</p>
                        
                        <p>We are thrilled to officially welcome you to the {company_name} family! 🎊</p>
                        
                        <div class="highlight">
                            <h3 style="margin-top: 0;">Your Appointment Details</h3>
                            <p><strong>Position:</strong> {appointment_data.designation}</p>
                            <p><strong>Joining Date:</strong> {appointment_data.joining_date.strftime('%B %d, %Y')}</p>
                            <p><strong>Location:</strong> {appointment_data.work_location}</p>
                            <p><strong>Reporting to:</strong> {appointment_data.reporting_manager}</p>
                        </div>
                        
                        <p>Please find your <strong>official Appointment Letter</strong> attached to this email. This document contains:</p>
                        <ul>
                            <li>Complete terms of employment</li>
                            <li>Detailed salary breakup</li>
                            <li>Company policies and guidelines</li>
                            <li>Next steps for your onboarding</li>
                        </ul>
                        
                        <p><strong>Action Required:</strong></p>
                        <p>Please review the appointment letter carefully, sign it, and return a scanned copy to us within 7 days.</p>
                        
                        <h3>What to Expect on Your First Day:</h3>
                        <ul>
                            <li>📋 Complete onboarding formalities</li>
                            <li>💻 Set up your workstation and accounts</li>
                            <li>👥 Meet your team and manager</li>
                            <li>🎯 Receive your initial project briefing</li>
                        </ul>
                        
                        <p>If you have any questions or need assistance, please don't hesitate to reach out to our HR team.</p>
                        
                        <p>We're excited to have you on board and look forward to achieving great things together!</p>
                        
                        <p>Best regards,<br/>
                        <strong>Human Resources Team</strong><br/>
                        {company_name}</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message. Please do not reply directly to this email.</p>
                        <p>For any queries, contact: hr@talentcockpit.com</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            # Prepare attachment
            params = {
                "from": SENDER_EMAIL,
                "to": [candidate['email']],
                "subject": f"🎉 Congratulations! Your Appointment Letter from {company_name}",
                "html": email_html,
                "attachments": [
                    {
                        "filename": f"Appointment_Letter_{candidate['name'].replace(' ', '_')}.pdf",
                        "content": pdf_base64
                    }
                ]
            }
            
            await asyncio.to_thread(resend.Emails.send, params)
            
            # Update letter status
            await db.appointment_letters.update_one(
                {"id": letter_obj.id},
                {
                    "$set": {
                        "email_sent": True,
                        "sent_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
            logging.info(f"Appointment letter sent to {candidate['email']}")
        except Exception as e:
            logging.error(f"Failed to send appointment letter email: {str(e)}")
            # Continue anyway - letter is generated
    
    # Create audit log
    audit_log = {
        "id": str(uuid.uuid4()),
        "action": "appointment_letter_generated",
        "candidate_id": candidate_id,
        "candidate_email": candidate['email'],
        "candidate_name": candidate['name'],
        "performed_by": current_user.email,
        "performed_by_name": current_user.name,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "details": {
            "designation": appointment_data.designation,
            "joining_date": appointment_data.joining_date.isoformat(),
            "ctc": appointment_data.ctc_annual
        }
    }
    await db.audit_logs.insert_one(audit_log)
    
    # Clean up temp file
    os.unlink(temp_file.name)
    
    return {
        "success": True,
        "message": "Appointment letter generated and sent successfully",
        "letter_id": letter_obj.id,
        "email_sent": True if RESEND_API_KEY else False
    }

@api_router.get("/candidates/{candidate_id}/appointment-letters")
async def get_appointment_letters(candidate_id: str, current_user: User = Depends(get_current_user)):
    """Get all appointment letters for a candidate"""
    letters = await db.appointment_letters.find(
        {"candidate_id": candidate_id},
        {"_id": 0, "pdf_base64": 0}  # Exclude PDF content from list
    ).to_list(100)
    
    for letter in letters:
        if isinstance(letter.get('created_at'), str):
            letter['created_at'] = datetime.fromisoformat(letter['created_at'])
        if isinstance(letter.get('joining_date'), str):
            letter['joining_date'] = datetime.fromisoformat(letter['joining_date'])
        if letter.get('sent_at') and isinstance(letter['sent_at'], str):
            letter['sent_at'] = datetime.fromisoformat(letter['sent_at'])
    
    return letters

# ============= CANDIDATE WITHDRAWAL (DPDP ACT) =============

@api_router.post("/candidates/{candidate_id}/withdraw")
async def withdraw_candidate(candidate_id: str, withdrawal_data: WithdrawalCreate, current_user: User = Depends(get_current_user)):
    """
    Candidate withdrawal with optional data purge.
    DPDP Act compliance: Right to withdraw application and request data deletion.
    """
    # Get candidate data
    candidate = await db.candidates.find_one({"id": candidate_id}, {"_id": 0})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Get job details
    job = await db.jobs.find_one({"id": candidate['job_id']}, {"_id": 0})
    job_title = job['title'] if job else "the position"
    
    # Create withdrawal request
    withdrawal_obj = WithdrawalRequest(**withdrawal_data.model_dump())
    
    doc = withdrawal_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('processed_at'):
        doc['processed_at'] = doc['processed_at'].isoformat()
    
    await db.withdrawal_requests.insert_one(doc)
    
    # Update candidate stage to withdrawn
    await db.candidates.update_one(
        {"id": candidate_id},
        {
            "$set": {
                "stage": "withdrawn",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Cancel all scheduled interviews
    await db.schedules.update_many(
        {"candidate_id": candidate_id, "status": "scheduled"},
        {"$set": {"status": "cancelled"}}
    )
    
    # Create audit log
    audit_log = {
        "id": str(uuid.uuid4()),
        "action": "candidate_withdrawal",
        "candidate_id": candidate_id,
        "candidate_email": candidate['email'],
        "candidate_name": candidate['name'],
        "performed_by": "candidate_self_service",
        "withdrawal_reason": withdrawal_data.reason,
        "purge_immediately": withdrawal_data.purge_immediately,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.audit_logs.insert_one(audit_log)
    
    # Send acknowledgment email
    if RESEND_API_KEY:
        try:
            survey_link = "https://forms.example.com/exit-survey"  # Replace with actual survey
            
            email_html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background-color: #1e1b4b; color: white; padding: 20px; text-align: center; }}
                    .content {{ padding: 20px; background-color: #f8fafc; }}
                    .survey-link {{ display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 15px 0; }}
                    .footer {{ padding: 20px; text-align: center; font-size: 12px; color: #666; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>Application Withdrawal Confirmed</h2>
                    </div>
                    <div class="content">
                        <p>Dear {candidate['name']},</p>
                        
                        <p>We have received your request to withdraw your application for the <strong>{job_title}</strong> position.</p>
                        
                        <p><strong>Withdrawal Details:</strong></p>
                        <ul>
                            <li>Application ID: {candidate_id[:8]}...</li>
                            <li>Withdrawal Date: {datetime.now(timezone.utc).strftime("%B %d, %Y")}</li>
                            <li>Reason: {withdrawal_data.reason}</li>
                        </ul>
                        
                        {'<p><strong>Data Deletion:</strong> Your personal data will be permanently deleted from our system within 48 hours as per your request.</p>' if withdrawal_data.purge_immediately else '<p><strong>Talent Pool:</strong> We will retain your information for 6 months in our talent pool for future opportunities. You can request deletion at any time.</p>'}
                        
                        <p>We appreciate your interest in our company and wish you the best in your career journey.</p>
                        
                        <p><strong>Help us improve:</strong> We would greatly value your feedback. Please take 1 minute to complete our exit survey:</p>
                        
                        <a href="{survey_link}" class="survey-link">Complete Exit Survey (1 min)</a>
                        
                        <p>Thank you for your time and consideration.</p>
                        
                        <p>Best regards,<br>The Recruitment Team</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated acknowledgment. Your withdrawal has been processed.</p>
                        <p>DPDP Act 2023 Compliance Notice: Your rights as a data principal have been honored.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            params = {
                "from": SENDER_EMAIL,
                "to": [candidate['email']],
                "subject": f"Application Withdrawal Confirmed - {job_title}",
                "html": email_html
            }
            await asyncio.to_thread(resend.Emails.send, params)
            logging.info(f"Withdrawal acknowledgment email sent to {candidate['email']}")
        except Exception as e:
            logging.error(f"Failed to send withdrawal email: {str(e)}")
    
    # If immediate purge requested, delete data
    if withdrawal_data.purge_immediately:
        await db.candidates.delete_one({"id": candidate_id})
        await db.scorecards.delete_many({"candidate_id": candidate_id})
        await db.posh_reports.delete_many({"candidate_id": candidate_id})
        await db.sensitive_data.delete_one({"candidate_id": candidate_id})
        
        # Update withdrawal status
        await db.withdrawal_requests.update_one(
            {"id": withdrawal_obj.id},
            {
                "$set": {
                    "status": "completed",
                    "processed_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {
            "success": True,
            "message": "Withdrawal processed and data purged immediately",
            "withdrawal_id": withdrawal_obj.id
        }
    else:
        return {
            "success": True,
            "message": "Withdrawal processed. Data will be retained for 6 months in talent pool.",
            "withdrawal_id": withdrawal_obj.id
        }

@api_router.get("/withdrawal-requests")
async def get_withdrawal_requests(current_user: User = Depends(get_current_user)):
    """Get pending withdrawal requests (for recruiters to see)"""
    requests = await db.withdrawal_requests.find(
        {"status": "pending"},
        {"_id": 0}
    ).to_list(1000)
    
    for req in requests:
        if isinstance(req.get('created_at'), str):
            req['created_at'] = datetime.fromisoformat(req['created_at'])
        if req.get('processed_at') and isinstance(req['processed_at'], str):
            req['processed_at'] = datetime.fromisoformat(req['processed_at'])
    
    return requests

@api_router.post("/withdrawal-requests/{withdrawal_id}/approve")
async def approve_withdrawal_request(withdrawal_id: str, current_user: User = Depends(get_current_user)):
    """
    Approve a pending withdrawal request and complete the purge if requested.
    This finalizes the withdrawal process initiated by the candidate.
    """
    # Get withdrawal request
    withdrawal = await db.withdrawal_requests.find_one({"id": withdrawal_id}, {"_id": 0})
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal request not found")
    
    if withdrawal['status'] != 'pending':
        raise HTTPException(status_code=400, detail="Withdrawal request already processed")
    
    # Get candidate data
    candidate = await db.candidates.find_one({"id": withdrawal['candidate_id']}, {"_id": 0})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # If immediate purge was requested, delete all data
    if withdrawal['purge_immediately']:
        # Delete candidate and all related data
        await db.candidates.delete_one({"id": withdrawal['candidate_id']})
        await db.scorecards.delete_many({"candidate_id": withdrawal['candidate_id']})
        await db.posh_reports.delete_many({"candidate_id": withdrawal['candidate_id']})
        await db.sensitive_data.delete_one({"candidate_id": withdrawal['candidate_id']})
        await db.schedules.delete_many({"candidate_id": withdrawal['candidate_id']})
        await db.appointment_letters.delete_many({"candidate_id": withdrawal['candidate_id']})
        
        # Create audit log
        audit_log = {
            "id": str(uuid.uuid4()),
            "action": "withdrawal_approved_with_purge",
            "candidate_id": withdrawal['candidate_id'],
            "candidate_email": candidate['email'],
            "candidate_name": candidate['name'],
            "performed_by": current_user.email,
            "performed_by_name": current_user.name,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "withdrawal_reason": withdrawal['reason']
        }
        await db.audit_logs.insert_one(audit_log)
        
        message = "Withdrawal approved and all candidate data permanently deleted"
    else:
        # Keep data in talent pool (already marked as withdrawn)
        # Create audit log
        audit_log = {
            "id": str(uuid.uuid4()),
            "action": "withdrawal_approved_retained",
            "candidate_id": withdrawal['candidate_id'],
            "candidate_email": candidate['email'],
            "candidate_name": candidate['name'],
            "performed_by": current_user.email,
            "performed_by_name": current_user.name,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "withdrawal_reason": withdrawal['reason'],
            "retention_period": "6 months"
        }
        await db.audit_logs.insert_one(audit_log)
        
        message = "Withdrawal approved. Candidate data retained in talent pool for 6 months"
    
    # Update withdrawal request status
    await db.withdrawal_requests.update_one(
        {"id": withdrawal_id},
        {
            "$set": {
                "status": "completed",
                "processed_at": datetime.now(timezone.utc).isoformat(),
                "processed_by": current_user.email
            }
        }
    )
    
    return {
        "success": True,
        "message": message,
        "data_purged": withdrawal['purge_immediately']
    }

# ============= DATA SNAPSHOT GENERATION (DPDP ACT - RIGHT TO ACCESS) =============

@api_router.get("/candidates/{candidate_id}/generate-snapshot")
async def generate_candidate_snapshot(candidate_id: str, current_user: User = Depends(get_current_user)):
    """
    Generate comprehensive PDF snapshot of all candidate data.
    DPDP Act compliance: Right to Access - Data Principal can request their data.
    Restricted to Admin/DPO only.
    """
    if current_user.role not in ["admin", "dpo"]:
        raise HTTPException(status_code=403, detail="Only Admin or DPO can generate data snapshots")
    
    # Get all candidate data
    candidate = await db.candidates.find_one({"id": candidate_id}, {"_id": 0})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Get related data
    job = await db.jobs.find_one({"id": candidate['job_id']}, {"_id": 0})
    scorecards = await db.scorecards.find({"candidate_id": candidate_id}, {"_id": 0}).to_list(100)
    schedules = await db.schedules.find({"candidate_id": candidate_id}, {"_id": 0}).to_list(100)
    sensitive_data = await db.sensitive_data.find_one({"candidate_id": candidate_id}, {"_id": 0})
    
    # Create audit log for snapshot generation
    audit_log = {
        "id": str(uuid.uuid4()),
        "action": "data_snapshot_generated",
        "candidate_id": candidate_id,
        "candidate_email": candidate['email'],
        "candidate_name": candidate['name'],
        "performed_by": current_user.email,
        "performed_by_name": current_user.name,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "reason": "DPDP Act - Right to Access"
    }
    await db.audit_logs.insert_one(audit_log)
    
    # Generate PDF
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
    doc = SimpleDocTemplate(temp_file.name, pagesize=letter)
    story = []
    styles = getSampleStyleSheet()
    
    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1e1b4b'),
        spaceAfter=30
    )
    story.append(Paragraph("Candidate 360° Data Snapshot", title_style))
    story.append(Paragraph(f"Generated: {datetime.now(timezone.utc).strftime('%B %d, %Y at %I:%M %p UTC')}", styles['Normal']))
    story.append(Paragraph(f"Generated by: {current_user.name} ({current_user.role})", styles['Normal']))
    story.append(Spacer(1, 0.3*inch))
    
    # Section 1: Personal Information
    story.append(Paragraph("1. Personal Information", styles['Heading2']))
    personal_data = [
        ['Field', 'Value'],
        ['Name', candidate.get('name', 'N/A')],
        ['Email', candidate.get('email', 'N/A')],
        ['Phone', candidate.get('phone', 'N/A')],
        ['Experience', f"{candidate.get('experience_years', 0)} years"],
        ['Skills', ', '.join(candidate.get('skills', []))],
        ['Current Stage', candidate.get('stage', 'N/A').upper()],
    ]
    
    if sensitive_data:
        personal_data.extend([
            ['PAN', sensitive_data.get('pan', 'N/A')],
            ['Aadhaar (Masked)', sensitive_data.get('aadhaar_masked', 'N/A')],
            ['UAN', sensitive_data.get('uan', 'N/A')],
        ])
    
    personal_table = Table(personal_data, colWidths=[2*inch, 4*inch])
    personal_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4f46e5')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ]))
    story.append(personal_table)
    story.append(Spacer(1, 0.3*inch))
    
    # Section 2: Application Data
    story.append(Paragraph("2. Application Data", styles['Heading2']))
    story.append(Paragraph(f"<b>Job Applied:</b> {job['title'] if job else 'N/A'}", styles['Normal']))
    story.append(Paragraph(f"<b>Application Date:</b> {datetime.fromisoformat(candidate['created_at']).strftime('%B %d, %Y')}", styles['Normal']))
    story.append(Paragraph(f"<b>Source:</b> {candidate.get('source', 'Direct Application')}", styles['Normal']))
    if candidate.get('resume_text'):
        story.append(Paragraph("<b>Resume Summary:</b>", styles['Normal']))
        story.append(Paragraph(candidate['resume_text'][:500] + "...", styles['Normal']))
    story.append(Spacer(1, 0.3*inch))
    
    # Section 3: Interview Process Data
    story.append(Paragraph("3. Interview Process History", styles['Heading2']))
    
    if schedules:
        interview_data = [['Type', 'Date', 'Interviewer', 'Status']]
        for schedule in schedules:
            interview_data.append([
                schedule.get('interview_type', 'N/A'),
                datetime.fromisoformat(schedule['start_time']).strftime('%b %d, %Y'),
                schedule.get('interviewer_name', 'N/A'),
                schedule.get('status', 'N/A').upper()
            ])
        
        interview_table = Table(interview_data, colWidths=[1.5*inch, 1.5*inch, 2*inch, 1*inch])
        interview_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4f46e5')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        story.append(interview_table)
    else:
        story.append(Paragraph("No interviews scheduled.", styles['Normal']))
    
    story.append(Spacer(1, 0.3*inch))
    
    # Section 4: Feedback & Scorecards
    story.append(Paragraph("4. Interview Feedback & Scorecards", styles['Heading2']))
    
    if scorecards:
        for i, scorecard in enumerate(scorecards, 1):
            story.append(Paragraph(f"<b>Feedback {i}: {scorecard.get('round_name', 'N/A')}</b>", styles['Normal']))
            story.append(Paragraph(f"Rating: {scorecard.get('rating', 0)}/5", styles['Normal']))
            story.append(Paragraph(f"Recommendation: {scorecard.get('recommendation', 'N/A').replace('_', ' ').title()}", styles['Normal']))
            story.append(Paragraph(f"Feedback: {scorecard.get('feedback', 'No feedback provided')}", styles['Normal']))
            story.append(Spacer(1, 0.2*inch))
    else:
        story.append(Paragraph("No feedback recorded yet.", styles['Normal']))
    
    story.append(Spacer(1, 0.3*inch))
    
    # Section 5: Consent Log
    story.append(Paragraph("5. Consent & Compliance Log", styles['Heading2']))
    
    if candidate.get('consent_log'):
        consent_data = [
            ['Field', 'Value'],
            ['Consent Given', 'Yes' if candidate['consent_log'].get('consent_given') else 'No'],
            ['Method', candidate['consent_log'].get('method', 'N/A')],
            ['Timestamp', datetime.fromisoformat(candidate['consent_log']['timestamp']).strftime('%B %d, %Y at %I:%M %p')],
            ['IP Address', candidate['consent_log'].get('ip_address', 'N/A')],
        ]
        
        consent_table = Table(consent_data, colWidths=[2*inch, 4*inch])
        consent_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#10b981')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        story.append(consent_table)
    else:
        story.append(Paragraph("No consent log available.", styles['Normal']))
    
    story.append(Spacer(1, 0.5*inch))
    
    # Footer
    story.append(Paragraph("=" * 80, styles['Normal']))
    story.append(Paragraph("<b>DPDP Act 2023 Compliance Notice:</b>", styles['Normal']))
    story.append(Paragraph("This document contains all personal data we hold about the candidate. Generated as per the Right to Access under the Digital Personal Data Protection Act 2023.", styles['Normal']))
    story.append(Paragraph(f"Document ID: {audit_log['id']}", styles['Normal']))
    story.append(Paragraph("This document is confidential and should be handled securely.", styles['Normal']))
    
    # Build PDF
    doc.build(story)
    
    # Read file content
    with open(temp_file.name, 'rb') as f:
        pdf_content = f.read()
    
    # Clean up temp file
    os.unlink(temp_file.name)
    
    # Convert to base64 for frontend download
    import base64
    pdf_base64 = base64.b64encode(pdf_content).decode('utf-8')
    
    return {
        "success": True,
        "filename": f"candidate_snapshot_{candidate_id[:8]}.pdf",
        "pdf_base64": pdf_base64,
        "audit_log_id": audit_log['id']
    }

# ============= AUDIT LOGS =============

@api_router.get("/audit-logs")
async def get_audit_logs(current_user: User = Depends(get_current_user)):
    """Get audit logs (Admin/DPO only)"""
    if current_user.role not in ["admin", "dpo"]:
        raise HTTPException(status_code=403, detail="Only Admin or DPO can view audit logs")
    
    logs = await db.audit_logs.find({}, {"_id": 0}).sort("timestamp", -1).limit(100).to_list(100)
    return logs

# ============= DASHBOARD STATS =============

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    total_jobs = await db.jobs.count_documents({"status": "active"})
    total_candidates = await db.candidates.count_documents({})
    
    # Count by stage
    pipeline = [
        {"$group": {"_id": "$stage", "count": {"$sum": 1}}}
    ]
    stage_counts = await db.candidates.aggregate(pipeline).to_list(100)
    stage_distribution = {item['_id']: item['count'] for item in stage_counts}
    
    # Recent candidates
    recent_candidates = await db.candidates.find(
        {}, {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    for candidate in recent_candidates:
        if isinstance(candidate.get('created_at'), str):
            candidate['created_at'] = datetime.fromisoformat(candidate['created_at'])
        if isinstance(candidate.get('updated_at'), str):
            candidate['updated_at'] = datetime.fromisoformat(candidate['updated_at'])
    
    return {
        "total_jobs": total_jobs,
        "total_candidates": total_candidates,
        "stage_distribution": stage_distribution,
        "recent_candidates": recent_candidates
    }

# ============= EMAIL ROUTES =============

@api_router.post("/send-email")
async def send_email(request: EmailRequest, current_user: User = Depends(get_current_user)):
    if not RESEND_API_KEY:
        return {"status": "skipped", "message": "Email service not configured"}
    
    params = {
        "from": SENDER_EMAIL,
        "to": [request.recipient_email],
        "subject": request.subject,
        "html": request.html_content
    }
    
    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        return {
            "status": "success",
            "message": f"Email sent to {request.recipient_email}",
            "email_id": email.get("id")
        }
    except Exception as e:
        logging.error(f"Failed to send email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

# ============= EMERGENT INTEGRATION ROUTES =============

from emergent_integration import (
    EmergentSalaryComponents, StatutoryCompliance, OfferLetterRequest,
    OfferLetterPDF, EmergentEmployeeExport, EmergentExportService,
    OfferEmailTemplate
)

@api_router.post("/emergent/offer-preview")
async def get_offer_preview(request: OfferLetterRequest, current_user: User = Depends(get_current_user)):
    """Generate preview of offer letter with Emergent salary components"""
    candidate = await db.candidates.find_one({"id": request.candidate_id}, {"_id": 0})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Calculate totals
    gross_salary = request.salary_components.gross_salary
    ctc = request.salary_components.ctc
    
    # Generate PDF
    from datetime import timedelta
    acceptance_deadline = (datetime.now() + timedelta(days=3)).strftime("%B %d, %Y")
    
    pdf_data = {
        "candidate_id": request.candidate_id,
        "candidate_name": candidate['name'],
        "candidate_email": candidate['email'],
        "designation": request.designation,
        "department": request.department,
        "work_location": request.work_location,
        "reporting_manager": request.reporting_manager,
        "joining_date": request.joining_date,
        "probation_months": request.probation_months,
        "notice_period_days": request.notice_period_days,
        "salary_components": request.salary_components.to_dict(),
        "gross_salary": gross_salary,
        "ctc": ctc,
        "acceptance_deadline": acceptance_deadline
    }
    
    pdf_bytes = OfferLetterPDF.generate(pdf_data)
    pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
    
    # Generate email preview
    email_html = OfferEmailTemplate.render_html(pdf_data)
    
    return {
        "candidate_name": candidate['name'],
        "candidate_email": candidate['email'],
        "subject": f"🎉 Job Offer - {request.designation}",
        "html_preview": email_html,
        "pdf_preview": f"data:application/pdf;base64,{pdf_base64}",
        "pdf_filename": f"offer_letter_{candidate['name'].replace(' ', '_').lower()}.pdf",
        "gross_salary": gross_salary,
        "ctc": ctc
    }

@api_router.post("/emergent/send-offer")
async def send_offer_letter(request: OfferLetterRequest, current_user: User = Depends(get_current_user)):
    """Send offer letter with Emergent salary structure"""
    candidate = await db.candidates.find_one({"id": request.candidate_id}, {"_id": 0})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    from datetime import timedelta
    from lifecycle_engine import s3_manager
    
    acceptance_deadline = (datetime.now() + timedelta(days=3)).strftime("%B %d, %Y")
    
    # Prepare data
    pdf_data = {
        "candidate_id": request.candidate_id,
        "candidate_name": candidate['name'],
        "candidate_email": candidate['email'],
        "designation": request.designation,
        "department": request.department,
        "work_location": request.work_location,
        "reporting_manager": request.reporting_manager,
        "joining_date": request.joining_date,
        "probation_months": request.probation_months,
        "notice_period_days": request.notice_period_days,
        "salary_components": request.salary_components.to_dict(),
        "gross_salary": request.salary_components.gross_salary,
        "ctc": request.salary_components.ctc,
        "acceptance_deadline": acceptance_deadline
    }
    
    # Generate PDF
    pdf_bytes = OfferLetterPDF.generate(pdf_data)
    filename = f"offer_letter_{request.candidate_id}_{datetime.now().strftime('%Y%m%d')}.pdf"
    pdf_url = s3_manager.upload_pdf(pdf_bytes, filename, folder="offer_letters")
    
    # Store offer letter
    offer_letter = {
        "id": str(uuid.uuid4()),
        "candidate_id": request.candidate_id,
        "designation": request.designation,
        "department": request.department,
        "work_location": request.work_location,
        "joining_date": datetime.fromisoformat(request.joining_date),
        "salary_components": request.salary_components.model_dump(),
        "gross_salary": request.salary_components.gross_salary,
        "ctc": request.salary_components.ctc,
        "reporting_manager": request.reporting_manager,
        "probation_months": request.probation_months,
        "notice_period_days": request.notice_period_days,
        "pdf_url": pdf_url,
        "status": "sent",
        "sent_at": datetime.now(timezone.utc),
        "created_at": datetime.now(timezone.utc)
    }
    await db.offer_letters.insert_one(offer_letter)
    
    # Send email
    email_sent = False
    email_id = None
    
    if request.send_email and RESEND_API_KEY:
        try:
            email_html = OfferEmailTemplate.render_html(pdf_data)
            params = {
                "from": SENDER_EMAIL,
                "to": [candidate['email']],
                "subject": f"🎉 Job Offer - {request.designation}",
                "html": email_html,
                "attachments": [{
                    "filename": filename,
                    "content": base64.b64encode(pdf_bytes).decode('utf-8')
                }]
            }
            email_result = await asyncio.to_thread(resend.Emails.send, params)
            email_sent = True
            email_id = email_result.get("id")
        except Exception as e:
            logging.error(f"Failed to send offer email: {e}")
    
    # Update candidate stage to offer
    await db.candidates.update_one(
        {"id": request.candidate_id},
        {"$set": {"stage": "offer", "updated_at": datetime.now(timezone.utc)}}
    )
    
    return {
        "success": True,
        "email_sent": email_sent,
        "pdf_url": pdf_url,
        "offer_letter_id": offer_letter['id']
    }

@api_router.post("/emergent/update-statutory/{candidate_id}")
async def update_statutory_compliance(
    candidate_id: str,
    statutory: StatutoryCompliance,
    current_user: User = Depends(get_current_user)
):
    """Update statutory compliance data for candidate"""
    candidate = await db.candidates.find_one({"id": candidate_id}, {"_id": 0})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Update candidate with statutory data
    await db.candidates.update_one(
        {"id": candidate_id},
        {
            "$set": {
                "statutory_compliance": statutory.model_dump(),
                "emergent_ready": statutory.is_ready_for_emergent(),
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    
    return {
        "success": True,
        "emergent_ready": statutory.is_ready_for_emergent(),
        "missing_fields": [
            field for field, value in statutory.model_dump().items()
            if not value and field in ['pan', 'aadhaar_masked', 'uan', 'bank_account_number', 'bank_ifsc', 'bank_name']
        ]
    }

@api_router.get("/emergent/check-readiness/{candidate_id}")
async def check_emergent_readiness(candidate_id: str, current_user: User = Depends(get_current_user)):
    """Check if candidate is ready for Emergent export"""
    candidate = await db.candidates.find_one({"id": candidate_id}, {"_id": 0})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    statutory = candidate.get('statutory_compliance', {})
    offer = await db.offer_letters.find_one({"candidate_id": candidate_id}, {"_id": 0})
    
    checks = {
        "has_offer_letter": offer is not None,
        "has_pan": bool(statutory.get('pan')),
        "has_aadhaar": bool(statutory.get('aadhaar_masked')),
        "has_uan": bool(statutory.get('uan')),
        "has_bank_details": bool(statutory.get('bank_account_number') and statutory.get('bank_ifsc')),
        "stage_is_onboarding": candidate.get('stage') == 'onboarding'
    }
    
    is_ready = all(checks.values())
    
    return {
        "candidate_id": candidate_id,
        "candidate_name": candidate['name'],
        "emergent_ready": is_ready,
        "checks": checks,
        "missing_items": [key.replace('_', ' ').title() for key, value in checks.items() if not value]
    }

@api_router.post("/emergent/export")
async def export_to_emergent(
    candidate_ids: List[str],
    current_user: User = Depends(get_current_user)
):
    """Export candidates to Emergent Employee Master CSV format"""
    if current_user.role not in ["admin", "recruiter"]:
        raise HTTPException(status_code=403, detail="Only Admin or Recruiter can export to Emergent")
    
    employees = []
    
    for candidate_id in candidate_ids:
        candidate = await db.candidates.find_one({"id": candidate_id}, {"_id": 0})
        if not candidate:
            continue
        
        offer = await db.offer_letters.find_one({"candidate_id": candidate_id}, {"_id": 0})
        if not offer:
            continue
        
        statutory = candidate.get('statutory_compliance', {})
        if not statutory:
            continue
        
        # Split name
        name_parts = candidate['name'].split(' ', 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ''
        
        # Format joining date
        joining_date = offer['joining_date']
        if isinstance(joining_date, str):
            joining_date = datetime.fromisoformat(joining_date)
        joining_date_formatted = joining_date.strftime("%d/%m/%Y")
        
        # Create employee export record
        salary_components = offer['salary_components']
        employee = EmergentEmployeeExport(
            employee_id=f"EMP{candidate_id[:8].upper()}",
            first_name=first_name,
            last_name=last_name,
            email=candidate['email'],
            phone=candidate.get('phone', ''),
            designation=offer['designation'],
            department=offer['department'],
            joining_date=joining_date_formatted,
            work_location=offer['work_location'],
            reporting_manager=offer['reporting_manager'],
            basic=salary_components['basic'],
            hra=salary_components['hra'],
            conveyance=salary_components['conveyance'],
            special_allowance=salary_components['special_allowance'],
            lta=salary_components['lta'],
            employer_pf=salary_components['employer_pf'],
            gross_salary=offer['gross_salary'],
            ctc=offer['ctc'],
            pan=statutory['pan'],
            aadhaar_last_4=statutory['aadhaar_masked'],
            uan=statutory.get('uan', ''),
            esic_number=statutory.get('esic_number'),
            bank_account_number=statutory['bank_account_number'],
            bank_ifsc=statutory['bank_ifsc'],
            bank_branch=statutory.get('bank_branch', ''),
            bank_name=statutory['bank_name'],
            probation_months=offer['probation_months'],
            notice_period_days=offer['notice_period_days']
        )
        employees.append(employee)
    
    if not employees:
        raise HTTPException(status_code=400, detail="No eligible candidates found for export")
    
    # Generate CSV
    csv_bytes = EmergentExportService.generate_csv(employees)
    csv_base64 = base64.b64encode(csv_bytes).decode('utf-8')
    
    # Log export
    export_log = {
        "id": str(uuid.uuid4()),
        "exported_by": current_user.id,
        "candidate_count": len(employees),
        "candidate_ids": candidate_ids,
        "exported_at": datetime.now(timezone.utc)
    }
    await db.emergent_exports.insert_one(export_log)
    
    return {
        "success": True,
        "employee_count": len(employees),
        "csv_data": f"data:text/csv;base64,{csv_base64}",
        "filename": f"emergent_employee_master_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
        "export_log_id": export_log['id']
    }

# ============= LIFECYCLE ENGINE ROUTES =============

from lifecycle_engine import (
    RejectionRequest, RejectionEmailTemplate, OnboardingLetterRequest,
    AppointmentLetterPDF, InterviewScheduleRequest, ICSGenerator,
    LifecycleEvent, DataPurgeService, OnboardingEmailTemplate,
    InterviewEmailTemplate, s3_manager
)

@api_router.post("/lifecycle/rejection-preview")
async def get_rejection_preview(
    candidate_id: str,
    reason: str,
    custom_message: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Generate preview of rejection email for dual-pane modal"""
    candidate = await db.candidates.find_one({"id": candidate_id}, {"_id": 0})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    template = RejectionEmailTemplate(
        candidate_name=candidate['name'],
        reason=reason,
        custom_message=custom_message,
        recruiter_name=current_user.name
    )
    
    return {
        "candidate_name": candidate['name'],
        "candidate_email": candidate['email'],
        "subject": "Application Status Update - Not Selected",
        "html_preview": template.render_html(),
        "will_purge_data": True
    }

@api_router.post("/lifecycle/send-rejection")
async def send_rejection_and_purge(
    request: RejectionRequest,
    current_user: User = Depends(get_current_user)
):
    """Send rejection email and purge candidate data as per DPDP Act 2023"""
    candidate = await db.candidates.find_one({"id": request.candidate_id}, {"_id": 0})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Generate email
    template = RejectionEmailTemplate(
        candidate_name=candidate['name'],
        reason=request.reason,
        custom_message=request.custom_message,
        recruiter_name=current_user.name
    )
    
    email_sent = False
    email_id = None
    
    # Send email if configured and requested
    if request.send_email and RESEND_API_KEY:
        try:
            params = {
                "from": SENDER_EMAIL,
                "to": [candidate['email']],
                "subject": "Application Status Update - Not Selected",
                "html": template.render_html()
            }
            email_result = await asyncio.to_thread(resend.Emails.send, params)
            email_sent = True
            email_id = email_result.get("id")
        except Exception as e:
            logging.error(f"Failed to send rejection email: {e}")
    
    # Purge data if requested
    purge_result = None
    if request.purge_data:
        try:
            purge_result = await DataPurgeService.purge_candidate_pii(
                db, request.candidate_id, current_user.id
            )
        except Exception as e:
            logging.error(f"Failed to purge data: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to purge data: {str(e)}")
    
    # Log lifecycle event
    lifecycle_event = LifecycleEvent(
        candidate_id=request.candidate_id,
        event_type="rejection",
        recruiter_id=current_user.id,
        recruiter_email=current_user.email,
        metadata={
            "reason": request.reason,
            "custom_message": request.custom_message
        },
        email_sent=email_sent,
        email_id=email_id,
        data_purged=request.purge_data
    )
    await db.lifecycle_events.insert_one(lifecycle_event.model_dump())
    
    return {
        "success": True,
        "email_sent": email_sent,
        "data_purged": request.purge_data,
        "lifecycle_event_id": lifecycle_event.id,
        "purge_result": purge_result
    }

@api_router.post("/lifecycle/onboarding-preview")
async def get_onboarding_preview(request: OnboardingLetterRequest, current_user: User = Depends(get_current_user)):
    """Generate preview of appointment letter for dual-pane modal"""
    candidate = await db.candidates.find_one({"id": request.candidate_id}, {"_id": 0})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    job = await db.jobs.find_one({"id": candidate['job_id']}, {"_id": 0})
    
    # Generate PDF
    pdf_data = {
        "candidate_id": request.candidate_id,
        "candidate_name": candidate['name'],
        "candidate_email": candidate['email'],
        "designation": request.designation,
        "joining_date": request.joining_date,
        "ctc_annual": request.ctc_annual,
        "ctc_breakup": request.ctc_breakup,
        "reporting_manager": request.reporting_manager,
        "work_location": request.work_location,
        "department": request.department,
        "probation_months": request.probation_months,
        "notice_period_days": request.notice_period_days
    }
    
    pdf_bytes = AppointmentLetterPDF.generate(pdf_data)
    pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
    
    # Generate email preview
    email_html = OnboardingEmailTemplate.render_html(pdf_data)
    
    return {
        "candidate_name": candidate['name'],
        "candidate_email": candidate['email'],
        "subject": f"🎉 Appointment Letter - {request.designation}",
        "html_preview": email_html,
        "pdf_preview": f"data:application/pdf;base64,{pdf_base64}",
        "pdf_filename": f"appointment_letter_{candidate['name'].replace(' ', '_').lower()}.pdf"
    }

@api_router.post("/lifecycle/send-onboarding")
async def send_onboarding_letter(request: OnboardingLetterRequest, current_user: User = Depends(get_current_user)):
    """Generate appointment letter PDF, upload to S3, and send email"""
    candidate = await db.candidates.find_one({"id": request.candidate_id}, {"_id": 0})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Generate PDF
    pdf_data = {
        "candidate_id": request.candidate_id,
        "candidate_name": candidate['name'],
        "candidate_email": candidate['email'],
        "designation": request.designation,
        "joining_date": request.joining_date,
        "ctc_annual": request.ctc_annual,
        "ctc_breakup": request.ctc_breakup,
        "reporting_manager": request.reporting_manager,
        "work_location": request.work_location,
        "department": request.department,
        "probation_months": request.probation_months,
        "notice_period_days": request.notice_period_days
    }
    
    pdf_bytes = AppointmentLetterPDF.generate(pdf_data)
    
    # Upload to S3 or get base64
    filename = f"appointment_letter_{request.candidate_id}_{datetime.now().strftime('%Y%m%d')}.pdf"
    pdf_url = s3_manager.upload_pdf(pdf_bytes, filename, folder="appointment_letters")
    
    # Store appointment letter record
    appointment_letter = AppointmentLetter(
        candidate_id=request.candidate_id,
        designation=request.designation,
        joining_date=datetime.fromisoformat(request.joining_date),
        ctc_annual=request.ctc_annual,
        ctc_breakup=request.ctc_breakup,
        reporting_manager=request.reporting_manager,
        work_location=request.work_location,
        pdf_url=pdf_url
    )
    
    # Send email with PDF attachment if configured
    email_sent = False
    email_id = None
    
    if request.send_email and RESEND_API_KEY:
        try:
            email_html = OnboardingEmailTemplate.render_html(pdf_data)
            
            # For Resend, we need to use attachments
            params = {
                "from": SENDER_EMAIL,
                "to": [candidate['email']],
                "subject": f"🎉 Appointment Letter - {request.designation}",
                "html": email_html,
                "attachments": [{
                    "filename": filename,
                    "content": base64.b64encode(pdf_bytes).decode('utf-8')
                }]
            }
            
            email_result = await asyncio.to_thread(resend.Emails.send, params)
            email_sent = True
            email_id = email_result.get("id")
            appointment_letter.email_sent = True
            appointment_letter.sent_at = datetime.now(timezone.utc)
        except Exception as e:
            logging.error(f"Failed to send onboarding email: {e}")
    
    # Save appointment letter to database
    await db.appointment_letters.insert_one(appointment_letter.model_dump())
    
    # Update candidate stage to onboarding
    await db.candidates.update_one(
        {"id": request.candidate_id},
        {"$set": {"stage": "onboarding", "updated_at": datetime.now(timezone.utc)}}
    )
    
    # Log lifecycle event
    lifecycle_event = LifecycleEvent(
        candidate_id=request.candidate_id,
        event_type="onboarding",
        recruiter_id=current_user.id,
        recruiter_email=current_user.email,
        metadata={
            "designation": request.designation,
            "ctc_annual": request.ctc_annual,
            "joining_date": request.joining_date
        },
        email_sent=email_sent,
        email_id=email_id,
        pdf_generated=True,
        pdf_url=pdf_url
    )
    await db.lifecycle_events.insert_one(lifecycle_event.model_dump())
    
    return {
        "success": True,
        "email_sent": email_sent,
        "pdf_url": pdf_url,
        "appointment_letter_id": appointment_letter.id,
        "lifecycle_event_id": lifecycle_event.id
    }

@api_router.post("/lifecycle/schedule-interview")
async def schedule_interview(request: InterviewScheduleRequest, current_user: User = Depends(get_current_user)):
    """Schedule interview and send calendar invites"""
    candidate = await db.candidates.find_one({"id": request.candidate_id}, {"_id": 0})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    job = await db.jobs.find_one({"id": request.job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    interviewer = await db.users.find_one({"id": request.interviewer_user_id}, {"_id": 0})
    if not interviewer:
        raise HTTPException(status_code=404, detail="Interviewer not found")
    
    # Create interview schedule
    end_time = request.start_time + timedelta(minutes=request.duration_minutes)
    
    interview_schedule = InterviewSchedule(
        candidate_id=request.candidate_id,
        job_id=request.job_id,
        interviewer_user_id=request.interviewer_user_id,
        interviewer_name=interviewer['name'],
        interviewer_email=interviewer['email'],
        interview_type=request.interview_type,
        start_time=request.start_time,
        end_time=end_time,
        duration_minutes=request.duration_minutes,
        meeting_url=request.meeting_url,
        created_by=current_user.id
    )
    
    await db.interview_schedules.insert_one(interview_schedule.model_dump())
    
    # Generate ICS file
    ics_content = None
    if request.generate_ics:
        ics_data = {
            "uid": interview_schedule.id,
            "start_time": request.start_time,
            "duration_minutes": request.duration_minutes,
            "summary": f"{request.interview_type} Interview - {job['title']}",
            "description": f"Interview with {candidate['name']} for {job['title']} position",
            "meeting_url": request.meeting_url or "Virtual",
            "organizer_name": current_user.name,
            "organizer_email": current_user.email,
            "candidate_name": candidate['name'],
            "candidate_email": candidate['email'],
            "interviewer_name": interviewer['name'],
            "interviewer_email": interviewer['email']
        }
        ics_content = ICSGenerator.generate(ics_data)
    
    # Send email notifications
    email_sent = False
    if request.send_email and RESEND_API_KEY:
        try:
            email_data = {
                "candidate_name": candidate['name'],
                "job_title": job['title'],
                "interview_type": request.interview_type,
                "start_time_formatted": request.start_time.strftime("%B %d, %Y at %I:%M %p"),
                "duration_minutes": request.duration_minutes,
                "interviewer_name": interviewer['name'],
                "meeting_url": request.meeting_url
            }
            
            email_html = InterviewEmailTemplate.render_html(email_data)
            
            # Send to candidate
            params = {
                "from": SENDER_EMAIL,
                "to": [candidate['email']],
                "subject": f"Interview Scheduled - {request.interview_type}",
                "html": email_html
            }
            
            if ics_content:
                params["attachments"] = [{
                    "filename": "interview.ics",
                    "content": base64.b64encode(ics_content.encode()).decode('utf-8')
                }]
            
            await asyncio.to_thread(resend.Emails.send, params)
            
            # Send to interviewer
            params["to"] = [interviewer['email']]
            await asyncio.to_thread(resend.Emails.send, params)
            
            email_sent = True
        except Exception as e:
            logging.error(f"Failed to send interview emails: {e}")
    
    # Log lifecycle event
    lifecycle_event = LifecycleEvent(
        candidate_id=request.candidate_id,
        event_type="interview_scheduled",
        event_subtype=request.interview_type,
        recruiter_id=current_user.id,
        recruiter_email=current_user.email,
        metadata={
            "interviewer": interviewer['name'],
            "start_time": request.start_time.isoformat(),
            "duration_minutes": request.duration_minutes
        },
        email_sent=email_sent
    )
    await db.lifecycle_events.insert_one(lifecycle_event.model_dump())
    
    return {
        "success": True,
        "interview_id": interview_schedule.id,
        "email_sent": email_sent,
        "ics_file": ics_content if request.generate_ics else None,
        "lifecycle_event_id": lifecycle_event.id
    }

@api_router.get("/lifecycle/candidate-snapshot/{candidate_id}")
async def generate_candidate_snapshot(candidate_id: str, current_user: User = Depends(get_current_user)):
    """Generate complete data snapshot for candidate (Right to Access - DPDP Act 2023)"""
    candidate = await db.candidates.find_one({"id": candidate_id}, {"_id": 0})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Collect all data
    job = await db.jobs.find_one({"id": candidate['job_id']}, {"_id": 0})
    scorecards = await db.scorecards.find({"candidate_id": candidate_id}, {"_id": 0}).to_list(100)
    interviews = await db.interview_schedules.find({"candidate_id": candidate_id}, {"_id": 0}).to_list(100)
    lifecycle_events = await db.lifecycle_events.find({"candidate_id": candidate_id}, {"_id": 0}).to_list(100)
    
    snapshot_data = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "candidate": candidate,
        "job": job,
        "scorecards": scorecards,
        "interviews": interviews,
        "lifecycle_events": lifecycle_events
    }
    
    # Log the snapshot generation
    lifecycle_event = LifecycleEvent(
        candidate_id=candidate_id,
        event_type="data_snapshot",
        recruiter_id=current_user.id,
        recruiter_email=current_user.email,
        metadata={"snapshot_size": len(str(snapshot_data))}
    )
    await db.lifecycle_events.insert_one(lifecycle_event.model_dump())
    
    return {
        "success": True,
        "snapshot": snapshot_data,
        "lifecycle_event_id": lifecycle_event.id
    }

@api_router.post("/lifecycle/candidate-withdrawal")
async def process_candidate_withdrawal(
    candidate_id: str,
    reason: str,
    purge_immediately: bool = False,
    current_user: User = Depends(get_current_user)
):
    """Process candidate-initiated withdrawal"""
    candidate = await db.candidates.find_one({"id": candidate_id}, {"_id": 0})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Create withdrawal request
    withdrawal = WithdrawalRequest(
        candidate_id=candidate_id,
        reason=reason,
        purge_immediately=purge_immediately
    )
    
    # If immediate purge requested
    if purge_immediately:
        purge_result = await DataPurgeService.purge_candidate_pii(db, candidate_id, current_user.id)
        withdrawal.status = "completed"
        withdrawal.processed_at = datetime.now(timezone.utc)
    else:
        # Just mark as withdrawn
        await db.candidates.update_one(
            {"id": candidate_id},
            {"$set": {"stage": "withdrawn", "updated_at": datetime.now(timezone.utc)}}
        )
    
    await db.withdrawal_requests.insert_one(withdrawal.model_dump())
    
    # Log lifecycle event
    lifecycle_event = LifecycleEvent(
        candidate_id=candidate_id,
        event_type="withdrawal",
        recruiter_id=current_user.id,
        recruiter_email=current_user.email,
        metadata={"reason": reason, "purged": purge_immediately},
        data_purged=purge_immediately
    )
    await db.lifecycle_events.insert_one(lifecycle_event.model_dump())
    
    return {
        "success": True,
        "withdrawal_id": withdrawal.id,
        "data_purged": purge_immediately,
        "lifecycle_event_id": lifecycle_event.id
    }

@api_router.get("/lifecycle/events/{candidate_id}")
async def get_candidate_lifecycle_events(candidate_id: str, current_user: User = Depends(get_current_user)):
    """Get all lifecycle events for a candidate"""
    events = await db.lifecycle_events.find(
        {"candidate_id": candidate_id},
        {"_id": 0}
    ).sort("timestamp", -1).to_list(100)
    
    return {"events": events}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()