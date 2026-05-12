"""File CRUD operations tests"""
import pytest
import requests
import os

from conftest import BASE_URL

class TestFileCRUD:
    """Test file creation, listing, update, and submit operations"""

    def test_create_file_as_caseworker(self, api_client, caseworker_token):
        """Test case worker can create a file"""
        response = api_client.post(f"{BASE_URL}/api/files", 
            headers={"Authorization": f"Bearer {caseworker_token}"},
            json={
                "applicant_name": "TEST_John Doe",
                "applicant_phone": "9876543210",
                "applicant_address": "Test Address, Mangaluru",
                "description": "Test file for land conversion",
                "tahsildar_location": "Mangaluru"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "file_number" in data
        assert data["applicant_name"] == "TEST_John Doe"
        assert data["tahsildar_location"] == "Mangaluru"
        assert data["status"] == "draft"
        assert data["is_locked"] == False
        assert "DK/FILE/2026/" in data["file_number"]

    def test_create_file_as_admin(self, api_client, admin_token):
        """Test admin can create a file"""
        response = api_client.post(f"{BASE_URL}/api/files", 
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "applicant_name": "TEST_Admin Created",
                "applicant_phone": "1234567890",
                "applicant_address": "Admin Test Address",
                "description": "Admin test file",
                "tahsildar_location": "Bantwal"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["applicant_name"] == "TEST_Admin Created"

    def test_create_file_invalid_tahsildar(self, api_client, caseworker_token):
        """Test file creation fails with invalid tahsildar location"""
        response = api_client.post(f"{BASE_URL}/api/files", 
            headers={"Authorization": f"Bearer {caseworker_token}"},
            json={
                "applicant_name": "TEST_Invalid",
                "description": "Test",
                "tahsildar_location": "InvalidLocation"
            }
        )
        assert response.status_code == 400

    def test_create_file_unauthorized(self, api_client, tahsildar_token):
        """Test tahsildar cannot create files"""
        response = api_client.post(f"{BASE_URL}/api/files", 
            headers={"Authorization": f"Bearer {tahsildar_token}"},
            json={
                "applicant_name": "TEST_Unauthorized",
                "description": "Test",
                "tahsildar_location": "Mangaluru"
            }
        )
        assert response.status_code == 403

    def test_list_files_as_caseworker(self, api_client, caseworker_token):
        """Test case worker can list their files"""
        response = api_client.get(f"{BASE_URL}/api/files",
            headers={"Authorization": f"Bearer {caseworker_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_list_files_as_admin(self, api_client, admin_token):
        """Test admin can list all files"""
        response = api_client.get(f"{BASE_URL}/api/files",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_get_file_detail(self, api_client, caseworker_token):
        """Test get file detail endpoint"""
        # First create a file
        create_response = api_client.post(f"{BASE_URL}/api/files", 
            headers={"Authorization": f"Bearer {caseworker_token}"},
            json={
                "applicant_name": "TEST_Detail Check",
                "applicant_phone": "9999999999",
                "applicant_address": "Detail Test Address",
                "description": "Test file for detail check",
                "tahsildar_location": "Mulki"
            }
        )
        assert create_response.status_code == 200
        file_id = create_response.json()["id"]

        # Get file detail
        detail_response = api_client.get(f"{BASE_URL}/api/files/{file_id}",
            headers={"Authorization": f"Bearer {caseworker_token}"}
        )
        assert detail_response.status_code == 200
        data = detail_response.json()
        assert data["id"] == file_id
        assert data["applicant_name"] == "TEST_Detail Check"
        assert "approvals" in data
        assert "audit_log" in data

    def test_edit_file_as_caseworker(self, api_client, caseworker_token):
        """Test case worker can edit their draft file"""
        # Create file
        create_response = api_client.post(f"{BASE_URL}/api/files", 
            headers={"Authorization": f"Bearer {caseworker_token}"},
            json={
                "applicant_name": "TEST_Before Edit",
                "description": "Original description",
                "tahsildar_location": "Puttur"
            }
        )
        file_id = create_response.json()["id"]

        # Edit file
        edit_response = api_client.put(f"{BASE_URL}/api/files/{file_id}",
            headers={"Authorization": f"Bearer {caseworker_token}"},
            json={
                "applicant_name": "TEST_After Edit",
                "description": "Updated description"
            }
        )
        assert edit_response.status_code == 200
        data = edit_response.json()
        assert data["applicant_name"] == "TEST_After Edit"
        assert data["description"] == "Updated description"

        # Verify persistence with GET
        get_response = api_client.get(f"{BASE_URL}/api/files/{file_id}",
            headers={"Authorization": f"Bearer {caseworker_token}"}
        )
        assert get_response.status_code == 200
        assert get_response.json()["applicant_name"] == "TEST_After Edit"

    def test_submit_file(self, api_client, caseworker_token):
        """Test file submission workflow"""
        # Create file
        create_response = api_client.post(f"{BASE_URL}/api/files", 
            headers={"Authorization": f"Bearer {caseworker_token}"},
            json={
                "applicant_name": "TEST_Submit File",
                "description": "File to be submitted",
                "tahsildar_location": "Sulya"
            }
        )
        file_id = create_response.json()["id"]

        # Submit file
        submit_response = api_client.post(f"{BASE_URL}/api/files/{file_id}/submit",
            headers={"Authorization": f"Bearer {caseworker_token}"}
        )
        assert submit_response.status_code == 200
        data = submit_response.json()
        assert data["status"] == "submitted"
        assert data["is_locked"] == True
        assert data["submitted_at"] is not None
        assert data["deadline"] is not None

        # Verify file is locked - editing should fail
        edit_response = api_client.put(f"{BASE_URL}/api/files/{file_id}",
            headers={"Authorization": f"Bearer {caseworker_token}"},
            json={"applicant_name": "Should Fail"}
        )
        assert edit_response.status_code == 403
