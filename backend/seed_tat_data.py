#!/usr/bin/env python3
"""
Seed script to populate TAT analytics test data
Creates realistic pipeline logs and TAT summaries for testing
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

async def seed_tat_data():
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("🎯 Starting TAT Analytics Test Data Seeding...")
    
    # Get existing candidates and jobs
    candidates = await db.candidates.find({}, {"_id": 0}).to_list(100)
    jobs = await db.jobs.find({}, {"_id": 0}).to_list(10)
    
    if not candidates or not jobs:
        print("❌ No candidates or jobs found. Please run seed_database.py first!")
        return
    
    print(f"   Found {len(candidates)} candidates and {len(jobs)} jobs")
    
    # Clear existing TAT data
    await db.pipeline_logs.delete_many({})
    await db.candidate_tat_summary.delete_many({})
    print("   ✅ Cleared existing TAT data")
    
    # ============= CREATE PIPELINE LOGS =============
    print("\n📝 Creating pipeline logs with realistic timestamps...")
    
    pipeline_logs = []
    candidate_tat_summaries = []
    
    # Scenario 1: Fast hire - Sneha Iyer (DevOps Engineer) - COMPLETED
    sneha = next((c for c in candidates if c['name'] == 'Sneha Iyer'), None)
    if sneha:
        base_time = datetime.now(timezone.utc) - timedelta(days=15)
        
        stages = [
            ("sourced", "screening", 1),      # 1 day in sourced
            ("screening", "technical", 0.5),  # 12 hours in screening
            ("technical", "round_2_recommended", 2), # 2 days in Round 1
            ("round_2_recommended", "hr_round", 1.5), # 1.5 days in Round 2
            ("hr_round", "offer", 1),         # 1 day in HR (within threshold)
            ("offer", "onboarding", 2)        # 2 days in Offer (within threshold)
        ]
        
        current_time = base_time
        stage_tats = {}
        
        for from_stage, to_stage, days_spent in stages:
            time_in_stage_hours = days_spent * 24
            stage_tats[from_stage] = time_in_stage_hours
            
            log = {
                "id": str(uuid.uuid4()),
                "candidate_id": sneha['id'],
                "candidate_name": sneha['name'],
                "job_id": sneha['job_id'],
                "job_title": sneha.get('job_title', 'DevOps Engineer'),
                "from_stage": from_stage,
                "to_stage": to_stage,
                "transition_timestamp": current_time.isoformat(),
                "time_in_previous_stage_hours": time_in_stage_hours,
                "time_in_previous_stage_days": days_spent,
                "performed_by": "recruiter@rms.com",
                "performed_by_name": "Sarah Recruiter",
                "notes": f"Stage transition: {from_stage} → {to_stage}",
                "stage_entry_timestamp": (current_time - timedelta(days=days_spent)).isoformat(),
                "stage_exit_timestamp": current_time.isoformat(),
                "created_at": current_time.isoformat()
            }
            pipeline_logs.append(log)
            current_time += timedelta(days=days_spent)
        
        # Create TAT summary for Sneha (Fast hire - 9 days total)
        tat_summary = {
            "id": str(uuid.uuid4()),
            "candidate_id": sneha['id'],
            "candidate_name": sneha['name'],
            "job_id": sneha['job_id'],
            "job_title": sneha.get('job_title', 'DevOps Engineer'),
            "stage_tats": stage_tats,
            "screening_tat_hours": stage_tats.get('sourced', 0) + stage_tats.get('screening', 0),
            "screening_tat_days": 1.5,
            "technical_tat_hours": stage_tats.get('technical', 0) + stage_tats.get('round_2_recommended', 0),
            "technical_tat_days": 3.5,
            "hr_tat_hours": stage_tats.get('hr_round', 0),
            "hr_tat_days": 1,
            "offer_tat_hours": stage_tats.get('offer', 0),
            "offer_tat_days": 2,
            "total_tat_hours": sum(stage_tats.values()),
            "total_tat_days": 9,
            "exceeded_thresholds": [],  # All within threshold
            "current_stage": "onboarding",
            "is_completed": True,
            "completion_date": current_time.isoformat(),
            "last_updated": datetime.now(timezone.utc).isoformat()
        }
        candidate_tat_summaries.append(tat_summary)
        print(f"   ✅ Sneha Iyer - Fast hire (9 days, all within thresholds)")
    
    # Scenario 2: Slow hire with exceeded TAT - Priya Sharma (Senior Developer) - AT OFFER
    priya = next((c for c in candidates if c['name'] == 'Priya Sharma'), None)
    if priya:
        base_time = datetime.now(timezone.utc) - timedelta(days=28)
        
        stages = [
            ("sourced", "screening", 2),      # 2 days in sourced
            ("screening", "technical", 1),    # 1 day in screening
            ("technical", "round_2_recommended", 3), # 3 days in Round 1
            ("round_2_recommended", "round_3_final", 2.5), # 2.5 days in Round 2
            ("round_3_final", "hr_round", 2), # 2 days in Round 3
            ("hr_round", "offer", 3.5),       # 3.5 days in HR (EXCEEDED 2-day threshold)
            # Currently in offer for 5 days (EXCEEDED 3-day threshold)
        ]
        
        current_time = base_time
        stage_tats = {}
        
        for from_stage, to_stage, days_spent in stages:
            time_in_stage_hours = days_spent * 24
            stage_tats[from_stage] = time_in_stage_hours
            
            log = {
                "id": str(uuid.uuid4()),
                "candidate_id": priya['id'],
                "candidate_name": priya['name'],
                "job_id": priya['job_id'],
                "job_title": priya.get('job_title', 'Senior Full Stack Developer'),
                "from_stage": from_stage,
                "to_stage": to_stage,
                "transition_timestamp": current_time.isoformat(),
                "time_in_previous_stage_hours": time_in_stage_hours,
                "time_in_previous_stage_days": days_spent,
                "performed_by": "recruiter@rms.com",
                "performed_by_name": "Sarah Recruiter",
                "notes": f"Stage transition: {from_stage} → {to_stage}",
                "stage_entry_timestamp": (current_time - timedelta(days=days_spent)).isoformat(),
                "stage_exit_timestamp": current_time.isoformat(),
                "created_at": current_time.isoformat()
            }
            pipeline_logs.append(log)
            current_time += timedelta(days=days_spent)
        
        # Add current time in offer stage (5 days - EXCEEDED)
        stage_tats['offer'] = 5 * 24
        
        # Create TAT summary for Priya (Slow hire - 21 days, exceeded HR and Offer)
        tat_summary = {
            "id": str(uuid.uuid4()),
            "candidate_id": priya['id'],
            "candidate_name": priya['name'],
            "job_id": priya['job_id'],
            "job_title": priya.get('job_title', 'Senior Full Stack Developer'),
            "stage_tats": stage_tats,
            "screening_tat_hours": (stage_tats.get('sourced', 0) + stage_tats.get('screening', 0)),
            "screening_tat_days": 3,
            "technical_tat_hours": (stage_tats.get('technical', 0) + stage_tats.get('round_2_recommended', 0) + stage_tats.get('round_3_final', 0)),
            "technical_tat_days": 7.5,
            "hr_tat_hours": stage_tats.get('hr_round', 0),
            "hr_tat_days": 3.5,
            "offer_tat_hours": stage_tats.get('offer', 0),
            "offer_tat_days": 5,
            "total_tat_hours": sum(stage_tats.values()),
            "total_tat_days": 21,
            "exceeded_thresholds": ["hr_round", "offer"],  # Exceeded both
            "current_stage": "offer",
            "is_completed": False,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }
        candidate_tat_summaries.append(tat_summary)
        print(f"   ⚠️  Priya Sharma - Slow hire (21 days, exceeded HR & Offer thresholds)")
    
    # Scenario 3: Average hire - Ananya Reddy (Data Scientist) - COMPLETED
    ananya = next((c for c in candidates if c['name'] == 'Ananya Reddy'), None)
    if ananya:
        base_time = datetime.now(timezone.utc) - timedelta(days=20)
        
        stages = [
            ("sourced", "screening", 1.5),    # 1.5 days in sourced
            ("screening", "technical", 1),    # 1 day in screening
            ("technical", "round_2_recommended", 2.5), # 2.5 days in Round 1
            ("round_2_recommended", "round_3_final", 2), # 2 days in Round 2
            ("round_3_final", "hr_round", 2), # 2 days in Round 3
            ("hr_round", "offer", 2),         # 2 days in HR (within threshold)
            ("offer", "onboarding", 3)        # 3 days in Offer (within threshold)
        ]
        
        current_time = base_time
        stage_tats = {}
        
        for from_stage, to_stage, days_spent in stages:
            time_in_stage_hours = days_spent * 24
            stage_tats[from_stage] = time_in_stage_hours
            
            log = {
                "id": str(uuid.uuid4()),
                "candidate_id": ananya['id'],
                "candidate_name": ananya['name'],
                "job_id": ananya['job_id'],
                "job_title": ananya.get('job_title', 'Data Scientist'),
                "from_stage": from_stage,
                "to_stage": to_stage,
                "transition_timestamp": current_time.isoformat(),
                "time_in_previous_stage_hours": time_in_stage_hours,
                "time_in_previous_stage_days": days_spent,
                "performed_by": "admin@rms.com",
                "performed_by_name": "Admin User",
                "notes": f"Stage transition: {from_stage} → {to_stage}",
                "stage_entry_timestamp": (current_time - timedelta(days=days_spent)).isoformat(),
                "stage_exit_timestamp": current_time.isoformat(),
                "created_at": current_time.isoformat()
            }
            pipeline_logs.append(log)
            current_time += timedelta(days=days_spent)
        
        # Create TAT summary for Ananya (Average hire - 16 days)
        tat_summary = {
            "id": str(uuid.uuid4()),
            "candidate_id": ananya['id'],
            "candidate_name": ananya['name'],
            "job_id": ananya['job_id'],
            "job_title": ananya.get('job_title', 'Data Scientist'),
            "stage_tats": stage_tats,
            "screening_tat_hours": stage_tats.get('sourced', 0) + stage_tats.get('screening', 0),
            "screening_tat_days": 2.5,
            "technical_tat_hours": stage_tats.get('technical', 0) + stage_tats.get('round_2_recommended', 0) + stage_tats.get('round_3_final', 0),
            "technical_tat_days": 6.5,
            "hr_tat_hours": stage_tats.get('hr_round', 0),
            "hr_tat_days": 2,
            "offer_tat_hours": stage_tats.get('offer', 0),
            "offer_tat_days": 3,
            "total_tat_hours": sum(stage_tats.values()),
            "total_tat_days": 16,
            "exceeded_thresholds": [],  # All within threshold
            "current_stage": "onboarding",
            "is_completed": True,
            "completion_date": current_time.isoformat(),
            "last_updated": datetime.now(timezone.utc).isoformat()
        }
        candidate_tat_summaries.append(tat_summary)
        print(f"   ✅ Ananya Reddy - Average hire (16 days, within thresholds)")
    
    # Scenario 4: Currently in HR Round - Rahul Verma (Senior Developer)
    rahul = next((c for c in candidates if c['name'] == 'Rahul Verma'), None)
    if rahul:
        base_time = datetime.now(timezone.utc) - timedelta(days=12)
        
        stages = [
            ("sourced", "screening", 1),      # 1 day in sourced
            ("screening", "technical", 1.5),  # 1.5 days in screening
            ("technical", "round_2_recommended", 3), # 3 days in Round 1
            ("round_2_recommended", "hr_round", 2.5), # 2.5 days in Round 2
            # Currently in hr_round for 4 days (EXCEEDED 2-day threshold)
        ]
        
        current_time = base_time
        stage_tats = {}
        
        for from_stage, to_stage, days_spent in stages:
            time_in_stage_hours = days_spent * 24
            stage_tats[from_stage] = time_in_stage_hours
            
            log = {
                "id": str(uuid.uuid4()),
                "candidate_id": rahul['id'],
                "candidate_name": rahul['name'],
                "job_id": rahul['job_id'],
                "job_title": rahul.get('job_title', 'Senior Full Stack Developer'),
                "from_stage": from_stage,
                "to_stage": to_stage,
                "transition_timestamp": current_time.isoformat(),
                "time_in_previous_stage_hours": time_in_stage_hours,
                "time_in_previous_stage_days": days_spent,
                "performed_by": "recruiter@rms.com",
                "performed_by_name": "Sarah Recruiter",
                "notes": f"Stage transition: {from_stage} → {to_stage}",
                "stage_entry_timestamp": (current_time - timedelta(days=days_spent)).isoformat(),
                "stage_exit_timestamp": current_time.isoformat(),
                "created_at": current_time.isoformat()
            }
            pipeline_logs.append(log)
            current_time += timedelta(days=days_spent)
        
        # Currently in hr_round for 4 days
        stage_tats['hr_round'] = 4 * 24
        
        # Create TAT summary for Rahul (In progress, exceeded HR threshold)
        tat_summary = {
            "id": str(uuid.uuid4()),
            "candidate_id": rahul['id'],
            "candidate_name": rahul['name'],
            "job_id": rahul['job_id'],
            "job_title": rahul.get('job_title', 'Senior Full Stack Developer'),
            "stage_tats": stage_tats,
            "screening_tat_hours": stage_tats.get('sourced', 0) + stage_tats.get('screening', 0),
            "screening_tat_days": 2.5,
            "technical_tat_hours": stage_tats.get('technical', 0) + stage_tats.get('round_2_recommended', 0),
            "technical_tat_days": 5.5,
            "hr_tat_hours": stage_tats.get('hr_round', 0),
            "hr_tat_days": 4,
            "offer_tat_hours": 0,
            "offer_tat_days": 0,
            "total_tat_hours": sum(stage_tats.values()),
            "total_tat_days": 12,
            "exceeded_thresholds": ["hr_round"],  # Stuck in HR Round
            "current_stage": "hr_round",
            "is_completed": False,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }
        candidate_tat_summaries.append(tat_summary)
        print(f"   ⚠️  Rahul Verma - Stuck in HR Round (12 days so far, HR exceeded)")
    
    # Scenario 5: Quick hire - Rohan Mehta (DevOps Engineer) - COMPLETED
    rohan = next((c for c in candidates if c['name'] == 'Rohan Mehta'), None)
    if rohan:
        base_time = datetime.now(timezone.utc) - timedelta(days=10)
        
        stages = [
            ("sourced", "screening", 0.5),    # 12 hours in sourced
            ("screening", "technical", 0.5),  # 12 hours in screening
            ("technical", "hr_round", 3),     # 3 days in technical
            ("hr_round", "offer", 1.5),       # 1.5 days in HR
            ("offer", "onboarding", 2)        # 2 days in Offer
        ]
        
        current_time = base_time
        stage_tats = {}
        
        for from_stage, to_stage, days_spent in stages:
            time_in_stage_hours = days_spent * 24
            stage_tats[from_stage] = time_in_stage_hours
            
            log = {
                "id": str(uuid.uuid4()),
                "candidate_id": rohan['id'],
                "candidate_name": rohan['name'],
                "job_id": rohan['job_id'],
                "job_title": rohan.get('job_title', 'DevOps Engineer'),
                "from_stage": from_stage,
                "to_stage": to_stage,
                "transition_timestamp": current_time.isoformat(),
                "time_in_previous_stage_hours": time_in_stage_hours,
                "time_in_previous_stage_days": days_spent,
                "performed_by": "recruiter@rms.com",
                "performed_by_name": "Sarah Recruiter",
                "notes": f"Stage transition: {from_stage} → {to_stage}",
                "stage_entry_timestamp": (current_time - timedelta(days=days_spent)).isoformat(),
                "stage_exit_timestamp": current_time.isoformat(),
                "created_at": current_time.isoformat()
            }
            pipeline_logs.append(log)
            current_time += timedelta(days=days_spent)
        
        # Create TAT summary for Rohan (Quick hire - 7.5 days)
        tat_summary = {
            "id": str(uuid.uuid4()),
            "candidate_id": rohan['id'],
            "candidate_name": rohan['name'],
            "job_id": rohan['job_id'],
            "job_title": rohan.get('job_title', 'DevOps Engineer'),
            "stage_tats": stage_tats,
            "screening_tat_hours": stage_tats.get('sourced', 0) + stage_tats.get('screening', 0),
            "screening_tat_days": 1,
            "technical_tat_hours": stage_tats.get('technical', 0),
            "technical_tat_days": 3,
            "hr_tat_hours": stage_tats.get('hr_round', 0),
            "hr_tat_days": 1.5,
            "offer_tat_hours": stage_tats.get('offer', 0),
            "offer_tat_days": 2,
            "total_tat_hours": sum(stage_tats.values()),
            "total_tat_days": 7.5,
            "exceeded_thresholds": [],  # All within threshold
            "current_stage": "onboarding",
            "is_completed": True,
            "completion_date": current_time.isoformat(),
            "last_updated": datetime.now(timezone.utc).isoformat()
        }
        candidate_tat_summaries.append(tat_summary)
        print(f"   ✅ Rohan Mehta - Quick hire (7.5 days, fastest hire)")
    
    # Insert all pipeline logs
    if pipeline_logs:
        await db.pipeline_logs.insert_many(pipeline_logs)
        print(f"\n   ✅ Created {len(pipeline_logs)} pipeline log entries")
    
    # Insert all TAT summaries
    if candidate_tat_summaries:
        await db.candidate_tat_summary.insert_many(candidate_tat_summaries)
        print(f"   ✅ Created {len(candidate_tat_summaries)} TAT summaries")
    
    # Update candidate current_stage to match TAT data
    print("\n📊 Updating candidate stages to match TAT data...")
    await db.candidates.update_one(
        {"id": sneha['id']},
        {"$set": {"current_stage": "onboarding", "stage": "onboarding"}}
    )
    await db.candidates.update_one(
        {"id": priya['id']},
        {"$set": {"current_stage": "offer", "stage": "offer"}}
    )
    await db.candidates.update_one(
        {"id": ananya['id']},
        {"$set": {"current_stage": "onboarding", "stage": "onboarding"}}
    )
    await db.candidates.update_one(
        {"id": rahul['id']},
        {"$set": {"current_stage": "hr_round", "stage": "hr_round"}}
    )
    await db.candidates.update_one(
        {"id": rohan['id']},
        {"$set": {"current_stage": "onboarding", "stage": "onboarding"}}
    )
    print("   ✅ Updated candidate stages")
    
    # Close connection
    client.close()
    
    print("\n" + "="*60)
    print("✅ TAT ANALYTICS TEST DATA SEEDING COMPLETED!")
    print("="*60)
    
    print("\n📊 Test Scenarios Created:")
    print("\n1. ✅ Sneha Iyer (DevOps Engineer)")
    print("   - Status: Completed (Onboarding)")
    print("   - Total TAT: 9 days")
    print("   - Exceeded: None (Fast hire)")
    
    print("\n2. ⚠️  Priya Sharma (Senior Full Stack Developer)")
    print("   - Status: In Progress (Offer stage)")
    print("   - Total TAT: 21 days so far")
    print("   - Exceeded: HR Round (3.5d > 2d), Offer (5d > 3d)")
    print("   - 🔴 RED MARKERS SHOULD APPEAR")
    
    print("\n3. ✅ Ananya Reddy (Data Scientist)")
    print("   - Status: Completed (Onboarding)")
    print("   - Total TAT: 16 days")
    print("   - Exceeded: None (Average hire)")
    
    print("\n4. ⚠️  Rahul Verma (Senior Full Stack Developer)")
    print("   - Status: In Progress (HR Round)")
    print("   - Total TAT: 12 days so far")
    print("   - Exceeded: HR Round (4d > 2d)")
    print("   - 🔴 STUCK IN HR ROUND")
    
    print("\n5. ✅ Rohan Mehta (DevOps Engineer)")
    print("   - Status: Completed (Onboarding)")
    print("   - Total TAT: 7.5 days")
    print("   - Exceeded: None (Fastest hire)")
    
    print("\n🎯 Expected Dashboard Metrics:")
    print("   • Average Total TAT: ~12.4 days (across 4 completed)")
    print("   • Target: 21 days")
    print("   • Status: ✓ ON TRACK (faster than target)")
    print("   • Fastest Hire: 7.5 days (Rohan)")
    print("   • Slowest Hire: 21 days (Priya)")
    print("   • Candidates Exceeded: 2 out of 5")
    
    print("\n🧪 How to Test:")
    print("   1. Login to Dashboard")
    print("   2. Scroll to 'Time to Hire (TAT)' card")
    print("   3. See Average Total TAT: ~12.4 days")
    print("   4. Check bifurcated TAT breakdown:")
    print("      - Screening: ~1.7d (green)")
    print("      - Technical: ~4.6d (green)")
    print("      - HR Round: ~2.2d (yellow/red)")
    print("      - Offer: ~2.5d (green)")
    print("   5. Filter by 'Senior Full Stack Developer':")
    print("      - Should show 2 candidates")
    print("      - Higher average TAT (16.5 days)")
    print("      - Both exceeded HR/Offer thresholds")
    print("   6. Filter by 'DevOps Engineer':")
    print("      - Should show 2 candidates")
    print("      - Lower average TAT (8.25 days)")
    print("      - None exceeded thresholds")
    
    print("\n🔍 API Testing:")
    print("   # Get overview")
    print("   curl -H 'Authorization: Bearer <token>' \\")
    print("     http://localhost:8001/api/analytics/tat/overview")
    print("\n   # Get job-specific TAT")
    print("   curl -H 'Authorization: Bearer <token>' \\")
    print("     http://localhost:8001/api/analytics/tat/job/<job_id>")
    print("\n   # Get candidate TAT")
    print("   curl -H 'Authorization: Bearer <token>' \\")
    print("     http://localhost:8001/api/analytics/tat/candidate/<candidate_id>")
    print("\n   # Get exceeded candidates")
    print("   curl -H 'Authorization: Bearer <token>' \\")
    print("     http://localhost:8001/api/analytics/tat/exceeded")

if __name__ == "__main__":
    asyncio.run(seed_tat_data())
