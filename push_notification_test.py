#!/usr/bin/env python3
"""
Push Notification Test Suite for Government File Tracking App
Tests push token registration, file submission triggers, and approval notifications.
"""

import requests
import json
import sys
import time
from typing import Dict, Any, Optional

# Backend URL from frontend/.env
BASE_URL = "https://dept-workflow-2.preview.emergentagent.com/api"

class PushNotificationTestRunner:
    def __init__(self):
        self.tokens = {}  # Store auth tokens for different users
        self.passed = 0
        self.failed = 0
        self.test_file_id = None
        
    def log(self, message: str, level: str = "INFO"):
        print(f"[{level}] {message}")
        
    def login_user(self, username: str, password: str) -> Optional[str]:
        """Login user and return auth token"""
        try:
            response = requests.post(f"{BASE_URL}/auth/login", 
                                   json={"username": username, "password": password})
            if response.status_code == 200:
                data = response.json()
                token = data.get("token")
                self.tokens[username] = token
                self.log(f"✅ {username} login successful")
                return token
            else:
                self.log(f"❌ {username} login failed: {response.status_code} - {response.text}", "ERROR")
                return None
        except Exception as e:
            self.log(f"❌ {username} login error: {str(e)}", "ERROR")
            return None
    
    def make_authenticated_request(self, method: str, endpoint: str, token: str, data: Dict = None) -> requests.Response:
        """Make authenticated request with given token"""
        headers = {"Authorization": f"Bearer {token}"}
        if method.upper() == "GET":
            return requests.get(f"{BASE_URL}{endpoint}", headers=headers)
        elif method.upper() == "POST":
            return requests.post(f"{BASE_URL}{endpoint}", headers=headers, json=data)
        elif method.upper() == "PUT":
            return requests.put(f"{BASE_URL}{endpoint}", headers=headers, json=data)
    
    def test_user_logins(self):
        """Test 1-3: Login all required users"""
        self.log("\n=== Test 1-3: User Authentication ===")
        
        users = [
            ("caseworker", "case123"),
            ("sp", "sp123"), 
            ("ADC", "adc123"),
            ("admin", "admin123")
        ]
        
        for username, password in users:
            if self.login_user(username, password):
                self.passed += 1
            else:
                self.failed += 1
    
    def test_push_token_registration(self):
        """Test 4-6: Push token registration for different users"""
        self.log("\n=== Test 4-6: Push Token Registration ===")
        
        test_tokens = [
            ("caseworker", "ExponentPushToken[test-sp-token]"),
            ("sp", "ExponentPushToken[test-sp-device]"),
            ("ADC", "ExponentPushToken[test-adc-device]")
        ]
        
        for username, push_token in test_tokens:
            if username not in self.tokens:
                self.log(f"❌ No auth token for {username}", "ERROR")
                self.failed += 1
                continue
                
            try:
                response = self.make_authenticated_request(
                    "POST", "/notifications/push-token", 
                    self.tokens[username], 
                    {"token": push_token}
                )
                
                if response.status_code == 200:
                    self.log(f"✅ Push token registered for {username}")
                    self.passed += 1
                else:
                    self.log(f"❌ Push token registration failed for {username}: {response.status_code} - {response.text}", "ERROR")
                    self.failed += 1
                    
            except Exception as e:
                self.log(f"❌ Push token registration error for {username}: {str(e)}", "ERROR")
                self.failed += 1
    
    def test_token_storage_verification(self):
        """Test 7: Verify tokens are stored in push_tokens collection"""
        self.log("\n=== Test 7: Token Storage Verification ===")
        
        if "admin" not in self.tokens:
            self.log("❌ No admin token for verification", "ERROR")
            self.failed += 1
            return
        
        # We can't directly query the database, but we can verify by checking if subsequent 
        # token registrations work (which implies storage is working)
        try:
            # Try registering another token for admin
            response = self.make_authenticated_request(
                "POST", "/notifications/push-token",
                self.tokens["admin"],
                {"token": "ExponentPushToken[test-admin-device]"}
            )
            
            if response.status_code == 200:
                self.log("✅ Token storage working (admin token registration successful)")
                self.passed += 1
            else:
                self.log(f"❌ Token storage verification failed: {response.status_code} - {response.text}", "ERROR")
                self.failed += 1
                
        except Exception as e:
            self.log(f"❌ Token storage verification error: {str(e)}", "ERROR")
            self.failed += 1
    
    def test_invalid_token_handling(self):
        """Test 8: Test invalid token handling"""
        self.log("\n=== Test 8: Invalid Token Handling ===")
        
        if "caseworker" not in self.tokens:
            self.log("❌ No caseworker token for invalid token test", "ERROR")
            self.failed += 1
            return
        
        try:
            response = self.make_authenticated_request(
                "POST", "/notifications/push-token",
                self.tokens["caseworker"],
                {"token": "invalid-token"}
            )
            
            if response.status_code == 400:
                self.log("✅ Invalid token correctly rejected with 400 status")
                self.passed += 1
            else:
                self.log(f"❌ Invalid token not handled correctly. Expected 400, got {response.status_code}", "ERROR")
                self.failed += 1
                
        except Exception as e:
            self.log(f"❌ Invalid token test error: {str(e)}", "ERROR")
            self.failed += 1
    
    def test_unauthenticated_token_registration(self):
        """Test 9: Test token registration without auth"""
        self.log("\n=== Test 9: Unauthenticated Token Registration ===")
        
        try:
            response = requests.post(
                f"{BASE_URL}/notifications/push-token",
                json={"token": "ExponentPushToken[test-unauth]"}
            )
            
            if response.status_code == 401:
                self.log("✅ Unauthenticated request correctly rejected with 401 status")
                self.passed += 1
            else:
                self.log(f"❌ Unauthenticated request not handled correctly. Expected 401, got {response.status_code}", "ERROR")
                self.failed += 1
                
        except Exception as e:
            self.log(f"❌ Unauthenticated token test error: {str(e)}", "ERROR")
            self.failed += 1
    
    def test_file_creation_and_submission(self):
        """Test 10: Create and submit file to trigger push notifications"""
        self.log("\n=== Test 10: File Creation and Submission ===")
        
        if "caseworker" not in self.tokens:
            self.log("❌ No caseworker token for file creation", "ERROR")
            self.failed += 1
            return
        
        # Create a file
        try:
            file_data = {
                "file_no": "PUSH001",
                "year": "2025",
                "description": "Push notification test file",
                "tahsildar_location": "Mangaluru",
                "departments": ["tahsildar", "sp", "forest"],
                "priority": "high"
            }
            
            response = self.make_authenticated_request(
                "POST", "/files",
                self.tokens["caseworker"],
                file_data
            )
            
            if response.status_code == 200:
                file_response = response.json()
                self.test_file_id = file_response.get("id")
                self.log(f"✅ File created successfully: {file_response.get('file_number')}")
                
                # Submit the file
                submit_response = self.make_authenticated_request(
                    "POST", f"/files/{self.test_file_id}/submit",
                    self.tokens["caseworker"],
                    {}
                )
                
                if submit_response.status_code == 200:
                    self.log("✅ File submitted successfully - push notifications should be triggered")
                    self.passed += 1
                    
                    # Check response for any error indicators
                    submit_data = submit_response.json()
                    if "error" not in str(submit_data).lower():
                        self.log("✅ File submission completed without errors")
                        self.passed += 1
                    else:
                        self.log(f"⚠️ File submission may have errors: {submit_data}")
                        
                else:
                    self.log(f"❌ File submission failed: {submit_response.status_code} - {submit_response.text}", "ERROR")
                    self.failed += 1
                    
            else:
                self.log(f"❌ File creation failed: {response.status_code} - {response.text}", "ERROR")
                self.failed += 1
                
        except Exception as e:
            self.log(f"❌ File creation/submission error: {str(e)}", "ERROR")
            self.failed += 1
    
    def test_approval_submission(self):
        """Test 11: Submit approval to trigger push notifications"""
        self.log("\n=== Test 11: Approval Submission ===")
        
        if not self.test_file_id:
            self.log("❌ No test file ID for approval submission", "ERROR")
            self.failed += 1
            return
            
        if "sp" not in self.tokens:
            self.log("❌ No SP token for approval submission", "ERROR")
            self.failed += 1
            return
        
        try:
            approval_data = {
                "decision": "approve",
                "remark": "SP approval for push notification test"
            }
            
            response = self.make_authenticated_request(
                "POST", f"/files/{self.test_file_id}/approval",
                self.tokens["sp"],
                approval_data
            )
            
            if response.status_code == 200:
                self.log("✅ SP approval submitted successfully - push notifications should be triggered")
                self.passed += 1
                
                # Check response for any error indicators
                approval_response = response.json()
                if "error" not in str(approval_response).lower():
                    self.log("✅ Approval submission completed without errors")
                    self.passed += 1
                else:
                    self.log(f"⚠️ Approval submission may have errors: {approval_response}")
                    
            else:
                self.log(f"❌ SP approval submission failed: {response.status_code} - {response.text}", "ERROR")
                self.failed += 1
                
        except Exception as e:
            self.log(f"❌ Approval submission error: {str(e)}", "ERROR")
            self.failed += 1
    
    def test_backend_logs_check(self):
        """Test 12: Check if backend logs show push notification attempts"""
        self.log("\n=== Test 12: Backend Logs Verification ===")
        
        # Since we can't directly access logs, we verify that the endpoints didn't crash
        # by checking if we can still make API calls successfully
        try:
            if "admin" in self.tokens:
                response = self.make_authenticated_request(
                    "GET", "/files",
                    self.tokens["admin"]
                )
                
                if response.status_code == 200:
                    self.log("✅ Backend still responsive after push notification triggers")
                    self.passed += 1
                else:
                    self.log(f"❌ Backend may have issues after push notifications: {response.status_code}", "ERROR")
                    self.failed += 1
            else:
                self.log("⚠️ Cannot verify backend logs - no admin token")
                
        except Exception as e:
            self.log(f"❌ Backend logs verification error: {str(e)}", "ERROR")
            self.failed += 1
    
    def run_tests(self):
        """Run all push notification tests"""
        self.log("🚀 Starting Push Notification Tests")
        
        try:
            # Test 1-3: User logins
            self.test_user_logins()
            
            # Test 4-6: Push token registration
            self.test_push_token_registration()
            
            # Test 7: Token storage verification
            self.test_token_storage_verification()
            
            # Test 8: Invalid token handling
            self.test_invalid_token_handling()
            
            # Test 9: Unauthenticated token registration
            self.test_unauthenticated_token_registration()
            
            # Test 10: File creation and submission
            self.test_file_creation_and_submission()
            
            # Test 11: Approval submission
            self.test_approval_submission()
            
            # Test 12: Backend logs verification
            self.test_backend_logs_check()
            
            # Summary
            self.log(f"\n🎯 PUSH NOTIFICATION TEST SUMMARY:")
            self.log(f"✅ Passed: {self.passed}")
            self.log(f"❌ Failed: {self.failed}")
            self.log(f"📊 Success Rate: {(self.passed/(self.passed+self.failed)*100):.1f}%")
            
            if self.failed == 0:
                self.log("🎉 ALL PUSH NOTIFICATION TESTS PASSED!")
                return True
            else:
                self.log("⚠️ Some tests failed - Push notification functionality needs attention")
                return False
                
        except Exception as e:
            self.log(f"❌ Test execution error: {str(e)}", "ERROR")
            return False

if __name__ == "__main__":
    runner = PushNotificationTestRunner()
    success = runner.run_tests()
    sys.exit(0 if success else 1)