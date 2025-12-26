#!/usr/bin/env python3
"""
Seed script to populate RMS with test data for demonstration
"""
import asyncio
import uuid
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
from pathlib import Path
import random

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def seed_database():
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("🌱 Starting database seeding...")
    
    # Get existing users
    users = await db.users.find({}, {"_id": 0}).to_list(10)
    admin = next((u for u in users if u['role'] == 'admin'), users[0])
    recruiter = next((u for u in users if u['role'] == 'recruiter'), users[0])
    
    # ============= CREATE JOB REQUISITIONS =============
    print("\n📋 Creating job requisitions...")
    
    jobs_data = [
        {
            "id": str(uuid.uuid4()),
            "title": "Senior Full Stack Developer",
            "department": "Engineering",
            "location": "Bangalore, Karnataka",
            "description": "We are looking for an experienced Full Stack Developer to join our engineering team. The ideal candidate will have strong experience in React, Node.js, and cloud technologies.",
            "requirements": [
                "5+ years of experience in full stack development",
                "Expert in React, Node.js, and MongoDB",
                "Experience with AWS or Azure",
                "Strong problem-solving skills",
                "Excellent communication skills"
            ],
            "status": "active",
            "created_by": admin['id'],
            "hiring_manager": admin['id'],
            "created_at": (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Data Scientist",
            "department": "Data & Analytics",
            "location": "Hyderabad, Telangana",
            "description": "Seeking a talented Data Scientist to work on ML models and data analysis projects.",
            "requirements": [
                "3+ years in data science",
                "Strong Python skills (pandas, scikit-learn, TensorFlow)",
                "Experience with statistical modeling",
                "SQL expertise",
                "Master's degree in Computer Science or related field"
            ],
            "status": "active",
            "created_by": recruiter['id'],
            "hiring_manager": admin['id'],
            "created_at": (datetime.now(timezone.utc) - timedelta(days=25)).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Product Manager",
            "department": "Product",
            "location": "Mumbai, Maharashtra",
            "description": "Looking for a Product Manager to lead our B2B SaaS product roadmap.",
            "requirements": [
                "4+ years of product management experience",
                "Experience with B2B SaaS products",
                "Strong analytical and strategic thinking",
                "Excellent stakeholder management",
                "MBA preferred"
            ],
            "status": "active",
            "created_by": admin['id'],
            "hiring_manager": admin['id'],
            "created_at": (datetime.now(timezone.utc) - timedelta(days=20)).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "DevOps Engineer",
            "department": "Engineering",
            "location": "Pune, Maharashtra",
            "description": "We need a DevOps Engineer to manage our cloud infrastructure and CI/CD pipelines.",
            "requirements": [
                "3+ years of DevOps experience",
                "Expert in Kubernetes and Docker",
                "Experience with AWS/GCP",
                "Strong scripting skills (Python, Bash)",
                "Knowledge of monitoring tools"
            ],
            "status": "active",
            "created_by": recruiter['id'],
            "created_at": (datetime.now(timezone.utc) - timedelta(days=15)).isoformat()
        }
    ]
    
    # Clear existing jobs and insert new ones
    await db.jobs.delete_many({})
    await db.jobs.insert_many(jobs_data)
    print(f"   ✅ Created {len(jobs_data)} job requisitions")
    
    # ============= CREATE CANDIDATES =============
    print("\n👥 Creating candidates...")
    
    stages = ["sourced", "screened", "technical", "hr_round", "offer", "onboarding", "declined"]
    
    candidates_data = [
        {
            "id": str(uuid.uuid4()),
            "name": "Priya Sharma",
            "email": "priya.sharma@email.com",
            "phone": "+91-9876543210",
            "current_stage": "offer",
            "job_id": jobs_data[0]['id'],
            "job_title": jobs_data[0]['title'],
            "source": "LinkedIn",
            "resume_url": "https://example.com/resumes/priya-sharma.pdf",
            "skills": ["React", "Node.js", "MongoDB", "AWS", "TypeScript"],
            "experience_years": 6,
            "current_company": "Tech Solutions Pvt Ltd",
            "current_designation": "Senior Software Engineer",
            "notice_period": "30 days",
            "expected_ctc": "₹25,00,000",
            "current_ctc": "₹20,00,000",
            "location": "Bangalore",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=28)).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "consent_logs": [{
                "timestamp": (datetime.now(timezone.utc) - timedelta(days=28)).isoformat(),
                "method": "form_upload",
                "consent_given": True,
                "ip_address": "103.21.45.67"
            }],
            "sensitive_data": {
                "pan": "ABCDE1234F",
                "aadhaar_masked": "XXXX-XXXX-1234",
                "uan": None
            },
            "tags": ["hot-profile", "immediate-joiner"]
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Rahul Verma",
            "email": "rahul.verma@email.com",
            "phone": "+91-9876543211",
            "current_stage": "technical",
            "job_id": jobs_data[0]['id'],
            "job_title": jobs_data[0]['title'],
            "source": "Naukri",
            "resume_url": "https://example.com/resumes/rahul-verma.pdf",
            "skills": ["React", "Python", "Django", "PostgreSQL"],
            "experience_years": 5,
            "current_company": "Digital Innovations",
            "current_designation": "Full Stack Developer",
            "notice_period": "60 days",
            "expected_ctc": "₹22,00,000",
            "current_ctc": "₹18,00,000",
            "location": "Bangalore",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=22)).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "consent_logs": [{
                "timestamp": (datetime.now(timezone.utc) - timedelta(days=22)).isoformat(),
                "method": "email_confirmation",
                "consent_given": True,
                "ip_address": "103.21.45.68"
            }],
            "sensitive_data": {
                "pan": "FGHIJ5678K",
                "aadhaar_masked": "XXXX-XXXX-5678",
                "uan": None
            },
            "tags": ["good-fit"]
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Ananya Reddy",
            "email": "ananya.reddy@email.com",
            "phone": "+91-9876543212",
            "current_stage": "hr_round",
            "job_id": jobs_data[1]['id'],
            "job_title": jobs_data[1]['title'],
            "source": "Employee Referral",
            "resume_url": "https://example.com/resumes/ananya-reddy.pdf",
            "skills": ["Python", "Machine Learning", "TensorFlow", "SQL", "Statistics"],
            "experience_years": 4,
            "current_company": "Analytics Corp",
            "current_designation": "Data Scientist",
            "notice_period": "45 days",
            "expected_ctc": "₹28,00,000",
            "current_ctc": "₹22,00,000",
            "location": "Hyderabad",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=18)).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "consent_logs": [{
                "timestamp": (datetime.now(timezone.utc) - timedelta(days=18)).isoformat(),
                "method": "form_upload",
                "consent_given": True,
                "ip_address": "103.21.45.69"
            }],
            "sensitive_data": {
                "pan": "KLMNO9012P",
                "aadhaar_masked": "XXXX-XXXX-9012",
                "uan": None
            },
            "tags": ["referral", "strong-candidate"]
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Arjun Patel",
            "email": "arjun.patel@email.com",
            "phone": "+91-9876543213",
            "current_stage": "screened",
            "job_id": jobs_data[2]['id'],
            "job_title": jobs_data[2]['title'],
            "source": "LinkedIn",
            "resume_url": "https://example.com/resumes/arjun-patel.pdf",
            "skills": ["Product Management", "Agile", "Roadmapping", "Analytics"],
            "experience_years": 5,
            "current_company": "SaaS Startup",
            "current_designation": "Associate Product Manager",
            "notice_period": "30 days",
            "expected_ctc": "₹30,00,000",
            "current_ctc": "₹24,00,000",
            "location": "Mumbai",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=12)).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "consent_logs": [{
                "timestamp": (datetime.now(timezone.utc) - timedelta(days=12)).isoformat(),
                "method": "form_upload",
                "consent_given": True,
                "ip_address": "103.21.45.70"
            }],
            "sensitive_data": {
                "pan": "QRSTU3456V",
                "aadhaar_masked": "XXXX-XXXX-3456",
                "uan": None
            },
            "tags": []
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Sneha Iyer",
            "email": "sneha.iyer@email.com",
            "phone": "+91-9876543214",
            "current_stage": "onboarding",
            "job_id": jobs_data[3]['id'],
            "job_title": jobs_data[3]['title'],
            "source": "Naukri",
            "resume_url": "https://example.com/resumes/sneha-iyer.pdf",
            "skills": ["Kubernetes", "Docker", "AWS", "CI/CD", "Python", "Terraform"],
            "experience_years": 4,
            "current_company": "Cloud Services Ltd",
            "current_designation": "DevOps Engineer",
            "notice_period": "Immediate",
            "expected_ctc": "₹20,00,000",
            "current_ctc": "₹16,00,000",
            "location": "Pune",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=35)).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "consent_logs": [{
                "timestamp": (datetime.now(timezone.utc) - timedelta(days=35)).isoformat(),
                "method": "email_confirmation",
                "consent_given": True,
                "ip_address": "103.21.45.71"
            }],
            "sensitive_data": {
                "pan": "WXYZD7890E",
                "aadhaar_masked": "XXXX-XXXX-7890",
                "uan": "123456789012"
            },
            "tags": ["selected", "joining-soon"]
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Vikram Singh",
            "email": "vikram.singh@email.com",
            "phone": "+91-9876543215",
            "current_stage": "declined",
            "job_id": jobs_data[0]['id'],
            "job_title": jobs_data[0]['title'],
            "source": "LinkedIn",
            "resume_url": "https://example.com/resumes/vikram-singh.pdf",
            "skills": ["Java", "Spring Boot", "MySQL"],
            "experience_years": 3,
            "current_company": "Enterprise Solutions",
            "current_designation": "Software Engineer",
            "notice_period": "90 days",
            "expected_ctc": "₹18,00,000",
            "current_ctc": "₹14,00,000",
            "location": "Delhi",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=20)).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "consent_logs": [{
                "timestamp": (datetime.now(timezone.utc) - timedelta(days=20)).isoformat(),
                "method": "form_upload",
                "consent_given": True,
                "ip_address": "103.21.45.72"
            }],
            "sensitive_data": {
                "pan": "LMNOP1234Q",
                "aadhaar_masked": "XXXX-XXXX-2345",
                "uan": None
            },
            "tags": ["declined"]
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Meera Krishnan",
            "email": "meera.krishnan@email.com",
            "phone": "+91-9876543216",
            "current_stage": "sourced",
            "job_id": jobs_data[1]['id'],
            "job_title": jobs_data[1]['title'],
            "source": "Indeed",
            "resume_url": "https://example.com/resumes/meera-krishnan.pdf",
            "skills": ["Python", "R", "Data Analysis", "Visualization"],
            "experience_years": 3,
            "current_company": "Research Institute",
            "current_designation": "Research Analyst",
            "notice_period": "30 days",
            "expected_ctc": "₹16,00,000",
            "current_ctc": "₹12,00,000",
            "location": "Chennai",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=5)).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "consent_logs": [{
                "timestamp": (datetime.now(timezone.utc) - timedelta(days=5)).isoformat(),
                "method": "form_upload",
                "consent_given": True,
                "ip_address": "103.21.45.73"
            }],
            "sensitive_data": {
                "pan": None,
                "aadhaar_masked": None,
                "uan": None
            },
            "tags": ["new-applicant"]
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Rohan Mehta",
            "email": "rohan.mehta@email.com",
            "phone": "+91-9876543217",
            "current_stage": "technical",
            "job_id": jobs_data[3]['id'],
            "job_title": jobs_data[3]['title'],
            "source": "Employee Referral",
            "resume_url": "https://example.com/resumes/rohan-mehta.pdf",
            "skills": ["Docker", "Kubernetes", "Jenkins", "AWS", "Linux"],
            "experience_years": 3,
            "current_company": "Tech Startup",
            "current_designation": "DevOps Engineer",
            "notice_period": "15 days",
            "expected_ctc": "₹18,00,000",
            "current_ctc": "₹14,00,000",
            "location": "Pune",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=10)).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "consent_logs": [{
                "timestamp": (datetime.now(timezone.utc) - timedelta(days=10)).isoformat(),
                "method": "email_confirmation",
                "consent_given": True,
                "ip_address": "103.21.45.74"
            }],
            "sensitive_data": {
                "pan": "RSTUVW6789X",
                "aadhaar_masked": "XXXX-XXXX-6789",
                "uan": None
            },
            "tags": ["referral"]
        }
    ]
    
    # Clear existing candidates and insert new ones
    await db.candidates.delete_many({})
    await db.candidates.insert_many(candidates_data)
    print(f"   ✅ Created {len(candidates_data)} candidates")
    
    # ============= CREATE INTERVIEW SCHEDULES =============
    print("\n📅 Creating interview schedules...")
    
    schedules_data = [
        {
            "id": str(uuid.uuid4()),
            "candidate_id": candidates_data[0]['id'],
            "candidate_name": candidates_data[0]['name'],
            "job_id": candidates_data[0]['job_id'],
            "interviewer_name": admin['name'],
            "interviewer_email": admin['email'],
            "round_type": "Technical Round",
            "scheduled_time": (datetime.now(timezone.utc) + timedelta(days=2, hours=10)).isoformat(),
            "duration_minutes": 60,
            "meeting_url": "https://meet.google.com/abc-defg-hij",
            "status": "scheduled",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "candidate_id": candidates_data[1]['id'],
            "candidate_name": candidates_data[1]['name'],
            "job_id": candidates_data[1]['job_id'],
            "interviewer_name": recruiter['name'],
            "interviewer_email": recruiter['email'],
            "round_type": "Technical Round",
            "scheduled_time": (datetime.now(timezone.utc) + timedelta(days=1, hours=14)).isoformat(),
            "duration_minutes": 90,
            "meeting_url": "https://zoom.us/j/123456789",
            "status": "scheduled",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "candidate_id": candidates_data[2]['id'],
            "candidate_name": candidates_data[2]['name'],
            "job_id": candidates_data[2]['job_id'],
            "interviewer_name": admin['name'],
            "interviewer_email": admin['email'],
            "round_type": "HR Round",
            "scheduled_time": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat(),
            "duration_minutes": 45,
            "meeting_url": "https://meet.google.com/xyz-uvwx-rst",
            "status": "scheduled",
            "created_at": (datetime.now(timezone.utc) - timedelta(hours=12)).isoformat()
        }
    ]
    
    await db.interview_schedules.delete_many({})
    await db.interview_schedules.insert_many(schedules_data)
    print(f"   ✅ Created {len(schedules_data)} interview schedules")
    
    # ============= CREATE INTERVIEW SCORECARDS =============
    print("\n📝 Creating interview scorecards...")
    
    scorecards_data = [
        {
            "id": str(uuid.uuid4()),
            "candidate_id": candidates_data[0]['id'],
            "candidate_name": candidates_data[0]['name'],
            "job_id": candidates_data[0]['job_id'],
            "interviewer_name": admin['name'],
            "interviewer_email": admin['email'],
            "round_type": "Technical Round",
            "ratings": {
                "technical_skills": 9,
                "problem_solving": 8,
                "communication": 9,
                "cultural_fit": 8
            },
            "overall_rating": 8.5,
            "feedback": "Excellent technical skills. Strong understanding of React and Node.js. Good problem-solving approach. Communication is clear and confident. Recommended for next round.",
            "recommendation": "strong_yes",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=5)).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "candidate_id": candidates_data[2]['id'],
            "candidate_name": candidates_data[2]['name'],
            "job_id": candidates_data[2]['job_id'],
            "interviewer_name": recruiter['name'],
            "interviewer_email": recruiter['email'],
            "round_type": "Technical Round",
            "ratings": {
                "technical_skills": 8,
                "problem_solving": 9,
                "communication": 8,
                "cultural_fit": 9
            },
            "overall_rating": 8.5,
            "feedback": "Strong ML knowledge and practical experience. Good understanding of statistical concepts. Python skills are excellent. Team player with good communication.",
            "recommendation": "yes",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=8)).isoformat()
        }
    ]
    
    await db.interview_scorecards.delete_many({})
    await db.interview_scorecards.insert_many(scorecards_data)
    print(f"   ✅ Created {len(scorecards_data)} interview scorecards")
    
    # ============= CREATE WITHDRAWAL REQUESTS =============
    print("\n🚪 Creating withdrawal requests...")
    
    withdrawal_requests_data = [
        {
            "id": str(uuid.uuid4()),
            "candidate_id": candidates_data[5]['id'],
            "candidate_name": candidates_data[5]['name'],
            "candidate_email": candidates_data[5]['email'],
            "reason": "accepted_other_offer",
            "additional_notes": "I have received and accepted an offer from another company that better aligns with my career goals.",
            "purge_data": True,
            "status": "pending",
            "requested_at": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat(),
            "processed_at": None,
            "processed_by": None
        },
        {
            "id": str(uuid.uuid4()),
            "candidate_id": candidates_data[3]['id'],
            "candidate_name": candidates_data[3]['name'],
            "candidate_email": candidates_data[3]['email'],
            "reason": "personal_reasons",
            "additional_notes": "Due to personal commitments, I need to withdraw my application at this time.",
            "purge_data": False,
            "status": "pending",
            "requested_at": (datetime.now(timezone.utc) - timedelta(hours=18)).isoformat(),
            "processed_at": None,
            "processed_by": None
        }
    ]
    
    await db.withdrawal_requests.delete_many({})
    await db.withdrawal_requests.insert_many(withdrawal_requests_data)
    print(f"   ✅ Created {len(withdrawal_requests_data)} withdrawal requests")
    
    # ============= CREATE LIFECYCLE EVENTS =============
    print("\n🔄 Creating lifecycle events...")
    
    lifecycle_events_data = []
    
    # Events for Priya (offer stage)
    lifecycle_events_data.extend([
        {
            "id": str(uuid.uuid4()),
            "candidate_id": candidates_data[0]['id'],
            "event_type": "stage_change",
            "from_stage": "sourced",
            "to_stage": "screened",
            "performed_by": recruiter['name'],
            "timestamp": (datetime.now(timezone.utc) - timedelta(days=26)).isoformat(),
            "metadata": {}
        },
        {
            "id": str(uuid.uuid4()),
            "candidate_id": candidates_data[0]['id'],
            "event_type": "stage_change",
            "from_stage": "screened",
            "to_stage": "technical",
            "performed_by": recruiter['name'],
            "timestamp": (datetime.now(timezone.utc) - timedelta(days=20)).isoformat(),
            "metadata": {}
        },
        {
            "id": str(uuid.uuid4()),
            "candidate_id": candidates_data[0]['id'],
            "event_type": "stage_change",
            "from_stage": "technical",
            "to_stage": "hr_round",
            "performed_by": admin['name'],
            "timestamp": (datetime.now(timezone.utc) - timedelta(days=15)).isoformat(),
            "metadata": {}
        },
        {
            "id": str(uuid.uuid4()),
            "candidate_id": candidates_data[0]['id'],
            "event_type": "stage_change",
            "from_stage": "hr_round",
            "to_stage": "offer",
            "performed_by": admin['name'],
            "timestamp": (datetime.now(timezone.utc) - timedelta(days=8)).isoformat(),
            "metadata": {}
        }
    ])
    
    await db.lifecycle_events.delete_many({})
    await db.lifecycle_events.insert_many(lifecycle_events_data)
    print(f"   ✅ Created {len(lifecycle_events_data)} lifecycle events")
    
    # ============= CREATE POSH REPORTS =============
    print("\n⚖️ Creating POSH reports...")
    
    posh_reports_data = [
        {
            "id": str(uuid.uuid4()),
            "reporter_name": "Anonymous",
            "reporter_email": "anonymous@internal.com",
            "incident_date": (datetime.now(timezone.utc) - timedelta(days=15)).isoformat(),
            "incident_description": "Inappropriate comments made during team meeting",
            "accused_person": "External Candidate (Interview Process)",
            "witnesses": [],
            "status": "under_review",
            "filed_at": (datetime.now(timezone.utc) - timedelta(days=10)).isoformat(),
            "severity": "medium",
            "action_taken": None
        }
    ]
    
    await db.posh_reports.delete_many({})
    await db.posh_reports.insert_many(posh_reports_data)
    print(f"   ✅ Created {len(posh_reports_data)} POSH reports")
    
    # Close connection
    client.close()
    
    print("\n" + "="*60)
    print("✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!")
    print("="*60)
    print("\n📊 Summary:")
    print(f"   • {len(jobs_data)} Job Requisitions")
    print(f"   • {len(candidates_data)} Candidates (across all stages)")
    print(f"   • {len(schedules_data)} Interview Schedules")
    print(f"   • {len(scorecards_data)} Interview Scorecards")
    print(f"   • {len(withdrawal_requests_data)} Withdrawal Requests")
    print(f"   • {len(lifecycle_events_data)} Lifecycle Events")
    print(f"   • {len(posh_reports_data)} POSH Reports")
    print("\n🎯 You can now:")
    print("   1. View the Kanban board with candidates in different stages")
    print("   2. Check interview schedules")
    print("   3. Process withdrawal requests")
    print("   4. View candidate profiles with full history")
    print("   5. Access compliance dashboard and reports")
    print("\n🔐 Login with: admin@rms.com / admin123")

if __name__ == "__main__":
    asyncio.run(seed_database())
