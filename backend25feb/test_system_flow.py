import pytest
from app import app
import mongomock

@pytest.fixture(scope="module")
def system_client():
    app.config['TESTING'] = True
    with mongomock.patch(servers=(('localhost', 27017),)):
        with app.test_client() as client:
            yield client

def test_full_system_lifecycle(system_client):
    # STEP 1: Sync a user into the system
    sync_payload = {"clerk_id": "sys_clerk_123", "email": "admin@system.local", "role": "admin"}
    res = system_client.post('/api/auth/sync', json=sync_payload)
    assert res.status_code == 200

    # STEP 2: Register a mock student
    student_payload = {
        "studentId": "ABCDE12345", "studentName": "Jane Doe",
        "guardianIncome": "500000", "dob": "2005-01-01",
        "email": "student@system.local", "mobileNo": "9876543210"
    }
    res = system_client.post('/api/students', json=student_payload)
    assert res.status_code == 201

    # STEP 3: Submit a Visitor Form
    visit_payload = {
        "visitorType": "parent", "name": "John System Tester",
        "totalPeople": 1, "males": 1, "females": 0,
        "members": [{"name": "John System Tester", "photo": None}],
        "hostName": "Jane Doe", "hostId": "ABCDE12345",
        "arrivalDate": "2026-10-10T10:00", "departureDate": "2026-10-10T12:00",
        "transportMode": "Bus"
    }
    res = system_client.post('/api/visits', json=visit_payload)
    assert res.status_code == 201
    visit_id = res.get_json()["id"]

    # STEP 4: Admin fetches and Approves
    res = system_client.get('/api/admin/visitors')
    assert res.status_code == 200
    
    res = system_client.put(f'/api/admin/status/{visit_id}', json={"status": "approved"})
    assert res.status_code == 200