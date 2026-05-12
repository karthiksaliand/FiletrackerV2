#!/usr/bin/env python3
"""
Quick verification of remaining core APIs
"""

import requests
import json

BASE_URL = "https://dept-workflow-2.preview.emergentagent.com/api"

def login_user(username, password):
    response = requests.post(f"{BASE_URL}/auth/login", json={"username": username, "password": password})
    if response.status_code == 200:
        return response.json()["token"]
    return None

def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

# Quick verification tests
def main():
    print("=== QUICK VERIFICATION OF CORE APIS ===")
    
    # Login as admin
    token = login_user("admin", "admin123")
    if not token:
        print("❌ Admin login failed")
        return
    
    # Test file list API
    response = requests.get(f"{BASE_URL}/files", headers=auth_headers(token))
    if response.status_code == 200:
        files = response.json()
        print(f"✅ File list API: Found {len(files)} files")
    else:
        print(f"❌ File list API failed: {response.status_code}")
    
    # Test analytics API  
    response = requests.get(f"{BASE_URL}/admin/analytics", headers=auth_headers(token))
    if response.status_code == 200:
        analytics = response.json()
        print(f"✅ Analytics API: Total files {analytics.get('total', 0)}, High priority: {analytics.get('high_priority', 0)}")
    else:
        print(f"❌ Analytics API failed: {response.status_code}")
    
    # Test notifications API
    response = requests.get(f"{BASE_URL}/notifications", headers=auth_headers(token))
    if response.status_code == 200:
        notifications = response.json()
        print(f"✅ Notifications API: Found {len(notifications)} notifications")
    else:
        print(f"❌ Notifications API failed: {response.status_code}")
    
    print("\n=== VERIFICATION COMPLETE ===")

if __name__ == "__main__":
    main()