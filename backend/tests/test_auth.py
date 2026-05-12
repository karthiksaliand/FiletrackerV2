"""Authentication endpoint tests"""
import pytest
import requests
import os

from conftest import BASE_URL

class TestAuth:
    """Test authentication flows for all roles"""

    def test_admin_login_success(self, api_client):
        """Test admin login with correct credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "admin"
        assert data["user"]["username"] == "admin"
        assert data["user"]["display_name"] == "System Admin"

    def test_caseworker_login_success(self, api_client):
        """Test case worker login"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "username": "caseworker",
            "password": "case123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "case_worker"

    def test_tahsildar_mangaluru_login_success(self, api_client):
        """Test tahsildar Mangaluru login"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "username": "tah_mangaluru",
            "password": "tah123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "tahsildar"
        assert data["user"]["department"] == "Mangaluru"

    def test_sp_login_success(self, api_client):
        """Test SP login"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "username": "sp",
            "password": "sp123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "sp"

    def test_forest_login_success(self, api_client):
        """Test Forest Officer login"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "username": "forest",
            "password": "forest123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "forest_officer"

    def test_adc_login_success(self, api_client):
        """Test ADC login"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "username": "adc",
            "password": "adc123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "adc"

    def test_dc_login_success(self, api_client):
        """Test DC login"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "username": "dc",
            "password": "dc123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "dc"

    def test_login_invalid_credentials(self, api_client):
        """Test login with invalid credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "wrongpassword"
        })
        assert response.status_code == 401

    def test_login_nonexistent_user(self, api_client):
        """Test login with non-existent user"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "username": "nonexistent",
            "password": "password"
        })
        assert response.status_code == 401

    def test_get_me_with_valid_token(self, api_client, admin_token):
        """Test /auth/me endpoint with valid token"""
        response = api_client.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "admin"
        assert data["username"] == "admin"

    def test_get_me_without_token(self, api_client):
        """Test /auth/me without authorization"""
        response = api_client.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401

    def test_get_me_with_invalid_token(self, api_client):
        """Test /auth/me with invalid token"""
        response = api_client.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": "Bearer invalid_token_here"
        })
        assert response.status_code == 401
