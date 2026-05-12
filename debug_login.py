#!/usr/bin/env python3

import requests
import json
import sys
from datetime import datetime

# Backend URL from frontend/.env
BACKEND_URL = "https://dept-workflow-2.preview.emergentagent.com/api"

def debug_login():
    """Debug the login response to see what's being returned"""
    print("🔍 DEBUGGING LOGIN RESPONSE")
    print("=" * 50)
    
    login_data = {"username": "caseworker", "password": "case123"}
    
    try:
        login_response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data, timeout=30)
        print(f"Status Code: {login_response.status_code}")
        print(f"Response Headers: {dict(login_response.headers)}")
        print(f"Response Text: {login_response.text}")
        
        if login_response.status_code == 200:
            try:
                login_result = login_response.json()
                print(f"JSON Response: {json.dumps(login_result, indent=2)}")
            except json.JSONDecodeError as e:
                print(f"JSON Decode Error: {e}")
        
    except Exception as e:
        print(f"Request Error: {e}")

if __name__ == "__main__":
    debug_login()