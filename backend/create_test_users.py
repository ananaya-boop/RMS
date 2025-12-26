#!/usr/bin/env python3
"""
Script to create test users for all roles in RMS
"""
import asyncio
import bcrypt
import uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def create_test_users():
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    test_users = [
        {
            "email": "recruiter@rms.com",
            "name": "Sarah Recruiter",
            "role": "recruiter",
            "password": "recruiter123"
        },
        {
            "email": "manager@rms.com",
            "name": "John Manager",
            "role": "hiring_manager",
            "password": "manager123"
        },
        {
            "email": "dpo@rms.com",
            "name": "Alice DPO",
            "role": "dpo",
            "password": "dpo123"
        }
    ]
    
    created_count = 0
    for user_info in test_users:
        # Check if user already exists
        existing_user = await db.users.find_one({"email": user_info["email"]})
        if existing_user:
            print(f"⏭️  User {user_info['email']} already exists, skipping...")
            continue
        
        # Create user
        user_data = {
            "id": str(uuid.uuid4()),
            "email": user_info["email"],
            "name": user_info["name"],
            "role": user_info["role"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "password_hash": bcrypt.hashpw(user_info["password"].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        }
        
        await db.users.insert_one(user_data)
        created_count += 1
        print(f"✅ Created user: {user_info['email']} (Role: {user_info['role']})")
    
    print(f"\n✅ Created {created_count} test users!")
    print("\nTest User Credentials:")
    print("=" * 50)
    print("Admin:")
    print("  Email: admin@rms.com | Password: admin123")
    print("\nRecruiter:")
    print("  Email: recruiter@rms.com | Password: recruiter123")
    print("\nHiring Manager:")
    print("  Email: manager@rms.com | Password: manager123")
    print("\nData Protection Officer:")
    print("  Email: dpo@rms.com | Password: dpo123")
    print("=" * 50)
    
    # Close connection
    client.close()

if __name__ == "__main__":
    asyncio.run(create_test_users())
