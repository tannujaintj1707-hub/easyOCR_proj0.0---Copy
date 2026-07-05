import pytest
import datetime
from unittest.mock import patch, MagicMock
from app import app, validate_student_registration_data, auto_sync_receipt_status
from bson import ObjectId

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

# ==========================================
# 1. FIX LINE 114 (Leap Year DOB Edge Case)
# ==========================================
@patch('app.datetime')
def test_line_114_leap_year_handling(mock_datetime):
    # Force 'today' to be a Leap Year (Feb 29) to properly test the ValueError fallback branch
    mock_datetime.today.return_value = datetime.datetime(2024, 2, 29)
    mock_datetime.strptime = datetime.datetime.strptime
    
    is_valid, _ = validate_student_registration_data({
        "studentId": "ABCDE12345",
        "guardianIncome": 50000,
        "dob": "2000-01-01"
    })
    assert is_valid

# ==========================================
# 2. FIX LINES 126-127 (Auto Sync Dictionary formatting)
# ==========================================
@patch('app.receipts_collection')
def test_lines_126_127_sync(mock_receipts):
    # Passing a real BSON ObjectId ensures the string conversion evaluates properly
    obj_id = ObjectId()
    auto_sync_receipt_status(obj_id, {"submittedAt": "2023-01-01", "name": "Test"}, "approved")
    assert mock_receipts.update_many.called

# ==========================================
# 3. FIX LINES 236-239 (Delete Visitor Success Path)
# ==========================================
@patch('app.receipts_collection')
@patch('app.visits_collection')
def test_lines_236_239_delete_success(mock_visits, mock_receipts, client):
    # Properly mock the returned object so deleted_count equals exactly 1
    mock_delete_result = MagicMock()
    mock_delete_result.deleted_count = 1
    mock_visits.delete_one.return_value = mock_delete_result
    
    res = client.delete('/api/admin/visitors/507f1f77bcf86cd799439011')
    assert res.status_code == 200

# ==========================================
# 4. FIX LINES 347 & 379 (Face Scan Multi-line Returns)
# ==========================================
@patch('app.visits_collection')
@patch('app.students_collection')
@patch('app.match_face_in_db')
def test_lines_347_and_379_face_returns(mock_match, mock_students, mock_visits, client):
    # Set up valid DB matches
    visit_doc = {"_id": ObjectId("507f1f77bcf86cd799439011"), "studentId": "ABCDE12345", "status": "pending_review"}
    mock_visits.find_one.return_value = visit_doc
    mock_students.find.return_value = [{"studentId": "ABCDE12345", "studentPhoto": "base64"}]
    
    # Force Line 347 (Full Success Match)
    mock_match.return_value = {"studentId": "ABCDE12345", "visitorName": "John Doe"}
    res_success = client.post('/api/guard/verify-face', json={"liveFrame": "b64", "studentId": "ABCDE12345"})
    assert res_success.status_code == 200
    
    # Force Line 379 (Face Not Recognized / Returns None)
    mock_match.return_value = None
    res_fail = client.post('/api/guard/verify-face', json={"liveFrame": "b64", "studentId": "ABCDE12345"})
    assert res_fail.status_code == 404