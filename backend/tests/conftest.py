import pytest
import requests
import os
from pathlib import Path

# Read BASE_URL from frontend .env file
frontend_env_path = Path(__file__).parent.parent.parent / 'frontend' / '.env'
BASE_URL = None
if frontend_env_path.exists():
    with open(frontend_env_path) as f:
        for line in f:
            if line.startswith('EXPO_PUBLIC_BACKEND_URL='):
                BASE_URL = line.split('=', 1)[1].strip().rstrip('/')
                break

if not BASE_URL:
    BASE_URL = "https://dept-workflow-2.preview.emergentagent.com"

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture
def admin_token(api_client):
    """Get admin token for authenticated requests"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "username": "admin",
        "password": "admin123"
    })
    if response.status_code != 200:
        pytest.skip("Admin login failed, skipping authenticated tests")
    return response.json()["token"]

@pytest.fixture
def caseworker_token(api_client):
    """Get case worker token for authenticated requests"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "username": "caseworker",
        "password": "case123"
    })
    if response.status_code != 200:
        pytest.skip("Case worker login failed, skipping authenticated tests")
    return response.json()["token"]

@pytest.fixture
def tahsildar_token(api_client):
    """Get tahsildar token for authenticated requests"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "username": "tah_mangaluru",
        "password": "tah123"
    })
    if response.status_code != 200:
        pytest.skip("Tahsildar login failed, skipping authenticated tests")
    return response.json()["token"]

@pytest.fixture
def sp_token(api_client):
    """Get SP token for authenticated requests"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "username": "sp",
        "password": "sp123"
    })
    if response.status_code != 200:
        pytest.skip("SP login failed, skipping authenticated tests")
    return response.json()["token"]

@pytest.fixture
def forest_token(api_client):
    """Get Forest Officer token for authenticated requests"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "username": "forest",
        "password": "forest123"
    })
    if response.status_code != 200:
        pytest.skip("Forest Officer login failed, skipping authenticated tests")
    return response.json()["token"]

@pytest.fixture
def adc_token(api_client):
    """Get ADC token for authenticated requests"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "username": "adc",
        "password": "adc123"
    })
    if response.status_code != 200:
        pytest.skip("ADC login failed, skipping authenticated tests")
    return response.json()["token"]

@pytest.fixture
def dc_token(api_client):
    """Get DC token for authenticated requests"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "username": "dc",
        "password": "dc123"
    })
    if response.status_code != 200:
        pytest.skip("DC login failed, skipping authenticated tests")
    return response.json()["token"]
