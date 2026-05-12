"""Approval workflow tests"""
import pytest
import requests
import os

from conftest import BASE_URL

class TestApprovalWorkflow:
    """Test department approval workflows"""

    def test_tahsildar_approval_workflow(self, api_client, caseworker_token, tahsildar_token):
        """Test tahsildar can submit approval for assigned file"""
        # Create and submit file as case worker
        create_response = api_client.post(f"{BASE_URL}/api/files", 
            headers={"Authorization": f"Bearer {caseworker_token}"},
            json={
                "applicant_name": "TEST_Tahsildar Approval",
                "description": "Test file for tahsildar",
                "tahsildar_location": "Mangaluru"
            }
        )
        file_id = create_response.json()["id"]
        
        api_client.post(f"{BASE_URL}/api/files/{file_id}/submit",
            headers={"Authorization": f"Bearer {caseworker_token}"}
        )

        # Tahsildar submits approval
        approval_response = api_client.post(f"{BASE_URL}/api/files/{file_id}/approval",
            headers={"Authorization": f"Bearer {tahsildar_token}"},
            json={
                "decision": "yes",
                "remark": "Approved by Tahsildar Mangaluru"
            }
        )
        assert approval_response.status_code == 200
        assert approval_response.json()["message"] == "Approval submitted successfully"

    def test_sp_approval_workflow(self, api_client, caseworker_token, sp_token):
        """Test SP can submit approval"""
        # Create and submit file
        create_response = api_client.post(f"{BASE_URL}/api/files", 
            headers={"Authorization": f"Bearer {caseworker_token}"},
            json={
                "applicant_name": "TEST_SP Approval",
                "description": "Test file for SP",
                "tahsildar_location": "Bantwal"
            }
        )
        file_id = create_response.json()["id"]
        
        api_client.post(f"{BASE_URL}/api/files/{file_id}/submit",
            headers={"Authorization": f"Bearer {caseworker_token}"}
        )

        # SP submits approval
        approval_response = api_client.post(f"{BASE_URL}/api/files/{file_id}/approval",
            headers={"Authorization": f"Bearer {sp_token}"},
            json={
                "decision": "yes",
                "remark": "Approved by SP"
            }
        )
        assert approval_response.status_code == 200

    def test_forest_approval_with_na(self, api_client, caseworker_token, forest_token):
        """Test Forest Officer can submit N/A approval"""
        # Create and submit file
        create_response = api_client.post(f"{BASE_URL}/api/files", 
            headers={"Authorization": f"Bearer {caseworker_token}"},
            json={
                "applicant_name": "TEST_Forest NA",
                "description": "Test file for forest N/A",
                "tahsildar_location": "Moodabidri"
            }
        )
        file_id = create_response.json()["id"]
        
        api_client.post(f"{BASE_URL}/api/files/{file_id}/submit",
            headers={"Authorization": f"Bearer {caseworker_token}"}
        )

        # Forest Officer submits N/A
        approval_response = api_client.post(f"{BASE_URL}/api/files/{file_id}/approval",
            headers={"Authorization": f"Bearer {forest_token}"},
            json={
                "decision": "na",
                "remark": "Not applicable for this case"
            }
        )
        assert approval_response.status_code == 200

    def test_approval_invalid_decision(self, api_client, caseworker_token, sp_token):
        """Test approval fails with invalid decision value"""
        # Create and submit file
        create_response = api_client.post(f"{BASE_URL}/api/files", 
            headers={"Authorization": f"Bearer {caseworker_token}"},
            json={
                "applicant_name": "TEST_Invalid Decision",
                "description": "Test",
                "tahsildar_location": "Kadaba"
            }
        )
        file_id = create_response.json()["id"]
        
        api_client.post(f"{BASE_URL}/api/files/{file_id}/submit",
            headers={"Authorization": f"Bearer {caseworker_token}"}
        )

        # Try invalid decision
        approval_response = api_client.post(f"{BASE_URL}/api/files/{file_id}/approval",
            headers={"Authorization": f"Bearer {sp_token}"},
            json={
                "decision": "maybe",
                "remark": "Invalid"
            }
        )
        assert approval_response.status_code == 400

    def test_adc_remark(self, api_client, caseworker_token, adc_token):
        """Test ADC can add remarks to file"""
        # Create and submit file
        create_response = api_client.post(f"{BASE_URL}/api/files", 
            headers={"Authorization": f"Bearer {caseworker_token}"},
            json={
                "applicant_name": "TEST_ADC Remark",
                "description": "Test file for ADC remark",
                "tahsildar_location": "Ullala"
            }
        )
        file_id = create_response.json()["id"]
        
        api_client.post(f"{BASE_URL}/api/files/{file_id}/submit",
            headers={"Authorization": f"Bearer {caseworker_token}"}
        )

        # ADC adds remark
        remark_response = api_client.post(f"{BASE_URL}/api/files/{file_id}/adc-remark",
            headers={"Authorization": f"Bearer {adc_token}"},
            json={
                "remark": "ADC reviewing this case carefully"
            }
        )
        assert remark_response.status_code == 200
        assert remark_response.json()["message"] == "Remark added successfully"

        # Verify remark persisted
        file_response = api_client.get(f"{BASE_URL}/api/files/{file_id}",
            headers={"Authorization": f"Bearer {adc_token}"}
        )
        assert file_response.status_code == 200
        assert file_response.json()["adc_remark"] == "ADC reviewing this case carefully"

    def test_dc_accept_decision(self, api_client, caseworker_token, dc_token):
        """Test DC can accept a file"""
        # Create and submit file
        create_response = api_client.post(f"{BASE_URL}/api/files", 
            headers={"Authorization": f"Bearer {caseworker_token}"},
            json={
                "applicant_name": "TEST_DC Accept",
                "description": "Test file for DC accept",
                "tahsildar_location": "Belthangady"
            }
        )
        file_id = create_response.json()["id"]
        
        api_client.post(f"{BASE_URL}/api/files/{file_id}/submit",
            headers={"Authorization": f"Bearer {caseworker_token}"}
        )

        # DC accepts file
        decision_response = api_client.post(f"{BASE_URL}/api/files/{file_id}/dc-decision",
            headers={"Authorization": f"Bearer {dc_token}"},
            json={
                "decision": "accept",
                "remark": "File accepted after review"
            }
        )
        assert decision_response.status_code == 200

        # Verify file status changed to dc_approved
        file_response = api_client.get(f"{BASE_URL}/api/files/{file_id}",
            headers={"Authorization": f"Bearer {dc_token}"}
        )
        assert file_response.status_code == 200
        data = file_response.json()
        assert data["status"] == "dc_approved"
        assert data["dc_decision"] == "accept"
        assert data["dc_remark"] == "File accepted after review"

    def test_dc_reject_decision(self, api_client, caseworker_token, dc_token):
        """Test DC can reject a file"""
        # Create and submit file
        create_response = api_client.post(f"{BASE_URL}/api/files", 
            headers={"Authorization": f"Bearer {caseworker_token}"},
            json={
                "applicant_name": "TEST_DC Reject",
                "description": "Test file for DC reject",
                "tahsildar_location": "Mangaluru"
            }
        )
        file_id = create_response.json()["id"]
        
        api_client.post(f"{BASE_URL}/api/files/{file_id}/submit",
            headers={"Authorization": f"Bearer {caseworker_token}"}
        )

        # DC rejects file
        decision_response = api_client.post(f"{BASE_URL}/api/files/{file_id}/dc-decision",
            headers={"Authorization": f"Bearer {dc_token}"},
            json={
                "decision": "reject",
                "remark": "Insufficient documentation"
            }
        )
        assert decision_response.status_code == 200

        # Verify file status changed to dc_rejected
        file_response = api_client.get(f"{BASE_URL}/api/files/{file_id}",
            headers={"Authorization": f"Bearer {dc_token}"}
        )
        assert file_response.status_code == 200
        data = file_response.json()
        assert data["status"] == "dc_rejected"
        assert data["dc_decision"] == "reject"
