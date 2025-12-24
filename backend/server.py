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