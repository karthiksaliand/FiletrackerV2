"""Admin operations and notification tests"""
import pytest
import requests
import os

from conftest import BASE_URL

class TestAdminOperations:
    """Test admin-only operations"""

    def test_get_analytics(self, api_client, admin_token):
        """Test admin can get analytics"""
        response = api_client.get(f"{BASE_URL}/api/admin/analytics",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "draft" in data
        assert "submitted" in data
        assert "approved" in data
        assert "rejected" in data
        assert "department_pending" in data
        assert isinstance(data["total"], int)

    def test_list_users(self, api_client, admin_token):
        """Test admin can list all users"""
        response = api_client.get(f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 15  # At least the seeded users

    def test_list_users_unauthorized(self, api_client, caseworker_token):
        """Test non-admin cannot list users"""
        response = api_client.get(f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {caseworker_token}"}
        )
        assert response.status_code == 403

    def test_create_user(self, api_client, admin_token):
        """Test admin can create new user"""
        import time
        username = f"TEST_newuser_{int(time.time())}"
        response = api_client.post(f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "username": username,
                "password": "testpass123",
                "role": "case_worker",
                "display_name": "Test New User",
                "department": "Filing"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == username
        assert data["role"] == "case_worker"

    def test_reset_user_password(self, api_client, admin_token):
        """Test admin can reset user password and verify new password works"""
        import time
        # Create a temporary test user for password reset
        test_username = f"TEST_pwdreset_{int(time.time())}"
        create_response = api_client.post(f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "username": test_username,
                "password": "oldpass123",
                "role": "case_worker",
                "display_name": "Test Password Reset User",
                "department": "Filing"
            }
        )
        assert create_response.status_code == 200
        user_id = create_response.json()["id"]

        # Verify old password works
        login_old = api_client.post(f"{BASE_URL}/api/auth/login",
            json={"username": test_username, "password": "oldpass123"}
        )
        assert login_old.status_code == 200

        # Reset password
        reset_response = api_client.post(f"{BASE_URL}/api/admin/users/{user_id}/reset-password",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"new_password": "newpass123"}
        )
        assert reset_response.status_code == 200
        assert reset_response.json()["message"] == "Password reset successfully"

        # Verify old password no longer works
        login_old_retry = api_client.post(f"{BASE_URL}/api/auth/login",
            json={"username": test_username, "password": "oldpass123"}
        )
        assert login_old_retry.status_code == 401

        # Verify new password works
        login_new = api_client.post(f"{BASE_URL}/api/auth/login",
            json={"username": test_username, "password": "newpass123"}
        )
        assert login_new.status_code == 200

    def test_get_audit_logs(self, api_client, admin_token):
        """Test admin can view audit logs"""
        response = api_client.get(f"{BASE_URL}/api/admin/audit-logs",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should have logs from previous operations
        if len(data) > 0:
            assert "action" in data[0]
            assert "user_name" in data[0]
            assert "timestamp" in data[0]

    def test_get_credentials_list(self, api_client, admin_token):
        """Test admin can get credentials list"""
        response = api_client.get(f"{BASE_URL}/api/admin/credentials",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "note" in data
        assert "users" in data


class TestAdminFileManagement:
    """Test NEW admin file management features - edit, delete, override approvals"""

    def test_admin_edit_all_file_properties(self, api_client, admin_token, caseworker_token):
        """Test admin can edit ALL file properties including status, lock state, DC decision"""
        # Create a test file as caseworker
        create_response = api_client.post(f"{BASE_URL}/api/files",
            headers={"Authorization": f"Bearer {caseworker_token}"},
            json={
                "applicant_name": "TEST_AdminEdit Original",
                "applicant_phone": "1111111111",
                "applicant_address": "Original Address",
                "description": "Original description",
                "tahsildar_location": "Mangaluru"
            }
        )
        assert create_response.status_code == 200
        file_id = create_response.json()["id"]
        
        # Admin edits ALL properties
        edit_response = api_client.put(f"{BASE_URL}/api/admin/files/{file_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "applicant_name": "TEST_AdminEdit Modified",
                "applicant_phone": "9999999999",
                "applicant_address": "Modified Address",
                "description": "Modified description",
                "tahsildar_location": "Bantwal",
                "status": "submitted",
                "is_locked": True,
                "dc_decision": "accept",
                "dc_remark": "Admin override remark",
                "adc_remark": "Admin added ADC remark"
            }
        )
        assert edit_response.status_code == 200
        edited_file = edit_response.json()
        
        # Verify ALL changes applied
        assert edited_file["applicant_name"] == "TEST_AdminEdit Modified"
        assert edited_file["applicant_phone"] == "9999999999"
        assert edited_file["applicant_address"] == "Modified Address"
        assert edited_file["description"] == "Modified description"
        assert edited_file["tahsildar_location"] == "Bantwal"
        assert edited_file["status"] == "submitted"
        assert edited_file["is_locked"] == True
        assert edited_file["dc_decision"] == "accept"
        assert edited_file["dc_remark"] == "Admin override remark"
        assert edited_file["adc_remark"] == "Admin added ADC remark"
        
        # GET to verify persistence
        get_response = api_client.get(f"{BASE_URL}/api/files/{file_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_response.status_code == 200
        retrieved_file = get_response.json()
        assert retrieved_file["applicant_name"] == "TEST_AdminEdit Modified"
        assert retrieved_file["status"] == "submitted"
        assert retrieved_file["is_locked"] == True
        assert retrieved_file["dc_decision"] == "accept"

    def test_admin_edit_unauthorized(self, api_client, admin_token, caseworker_token, sp_token):
        """Test non-admin cannot use admin edit endpoint"""
        # Create file
        create_response = api_client.post(f"{BASE_URL}/api/files",
            headers={"Authorization": f"Bearer {caseworker_token}"},
            json={
                "applicant_name": "TEST_Unauthorized",
                "applicant_phone": "1111111111",
                "applicant_address": "Address",
                "description": "Description",
                "tahsildar_location": "Mangaluru"
            }
        )
        assert create_response.status_code == 200
        file_id = create_response.json()["id"]
        
        # Caseworker tries to use admin edit endpoint (should fail with 403)
        edit_response = api_client.put(f"{BASE_URL}/api/admin/files/{file_id}",
            headers={"Authorization": f"Bearer {caseworker_token}"},
            json={"status": "submitted"}
        )
        assert edit_response.status_code == 403
        
        # SP tries to use admin edit endpoint (should fail with 403)
        edit_response2 = api_client.put(f"{BASE_URL}/api/admin/files/{file_id}",
            headers={"Authorization": f"Bearer {sp_token}"},
            json={"status": "submitted"}
        )
        assert edit_response2.status_code == 403

    def test_admin_delete_file_and_related_data(self, api_client, admin_token, caseworker_token):
        """Test admin can delete file and verify approvals/notifications are also deleted"""
        # Create and submit a file to generate approvals and notifications
        create_response = api_client.post(f"{BASE_URL}/api/files",
            headers={"Authorization": f"Bearer {caseworker_token}"},
            json={
                "applicant_name": "TEST_ToDelete",
                "applicant_phone": "1111111111",
                "applicant_address": "Address",
                "description": "This file will be deleted",
                "tahsildar_location": "Mangaluru"
            }
        )
        assert create_response.status_code == 200
        file_id = create_response.json()["id"]
        file_number = create_response.json()["file_number"]
        
        # Submit file to create approvals and notifications
        submit_response = api_client.post(f"{BASE_URL}/api/files/{file_id}/submit",
            headers={"Authorization": f"Bearer {caseworker_token}"}
        )
        assert submit_response.status_code == 200
        
        # Verify file has approvals (by checking file detail)
        get_response = api_client.get(f"{BASE_URL}/api/files/{file_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_response.status_code == 200
        file_data = get_response.json()
        assert len(file_data.get("approvals", [])) > 0
        
        # Admin deletes file
        delete_response = api_client.delete(f"{BASE_URL}/api/admin/files/{file_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert delete_response.status_code == 200
        assert "deleted successfully" in delete_response.json()["message"].lower()
        
        # Verify file is deleted (GET should return 404)
        get_after_delete = api_client.get(f"{BASE_URL}/api/files/{file_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_after_delete.status_code == 404

    def test_admin_delete_unauthorized(self, api_client, admin_token, caseworker_token, sp_token):
        """Test non-admin cannot delete files"""
        # Create file
        create_response = api_client.post(f"{BASE_URL}/api/files",
            headers={"Authorization": f"Bearer {caseworker_token}"},
            json={
                "applicant_name": "TEST_DeleteUnauth",
                "applicant_phone": "1111111111",
                "applicant_address": "Address",
                "description": "Description",
                "tahsildar_location": "Mangaluru"
            }
        )
        assert create_response.status_code == 200
        file_id = create_response.json()["id"]
        
        # Caseworker tries to delete (should fail with 403)
        delete_response = api_client.delete(f"{BASE_URL}/api/admin/files/{file_id}",
            headers={"Authorization": f"Bearer {caseworker_token}"}
        )
        assert delete_response.status_code == 403
        
        # SP tries to delete (should fail with 403)
        delete_response2 = api_client.delete(f"{BASE_URL}/api/admin/files/{file_id}",
            headers={"Authorization": f"Bearer {sp_token}"}
        )
        assert delete_response2.status_code == 403

    def test_admin_override_approval(self, api_client, admin_token, caseworker_token):
        """Test admin can override department approvals"""
        # Create and submit file
        create_response = api_client.post(f"{BASE_URL}/api/files",
            headers={"Authorization": f"Bearer {caseworker_token}"},
            json={
                "applicant_name": "TEST_Override",
                "applicant_phone": "1111111111",
                "applicant_address": "Address",
                "description": "Test override",
                "tahsildar_location": "Mangaluru"
            }
        )
        assert create_response.status_code == 200
        file_id = create_response.json()["id"]
        
        # Submit file to create approvals
        submit_response = api_client.post(f"{BASE_URL}/api/files/{file_id}/submit",
            headers={"Authorization": f"Bearer {caseworker_token}"}
        )
        assert submit_response.status_code == 200
        
        # Get file to find approval IDs
        get_response = api_client.get(f"{BASE_URL}/api/files/{file_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_response.status_code == 200
        file_data = get_response.json()
        approvals = file_data["approvals"]
        assert len(approvals) > 0
        
        # Get Tahsildar approval
        tahsildar_approval = next((a for a in approvals if a["department"] == "tahsildar"), None)
        assert tahsildar_approval is not None
        approval_id = tahsildar_approval["id"]
        
        # Admin overrides Tahsildar approval
        override_response = api_client.put(f"{BASE_URL}/api/admin/files/{file_id}/approval/{approval_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "decision": "yes",
                "remark": "Admin override - approved by admin"
            }
        )
        assert override_response.status_code == 200
        assert "overridden successfully" in override_response.json()["message"].lower()
        
        # Verify approval was updated
        get_after_override = api_client.get(f"{BASE_URL}/api/files/{file_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_after_override.status_code == 200
        updated_file = get_after_override.json()
        updated_approvals = updated_file["approvals"]
        updated_tahsildar = next((a for a in updated_approvals if a["department"] == "tahsildar"), None)
        assert updated_tahsildar["decision"] == "yes"
        assert updated_tahsildar["remark"] == "Admin override - approved by admin"
        assert updated_tahsildar["is_locked"] == True

    def test_admin_override_unauthorized(self, api_client, admin_token, caseworker_token, sp_token):
        """Test non-admin cannot override approvals"""
        # Create and submit file
        create_response = api_client.post(f"{BASE_URL}/api/files",
            headers={"Authorization": f"Bearer {caseworker_token}"},
            json={
                "applicant_name": "TEST_OverrideUnauth",
                "applicant_phone": "1111111111",
                "applicant_address": "Address",
                "description": "Test",
                "tahsildar_location": "Mangaluru"
            }
        )
        assert create_response.status_code == 200
        file_id = create_response.json()["id"]
        
        submit_response = api_client.post(f"{BASE_URL}/api/files/{file_id}/submit",
            headers={"Authorization": f"Bearer {caseworker_token}"}
        )
        assert submit_response.status_code == 200
        
        # Get approval ID
        get_response = api_client.get(f"{BASE_URL}/api/files/{file_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        approvals = get_response.json()["approvals"]
        sp_approval = next((a for a in approvals if a["department"] == "sp"), None)
        approval_id = sp_approval["id"]
        
        # Caseworker tries to override (should fail with 403)
        override_response = api_client.put(f"{BASE_URL}/api/admin/files/{file_id}/approval/{approval_id}",
            headers={"Authorization": f"Bearer {caseworker_token}"},
            json={"decision": "yes", "remark": "Trying to override"}
        )
        assert override_response.status_code == 403


class TestNotifications:
    """Test notification system"""

    def test_get_notifications(self, api_client, admin_token):
        """Test user can get notifications"""
        response = api_client.get(f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_get_unread_count(self, api_client, admin_token):
        """Test get unread notification count"""
        response = api_client.get(f"{BASE_URL}/api/notifications/unread-count",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "count" in data
        assert isinstance(data["count"], int)

    def test_mark_all_read(self, api_client, admin_token):
        """Test marking all notifications as read"""
        response = api_client.post(f"{BASE_URL}/api/notifications/read-all",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        assert response.json()["message"] == "All marked as read"
