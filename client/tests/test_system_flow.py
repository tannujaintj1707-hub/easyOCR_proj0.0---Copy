import pytest
from app import app
import mongomock
from unittest.mock import patch

# Setup an isolated test client connected to an in-memory MongoDB
@pytest.fixture(scope="module")
def system_client():
    app.config['TESTING'] = True
    # Patch mongo so we don't accidentally write to the real database during system testing
    with mongomock.patch(servers=(('localhost', 27017),)):
        with app.test_client() as client:
            yield client

def test_full_system_lifecycle(system_client):
    """
    SYSTEM TEST: End-to-End backend flow
    1. Auth sync -> 2. Student Registration -> 3. Form Submit -> 4. Admin Approves
    """
    
    # STEP 1: Sync a user into the system
    sync_payload = {"clerk_id": "sys_clerk_123", "email": "admin@system.local", "role": "admin"}
    res = system_client.post('/api/auth/sync', json=sync_payload)
    assert res.status_code == 200

    # STEP 2: Register a mock student (so the ID passes validation)
    student_payload = {
        "studentId": "ABCDE12345",
        "studentName": "Jane Doe",
        "guardianIncome": "500000",
        "dob": "2005-01-01",
        "email": "student@system.local",
        "mobileNo": "9876543210"
    }
    res = system_client.post('/api/students', json=student_payload)
    assert res.status_code == 201

    # STEP 3: A Parent Submits a Visitor Form
    visit_payload = {
        "visitorType": "parent",
        "name": "John System Tester",
        "totalPeople": 1,
        "males": 1,
        "females": 0,
        "members": [{"name": "John System Tester", "photo": None}],
        "hostName": "Jane Doe",
        "hostId": "ABCDE12345",
        "arrivalDate": "2026-10-10T10:00",
        "departureDate": "2026-10-10T12:00",
        "transportMode": "Bus"
    }
    res = system_client.post('/api/visits', json=visit_payload)
    assert res.status_code == 201
    visit_id = res.get_json()["id"]

    # STEP 4: Admin fetches the list and verifies the visitor is pending
    res = system_client.get('/api/admin/visitors')
    assert res.status_code == 200
    visitors = res.get_json()
    assert len(visitors) > 0
    assert visitors[0]["_id"] == visit_id
    assert visitors[0]["status"] == "pending_review"

    # STEP 5: Admin Approves the visitor status
    res = system_client.put(f'/api/admin/status/{visit_id}', json={"status": "approved"})
    assert res.status_code == 200
    assert res.get_json()["success"] is True

    # STEP 6: Ensure receipt synced automatically
    res = system_client.get('/api/receipts')
    assert res.status_code == 200
    receipts = res.get_json()
    assert receipts[0]["status"] == "approved"