# test_routes.py
import pytest
from unittest.mock import patch, MagicMock
from bson import ObjectId

# --- AUTH ROUTES ---
@patch('app.users_collection')
def test_sync_user(mock_users, client):
    assert client.post('/api/auth/sync', json={}).status_code == 400
    mock_users.find_one.return_value = {"role_name": "member"}
    res = client.post('/api/auth/sync', json={"clerk_id": "user_123", "email": "test@test.com"})
    assert res.status_code == 200

@patch('app.roles_collection')
@patch('app.users_collection')
def test_get_permissions(mock_users, mock_roles, client):
    assert client.get('/api/auth/permissions').status_code == 400
    mock_users.find_one.return_value = None
    assert client.get('/api/auth/permissions?clerk_id=123').json["role"] == "unassigned"
    
    mock_users.find_one.return_value = {"role_name": "admin"}
    mock_roles.find_one.return_value = {"name": "admin", "page_permissions": ["/all"]}
    assert client.get('/api/auth/permissions?clerk_id=123').status_code == 200

# --- VISITS & RECEIPTS ROUTES ---
@patch('app.receipts_collection')
@patch('app.visits_collection')
def test_handle_visits(mock_visits, mock_receipts, client):
    mock_visits.find.return_value.sort.return_value.limit.return_value = [{"_id": ObjectId("507f1f77bcf86cd799439011"), "name": "Test"}]
    assert client.get('/api/visits').status_code == 200
    assert client.post('/api/visits', json={}).status_code == 400
    assert client.post('/api/visits', json={"name": "123"}).status_code == 400
    
    # Success branch
    mock_visits.insert_one.return_value.inserted_id = ObjectId()
    assert client.post('/api/visits', json={"name": "John Doe", "visitorType": "other"}).status_code == 201

    # Exception branch
    mock_visits.insert_one.side_effect = Exception("DB Down")
    assert client.post('/api/visits', json={"name": "John Doe", "visitorType": "other"}).status_code == 500

@patch('app.receipts_collection')
def test_handle_receipts(mock_receipts, client):
    assert client.options('/api/receipts').status_code == 200
    mock_receipts.insert_one.return_value.inserted_id = ObjectId()
    assert client.post('/api/receipts', json={"name": "Test"}).status_code == 201
    mock_receipts.find.return_value.sort.return_value.limit.return_value = [{"_id": ObjectId()}]
    assert client.get('/api/receipts').status_code == 200

# --- ADMIN ROUTES ---
@patch('app.visits_collection')
@patch('app.receipts_collection')
def test_update_visitor_status(mock_receipts, mock_visits, client):
    vid = "507f1f77bcf86cd799439011"
    assert client.put(f'/api/admin/status/{vid}', json={}).status_code == 400
    mock_visits.find_one.return_value = None
    assert client.put(f'/api/admin/status/{vid}', json={"status": "approved"}).status_code == 404
    
    mock_visits.find_one.return_value = {"_id": ObjectId(vid)}
    mock_visits.update_one.return_value.modified_count = 1
    assert client.put(f'/api/admin/status/{vid}', json={"status": "approved"}).status_code == 200

@patch('app.visits_collection')
@patch('app.receipts_collection')
def test_manage_visitor(mock_receipts, mock_visits, client):
    vid = "507f1f77bcf86cd799439011"
    mock_visits.delete_one.return_value.deleted_count = 1
    assert client.delete(f'/api/admin/visitors/{vid}').status_code == 200
    
    mock_visits.find_one.return_value = {"_id": ObjectId(vid)}
    assert client.put(f'/api/admin/visitors/{vid}', json={"status": "approved"}).status_code == 200

@patch('app.visits_collection')
@patch('app.receipts_collection')
def test_admin_scan(mock_receipts, mock_visits, client):
    assert client.post('/api/admin/scan', json={}).status_code == 400
    with patch('app.extract_plate_from_base64') as mock_extract:
        mock_extract.return_value = "MH12AB1234"
        mock_cursor = MagicMock()
        mock_cursor.__iter__.return_value = [{"_id": ObjectId(), "vehicleNo": "MH12AB1234", "status": "pending_review"}]
        mock_visits.find.return_value.sort.return_value = mock_cursor
        res = client.post('/api/admin/scan', json={"liveFrame": "dummy"})
        assert res.status_code == 200

