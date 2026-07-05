import pytest
from unittest.mock import patch, MagicMock
from app import app, validate_student_registration_data, auto_sync_receipt_status

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

# ==========================================
# 1. HELPER EDGE CASES (DOB & Sync Errors)
# ==========================================
def test_validate_student_dob_exception():
    # Triggers the 'except Exception:' block in validate_student_registration_data
    data = {
        "studentId": "ABCDE12345",
        "guardianIncome": "50000",
        "dob": "invalid-date-format-triggering-exception"
    }
    is_valid, msg = validate_student_registration_data(data)
    assert not is_valid
    assert msg == "Invalid Date of Birth format."

@patch('app.receipts_collection')
def test_auto_sync_receipt_status_exception(mock_receipts):
    # Triggers the 'except Exception as e:' block to ensure it fails gracefully
    mock_receipts.update_many.side_effect = Exception("Forced DB Error")
    auto_sync_receipt_status("123", {"submittedAt": "2023-01-01", "name": "Test"}, "approved")

# ==========================================
# 2. STATUS & ADMIN ROUTE EXCEPTIONS
# ==========================================
def test_update_visitor_status_no_status(client):
    # Missing status payload
    res = client.put('/api/admin/status/64b5f8c8a1b2c3d4e5f6a7b8', json={})
    assert res.status_code == 400
    assert "No status provided" in res.json["error"]

@patch('app.visits_collection')
def test_update_visitor_status_not_modified(mock_visits, client):
    # Valid DB hit but no documents modified/matched
    mock_visits.find_one.return_value = {"_id": "64b5f8c8a1b2c3d4e5f6a7b8"}
    mock_update_result = MagicMock()
    mock_update_result.modified_count = 0
    mock_update_result.matched_count = 0
    mock_visits.update_one.return_value = mock_update_result
    
    res = client.put('/api/admin/status/64b5f8c8a1b2c3d4e5f6a7b8', json={"status": "rejected"})
    assert res.status_code == 404
    assert "Visitor not found" in res.json["error"]

@patch('app.visits_collection')
def test_update_visitor_status_exception(mock_visits, client):
    # DB exception (500)
    mock_visits.find_one.side_effect = Exception("DB Connection Lost")
    res = client.put('/api/admin/status/64b5f8c8a1b2c3d4e5f6a7b8', json={"status": "approved"})
    assert res.status_code == 500

@patch('app.visits_collection')
def test_get_visitors_exception(mock_visits, client):
    mock_visits.find.side_effect = Exception("DB Connection Lost")
    assert client.get('/api/admin/visitors').status_code == 500

@patch('app.visits_collection')
def test_manage_visitor_put_exception(mock_visits, client):
    mock_visits.find_one.side_effect = Exception("DB Connection Lost")
    assert client.put('/api/admin/visitors/64b5f8c8a1b2c3d4e5f6a7b8', json={"status": "approved"}).status_code == 500

# ==========================================
# 3. DB EXCEPTION FALLBACKS (STUDENTS & RECEIPTS)
# ==========================================
@patch('app.students_collection')
def test_handle_students_get_exception(mock_students, client):
    mock_students.find.side_effect = Exception("DB Connection Lost")
    assert client.get('/api/students').status_code == 500

@patch('app.students_collection')
def test_handle_students_post_exception(mock_students, client):
    mock_students.insert_one.side_effect = Exception("DB Connection Lost")
    valid_data = {
        "studentName": "John Doe", "studentId": "ABCDE12345", 
        "guardianIncome": 500000, "dob": "2010-01-01", 
        "mobileNo": "9876543210", "email": "test@test.com"
    }
    assert client.post('/api/students', json=valid_data).status_code == 500

@patch('app.receipts_collection')
def test_handle_receipts_get_exception(mock_receipts, client):
    mock_receipts.find.side_effect = Exception("DB Connection Lost")
    assert client.get('/api/receipts').status_code == 500

@patch('app.receipts_collection')
def test_handle_receipts_post_exception(mock_receipts, client):
    mock_receipts.insert_one.side_effect = Exception("DB Connection Lost")
    assert client.post('/api/receipts', json={"visitorId": "123"}).status_code == 500

# ==========================================
# 4. FACE SCANNER EDGE CASES
# ==========================================
@patch('app.visits_collection')
def test_verify_authorized_face_missing_frame(mock_visits, client):
    assert client.post('/api/guard/verify-face', json={"studentId": "ABCDE12345"}).status_code == 400

@patch('app.visits_collection')
def test_verify_authorized_face_target_student_no_visit(mock_visits, client):
    mock_visits.find_one.return_value = None
    res = client.post('/api/guard/verify-face', json={"liveFrame": "b64", "studentId": "ABCDE12345"})
    assert res.status_code == 404

@patch('app.visits_collection')
def test_verify_authorized_face_no_target_empty_pool(mock_visits, client):
    mock_cursor = MagicMock()
    mock_cursor.sort.return_value.limit.return_value = []
    mock_visits.find.return_value = mock_cursor
    assert client.post('/api/guard/verify-face', json={"liveFrame": "b64"}).status_code == 404

@patch('app.visits_collection')
@patch('app.students_collection')
def test_verify_authorized_face_no_registered_ids(mock_students, mock_visits, client):
    mock_visits.find_one.return_value = {"_id": "1", "studentId": "ABCDE12345", "status": "pending_review"}
    # Missing studentPhoto and authorizedPersons
    mock_students.find.return_value = [{"studentId": "ABCDE12345"}] 
    res = client.post('/api/guard/verify-face', json={"liveFrame": "b64", "studentId": "ABCDE12345"})
    assert res.status_code == 404
    assert "has not been filled" in res.json["message"]

@patch('app.visits_collection')
@patch('app.students_collection')
def test_verify_authorized_face_no_flattened_persons(mock_students, mock_visits, client):
    mock_visits.find_one.return_value = {"_id": "1", "studentId": "ABCDE12345", "status": "pending_review"}
    # Has authorizedPersons but no "photo" key included
    mock_students.find.return_value = [{"studentId": "ABCDE12345", "authorizedPersons": [{"name": "Test"}]}] 
    res = client.post('/api/guard/verify-face', json={"liveFrame": "b64", "studentId": "ABCDE12345"})
    assert res.status_code == 404
    assert "No valid face photos found" in res.json["message"]

@patch('app.visits_collection')
@patch('app.students_collection')
@patch('app.match_face_in_db')
def test_verify_authorized_face_matched_but_no_latest_visit(mock_match, mock_students, mock_visits, client):
    mock_visits.find_one.return_value = {"_id": "1", "studentId": "ABCDE12345", "status": "pending_review"}
    mock_students.find.return_value = [{"studentId": "ABCDE12345", "studentPhoto": "photo123"}]
    # Mock returns a DIFFERENT student ID that isn't in pending_visits_pool
    mock_match.return_value = {"studentId": "DIFFERENT_ID", "visitorName": "Test"}
    
    res = client.post('/api/guard/verify-face', json={"liveFrame": "b64", "studentId": "ABCDE12345"})
    assert res.status_code == 404
    assert "could not link it to a pending visitor form" in res.json["message"]

@patch('app.visits_collection')
def test_verify_authorized_face_exception(mock_visits, client):
    mock_visits.find_one.side_effect = Exception("Face verification DB Error")
    assert client.post('/api/guard/verify-face', json={"liveFrame": "b64", "studentId": "ABCDE12345"}).status_code == 500