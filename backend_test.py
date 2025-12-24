#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import uuid

class RMSAPITester:
    def __init__(self, base_url="https://chat-rms.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.test_job_id = None
        self.test_candidate_id = None

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
            self.failed_tests.append({"test": name, "error": details})

    def make_request(self, method, endpoint, data=None, files=None):
        """Make HTTP request with proper headers"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        if files:
            headers.pop('Content-Type', None)  # Let requests set it for multipart

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, headers=headers, data=data)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)
            
            return response
        except Exception as e:
            return None

    def test_auth_register(self):
        """Test user registration"""
        test_email = f"test_user_{uuid.uuid4().hex[:8]}@rms.com"
        data = {
            "email": test_email,
            "password": "testpass123",
            "name": "Test User",
            "role": "recruiter"
        }
        
        response = self.make_request('POST', 'auth/register', data)
        success = response and response.status_code == 200
        
        if success:
            self.test_user_email = test_email
            self.test_user_password = "testpass123"
        
        self.log_test("User Registration", success, 
                     f"Status: {response.status_code if response else 'No response'}")
        return success

    def test_auth_login(self):
        """Test user login"""
        # First try with admin user
        data = {
            "email": "admin@rms.com",
            "password": "admin123"
        }
        
        response = self.make_request('POST', 'auth/login', data)
        success = response and response.status_code == 200
        
        if success:
            response_data = response.json()
            self.token = response_data.get('access_token')
            self.user_data = response_data.get('user')
        
        self.log_test("Admin Login", success, 
                     f"Status: {response.status_code if response else 'No response'}")
        return success

    def test_auth_me(self):
        """Test get current user"""
        response = self.make_request('GET', 'auth/me')
        success = response and response.status_code == 200
        
        self.log_test("Get Current User", success, 
                     f"Status: {response.status_code if response else 'No response'}")
        return success

    def test_create_job(self):
        """Test job creation"""
        data = {
            "title": "Senior Python Developer",
            "department": "Engineering",
            "location": "Bangalore, India",
            "description": "We are looking for a senior Python developer with FastAPI experience.",
            "requirements": ["5+ years Python", "FastAPI experience", "MongoDB knowledge"]
        }
        
        response = self.make_request('POST', 'jobs', data)
        success = response and response.status_code == 200
        
        if success:
            job_data = response.json()
            self.test_job_id = job_data.get('id')
        
        self.log_test("Create Job", success, 
                     f"Status: {response.status_code if response else 'No response'}")
        return success

    def test_get_jobs(self):
        """Test get all jobs"""
        response = self.make_request('GET', 'jobs')
        success = response and response.status_code == 200
        
        if success:
            jobs = response.json()
            success = isinstance(jobs, list)
        
        self.log_test("Get Jobs", success, 
                     f"Status: {response.status_code if response else 'No response'}")
        return success

    def test_get_job_by_id(self):
        """Test get specific job"""
        if not self.test_job_id:
            self.log_test("Get Job by ID", False, "No test job ID available")
            return False
        
        response = self.make_request('GET', f'jobs/{self.test_job_id}')
        success = response and response.status_code == 200
        
        self.log_test("Get Job by ID", success, 
                     f"Status: {response.status_code if response else 'No response'}")
        return success

    def test_create_candidate(self):
        """Test candidate creation"""
        if not self.test_job_id:
            self.log_test("Create Candidate", False, "No test job ID available")
            return False
        
        data = {
            "job_id": self.test_job_id,
            "name": "John Doe",
            "email": f"john.doe.{uuid.uuid4().hex[:8]}@example.com",
            "phone": "+91-9876543210",
            "skills": ["Python", "FastAPI", "MongoDB"],
            "experience_years": 5
        }
        
        response = self.make_request('POST', 'candidates', data)
        success = response and response.status_code == 200
        
        if success:
            candidate_data = response.json()
            self.test_candidate_id = candidate_data.get('id')
        
        self.log_test("Create Candidate", success, 
                     f"Status: {response.status_code if response else 'No response'}")
        return success

    def test_get_candidates(self):
        """Test get all candidates"""
        response = self.make_request('GET', 'candidates')
        success = response and response.status_code == 200
        
        self.log_test("Get Candidates", success, 
                     f"Status: {response.status_code if response else 'No response'}")
        return success

    def test_get_candidate_by_id(self):
        """Test get specific candidate"""
        if not self.test_candidate_id:
            self.log_test("Get Candidate by ID", False, "No test candidate ID available")
            return False
        
        response = self.make_request('GET', f'candidates/{self.test_candidate_id}')
        success = response and response.status_code == 200
        
        self.log_test("Get Candidate by ID", success, 
                     f"Status: {response.status_code if response else 'No response'}")
        return success

    def test_update_candidate_stage(self):
        """Test candidate stage update"""
        if not self.test_candidate_id:
            self.log_test("Update Candidate Stage", False, "No test candidate ID available")
            return False
        
        data = {"stage": "screened"}
        response = self.make_request('PUT', f'candidates/{self.test_candidate_id}/stage', data)
        success = response and response.status_code == 200
        
        self.log_test("Update Candidate Stage", success, 
                     f"Status: {response.status_code if response else 'No response'}")
        return success

    def test_create_scorecard(self):
        """Test scorecard creation"""
        if not self.test_candidate_id:
            self.log_test("Create Scorecard", False, "No test candidate ID available")
            return False
        
        data = {
            "candidate_id": self.test_candidate_id,
            "interviewer_name": "Test Interviewer",
            "interviewer_email": "interviewer@rms.com",
            "round_name": "Technical Round",
            "rating": 4,
            "feedback": "Good technical skills, needs improvement in system design",
            "recommendation": "hire"
        }
        
        response = self.make_request('POST', 'scorecards', data)
        success = response and response.status_code == 200
        
        self.log_test("Create Scorecard", success, 
                     f"Status: {response.status_code if response else 'No response'}")
        return success

    def test_get_scorecards(self):
        """Test get scorecards"""
        response = self.make_request('GET', 'scorecards')
        success = response and response.status_code == 200
        
        self.log_test("Get Scorecards", success, 
                     f"Status: {response.status_code if response else 'No response'}")
        return success

    def test_create_posh_report(self):
        """Test POSH report creation"""
        if not self.test_candidate_id:
            self.log_test("Create POSH Report", False, "No test candidate ID available")
            return False
        
        data = {
            "candidate_id": self.test_candidate_id,
            "incident_type": "Inappropriate behavior",
            "description": "Test incident report for compliance testing"
        }
        
        response = self.make_request('POST', 'posh-reports', data)
        success = response and response.status_code == 200
        
        self.log_test("Create POSH Report", success, 
                     f"Status: {response.status_code if response else 'No response'}")
        return success

    def test_get_posh_reports(self):
        """Test get POSH reports (admin only)"""
        response = self.make_request('GET', 'posh-reports')
        success = response and response.status_code == 200
        
        self.log_test("Get POSH Reports", success, 
                     f"Status: {response.status_code if response else 'No response'}")
        return success

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        response = self.make_request('GET', 'dashboard/stats')
        success = response and response.status_code == 200
        
        if success:
            stats = response.json()
            required_keys = ['total_jobs', 'total_candidates', 'stage_distribution']
            success = all(key in stats for key in required_keys)
        
        self.log_test("Dashboard Stats", success, 
                     f"Status: {response.status_code if response else 'No response'}")
        return success

    def test_export_candidate_data(self):
        """Test candidate data export (DPDP compliance)"""
        if not self.test_candidate_id:
            self.log_test("Export Candidate Data", False, "No test candidate ID available")
            return False
        
        response = self.make_request('GET', f'candidates/{self.test_candidate_id}/export')
        success = response and response.status_code == 200
        
        if success:
            export_data = response.json()
            success = 'candidate' in export_data
        
        self.log_test("Export Candidate Data", success, 
                     f"Status: {response.status_code if response else 'No response'}")
        return success

    def test_purge_candidate_data(self):
        """Test candidate data purge (admin only)"""
        if not self.test_candidate_id:
            self.log_test("Purge Candidate Data", False, "No test candidate ID available")
            return False
        
        response = self.make_request('DELETE', f'candidates/{self.test_candidate_id}/purge')
        success = response and response.status_code == 200
        
        self.log_test("Purge Candidate Data", success, 
                     f"Status: {response.status_code if response else 'No response'}")
        return success

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting RMS API Tests...")
        print(f"Testing against: {self.base_url}")
        print("=" * 50)
        
        # Authentication tests
        print("\n📋 Authentication Tests:")
        self.test_auth_register()
        if not self.test_auth_login():
            print("❌ Login failed - stopping tests")
            return False
        self.test_auth_me()
        
        # Job management tests
        print("\n💼 Job Management Tests:")
        self.test_create_job()
        self.test_get_jobs()
        self.test_get_job_by_id()
        
        # Candidate management tests
        print("\n👥 Candidate Management Tests:")
        self.test_create_candidate()
        self.test_get_candidates()
        self.test_get_candidate_by_id()
        self.test_update_candidate_stage()
        
        # Scorecard tests
        print("\n⭐ Scorecard Tests:")
        self.test_create_scorecard()
        self.test_get_scorecards()
        
        # POSH and compliance tests
        print("\n🛡️ Compliance Tests:")
        self.test_create_posh_report()
        self.test_get_posh_reports()
        self.test_export_candidate_data()
        
        # Dashboard tests
        print("\n📊 Dashboard Tests:")
        self.test_dashboard_stats()
        
        # Data purge test (should be last)
        print("\n🗑️ Data Purge Tests:")
        self.test_purge_candidate_data()
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Test Summary:")
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {len(self.failed_tests)}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"  - {test['test']}: {test['error']}")
        
        return len(self.failed_tests) == 0

def main():
    tester = RMSAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())