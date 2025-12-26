#!/usr/bin/env python3
"""
Script to create default admin user for RMS
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

async def create_admin_user():
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    # Check if admin already exists
    existing_admin = await db.users.find_one({"email": "admin@rms.com"})
    if existing_admin:
        print("✅ Admin user already exists!")
        return
    
    # Create admin user
    admin_data = {
        "id": str(uuid.uuid4()),
        "email": "admin@rms.com",
        "name": "Admin User",
        "role": "admin",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "password_hash": bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    }
    
    await db.users.insert_one(admin_data)
    print("✅ Admin user created successfully!")
    print(f"   Email: admin@rms.com")
    print(f"   Password: admin123")
    print(f"   Role: admin")
    
    # Close connection
    client.close()

if __name__ == "__main__":
    asyncio.run(create_admin_user())