# --- STUDENTS & GUARD ROUTES ---
@patch('app.students_collection')
def test_handle_students(mock_students, client):
    mock_students.find.return_value.sort.return_value = [{"_id": ObjectId()}]
    assert client.get('/api/students').status_code == 200
    
    valid_payload = {"name": "John Doe", "studentId": "ABCDE12345", "guardianIncome": "1000", "dob": "2000-01-01"}
    mock_students.insert_one.return_value.inserted_id = ObjectId()
    assert client.post('/api/students', json=valid_payload).status_code == 201

@patch('app.match_face_in_db')
@patch('app.students_collection')
@patch('app.visits_collection')
def test_guard_verify_face(mock_visits, mock_students, mock_match, client):
    assert client.post('/api/guard/verify-face', json={"studentId": "ABCDE12345"}).status_code == 400
    mock_visits.find.return_value.sort.return_value.limit.return_value = []
    assert client.post('/api/guard/verify-face', json={"liveFrame": "dummy_b64"}).status_code == 404

# --- DEEP BRANCH INTEGRATION ---
@patch('app.match_face_in_db')
@patch('app.students_collection')
@patch('app.visits_collection')
def test_guard_verify_face_deep_branches(mock_visits, mock_students, mock_match, client):
    # Setup mock for pending visits
    mock_visits.find.return_value.sort.return_value.limit.return_value = [{"hostId": "STU123"}]
    
    # Branch 1: Student not fully registered (No photo/auth persons)
    mock_students.find.return_value = [{"studentId": "OTHER"}]
    res = client.post('/api/guard/verify-face', json={"liveFrame": "dummy"})
    assert res.status_code == 404
    assert "Registration (PDF form) has not been filled" in res.json["message"]

    # Branch 2: Student found, but NO photos uploaded
    # FIX: Added a person to make list truthy, but missing a photo payload
    mock_students.find.return_value = [{"studentId": "STU123", "authorizedPersons": [{"name": "No Photo Mom"}]}] 
    res = client.post('/api/guard/verify-face', json={"liveFrame": "dummy"})
    assert res.status_code == 404
    assert "No valid face photos found" in res.json["message"]

    # Branch 3: Face matches, but cannot link to a pending visit
    mock_students.find.return_value = [{"studentId": "STU123", "studentPhoto": "photo1"}]
    mock_match.return_value = {"studentId": "STU_DIFFERENT", "visitorName": "John"}
    res = client.post('/api/guard/verify-face', json={"liveFrame": "dummy"})
    assert res.status_code == 404
    assert "could not link it to a pending visitor" in res.json["message"]

    # Branch 4: Face does NOT match anyone (Intruder)
    mock_match.return_value = None
    res = client.post('/api/guard/verify-face', json={"liveFrame": "dummy"})
    assert res.status_code == 404
    assert "not authorized" in res.json["message"]

# --- EXCEPTION NUKER (FOR 90% COVERAGE) ---
@patch('app.visits_collection')
@patch('app.students_collection')
@patch('app.receipts_collection')
def test_app_exceptions(mock_receipts, mock_students, mock_visits, client):
    # 1. Force DB errors on GET requests
    mock_visits.find.side_effect = Exception("DB Crash")
    assert client.get('/api/visits').status_code == 500
    assert client.get('/api/admin/visitors').status_code == 500

    mock_receipts.find.side_effect = Exception("DB Crash")
    assert client.get('/api/receipts').status_code == 500

    mock_students.find.side_effect = Exception("DB Crash")
    assert client.get('/api/students').status_code == 500

    # 2. Force DB errors on ID-specific PUT/DELETE routes
    mock_visits.find_one.side_effect = Exception("DB Crash")
    mock_visits.delete_one.side_effect = Exception("DB Crash") # <-- FIX ADDED HERE
    assert client.put('/api/admin/status/507f1f77bcf86cd799439011', json={"status": "app"}).status_code == 500
    assert client.delete('/api/admin/visitors/507f1f77bcf86cd799439011').status_code == 500

    # 3. Force Exception in Admin Scan Route
    with patch('app.extract_plate_from_base64', side_effect=Exception("OCR Engine Crash")):
        assert client.post('/api/admin/scan', json={"liveFrame": "dummy"}).status_code == 500
        
    # 4. Force Exception in Guard Face Verify Route
    mock_visits.find.side_effect = Exception("DB Crash")
    assert client.post('/api/guard/verify-face', json={"liveFrame": "dummy"}).status_code == 500