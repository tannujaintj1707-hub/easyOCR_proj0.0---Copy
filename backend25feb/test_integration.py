# test_integration.py
import pytest
from app import app, visits_collection, receipts_collection, students_collection
from bson import ObjectId
from unittest.mock import patch

def test_full_visitor_lifecycle(client):
    """
    Integration Test: Tests the flow of creating a visit, admin viewing it, 
    admin approving it, and finally deleting it directly against the DB.
    """
    # 0. Ensure clean state in the test DB
    visits_collection.delete_many({})
    receipts_collection.delete_many({})

    # 1. POST: Create a new visitor via API
    visitor_payload = {
        "name": "Integration Tester",
        "visitorType": "other",
        "purpose": "Integration Testing",
        "mobileNo": "1234567890"
    }
    res_post = client.post('/api/visits', json=visitor_payload)
    assert res_post.status_code == 201
    visit_id = res_post.json['id']

    # 2. DB VERIFY: Ensure it was accurately written to MongoDB
    db_visit = visits_collection.find_one({"_id": ObjectId(visit_id)})
    assert db_visit is not None
    assert db_visit["name"] == "Integration Tester"
    assert db_visit["status"] == "pending_review"

    db_receipt = receipts_collection.find_one({"visitorId": str(visit_id)})
    assert db_receipt is not None

    # 3. GET: Admin retrieves visitors via API
    res_get = client.get('/api/admin/visitors')
    assert res_get.status_code == 200
    assert len(res_get.json) >= 1
    
    # Check if our integration tester is in the returned list
    names_returned = [v["name"] for v in res_get.json]
    assert "Integration Tester" in names_returned

    # 4. PUT: Admin approves the visitor via API
    res_put = client.put(f'/api/admin/status/{visit_id}', json={"status": "approved"})
    assert res_put.status_code == 200

    # 5. DB VERIFY: Ensure status changed in BOTH collections automatically
    assert visits_collection.find_one({"_id": ObjectId(visit_id)})["status"] == "approved"
    assert receipts_collection.find_one({"visitorId": str(visit_id)})["status"] == "approved"

    # 6. DELETE: Admin removes visitor via API
    res_del = client.delete(f'/api/admin/visitors/{visit_id}')
    assert res_del.status_code == 200

    # 7. DB VERIFY: Ensure records are completely purged
    assert visits_collection.find_one({"_id": ObjectId(visit_id)}) is None
    assert receipts_collection.find_one({"visitorId": str(visit_id)}) is None

@patch('app.match_face_in_db')
def test_full_student_guard_scan_lifecycle(mock_match, client):
    """
    Integration Test: Tests registering a student, booking a visit for them,
    and the guard scanning their authorized face to automatically approve entry.
    """
    students_collection.delete_many({})
    visits_collection.delete_many({})

    # 1. POST: Register Student via API
    student_payload = {
        "studentName": "Integration Student",
        "studentId": "ABCDE12345",
        "guardianIncome": "50000",
        "dob": "2010-01-01",
        "authorizedPersons": [{"name": "Auth Parent", "mobile": "1234567890", "photo": "dummy"}]
    }
    assert client.post('/api/students', json=student_payload).status_code == 201

    # 2. POST: Create a pending visit for this student via API
    visit_payload = {
        "name": "Auth Parent",
        "visitorType": "parent",
        "hostId": "ABCDE12345",
        "status": "pending_review"
    }
    res_visit = client.post('/api/visits', json=visit_payload)
    assert res_visit.status_code == 201
    visit_id = res_visit.json['id']

    # 3. POST: Guard scans the face via API (Mocking the AI, testing the integration)
    mock_match.return_value = {"studentId": "ABCDE12345", "visitorName": "Auth Parent"}
    
    scan_payload = {
        "liveFrame": "dummy_b64",
        "studentId": "ABCDE12345"
    }
    res_scan = client.post('/api/guard/verify-face', json=scan_payload)
    assert res_scan.status_code == 200
    assert res_scan.json['success'] is True

    # 4. DB VERIFY: The scan should have automatically flipped the pending visit to 'approved'
    approved_visit = visits_collection.find_one({"_id": ObjectId(visit_id)})
    assert approved_visit["status"] == "approved"