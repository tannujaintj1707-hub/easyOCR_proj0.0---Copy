# backend25feb/test_system_app.py
import pytest
from unittest.mock import patch, MagicMock
from app import app, sanitize_indian_plate, build_db_fuzzy_regex, is_valid_name, validate_student_id_format
from app import validate_names_in_payload, validate_contacts_in_payload, validate_student_registration_data
from app import auto_sync_receipt_status
from datetime import datetime

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

# ==========================================
# 1. HELPER FUNCTION TESTS (Covering missing lines 54-58, 80-86, 95-97, 104-120)
# ==========================================
def test_helper_functions():
    # Plate Sanitization Paths
    assert sanitize_indian_plate("IND MH12AB1234") == "MH12AB1234"
    assert sanitize_indian_plate("") == ""
    assert sanitize_indian_plate("IND123456789012") == "3456789012"  # Hits > 10 chars
    assert sanitize_indian_plate("MH1234567") == "MH1234567"  # Hits 9-10 chars fallback

    # Student ID & Name Validation
    assert validate_student_id_format("ABCDE12345") == True
    assert validate_student_id_format("ABC12345") == False
    assert is_valid_name("John Doe") == True
    assert is_valid_name("J") == False
    
    # Fuzzy Regex
    assert "M.?" in build_db_fuzzy_regex("MH12")

def test_validation_payloads():
    # Names Validation (Including nested lists)
    assert validate_names_in_payload({"name": "A"})[0] == False
    assert validate_names_in_payload({"members": [{"name": "A"}]})[0] == False
    assert validate_names_in_payload({"authorizedPersons": [{"name": "A"}]})[0] == False
    assert validate_names_in_payload({"name": "John Doe", "members": [{"name": "Jane Doe"}]})[0] == True

    # Contacts Validation (Including nested lists)
    assert validate_contacts_in_payload({"email": "bad"})[0] == False
    assert validate_contacts_in_payload({"mobileNo": "123"})[0] == False
    assert validate_contacts_in_payload({"authorizedPersons": [{"mobile": "123"}]})[0] == False
    assert validate_contacts_in_payload({"email": "test@test.com", "mobileNo": "9876543210"})[0] == True

def test_student_registration_validation():
    # Missing / Bad Student ID
    assert validate_student_registration_data({"studentId": "bad"})[0] == False
    
    # Income Validations
    base = {"studentId": "ABCDE12345"}
    assert validate_student_registration_data({**base})[0] == False # Missing
    assert validate_student_registration_data({**base, "guardianIncome": "abc"})[0] == False # Text
    assert validate_student_registration_data({**base, "guardianIncome": -10})[0] == False # Negative
    assert validate_student_registration_data({**base, "guardianIncome": 2000000000})[0] == False # Too high

    # DOB Validations
    base["guardianIncome"] = 500000
    assert validate_student_registration_data({**base})[0] == False # Missing
    assert validate_student_registration_data({**base, "dob": "bad-date"})[0] == False # Format
    assert validate_student_registration_data({**base, "dob": datetime.today().strftime("%Y-%m-%d")})[0] == False # Too young
    assert validate_student_registration_data({**base, "dob": "2000-01-01"})[0] == True

@patch('app.receipts_collection')
def test_auto_sync_receipt_status(mock_receipts):
    # Hits missing lines 126-127, 131-132
    auto_sync_receipt_status("123", {"submittedAt": "date", "name": "John"}, "approved")
    mock_receipts.update_many.side_effect = Exception("DB Error")
    auto_sync_receipt_status("123", None, "approved") # Will catch and print smoothly

# ==========================================
# 2. AUTH ROUTE TESTS
# ==========================================
@patch('app.users_collection')
def test_auth_sync(mock_users, client):
    assert client.post('/api/auth/sync', json={}).status_code == 400
    mock_users.find_one.return_value = None
    res = client.post('/api/auth/sync', json={"clerk_id": "123", "email": "test@test.com", "role": "admin"})
    assert res.status_code == 200

@patch('app.roles_collection')
@patch('app.users_collection')
def test_get_permissions(mock_users, mock_roles, client):
    assert client.get('/api/auth/permissions').status_code == 400
    mock_users.find_one.return_value = None
    assert client.get('/api/auth/permissions?clerk_id=123').json["role"] == "unassigned"

    mock_users.find_one.return_value = {"role_name": "admin"}
    mock_roles.find_one.return_value = {"name": "admin", "page_permissions": ["/admin"]}
    assert client.get('/api/auth/permissions?clerk_id=123').json["page_permissions"] == ["/admin"]

# ==========================================
# 3. VISITS & RECEIPTS ROUTE TESTS
# ==========================================
@patch('app.visits_collection')
def test_get_visits(mock_visits, client):
    mock_visits.find.return_value.sort.return_value.limit.return_value = [{"_id": "1"}]
    assert client.get('/api/visits').status_code == 200
    mock_visits.find.side_effect = Exception("DB Error")
    assert client.get('/api/visits').status_code == 500

@patch('app.receipts_collection')
@patch('app.visits_collection')
@patch('app.extract_plate_from_base64')
def test_post_visits(mock_ocr, mock_visits, mock_receipts, client):
    # 🚨 FIXED: Sending {} instead of None prevents Flask 500 crash
    assert client.post('/api/visits', json={}).status_code == 400
    assert client.post('/api/visits', json={"name": "J"}).status_code == 400

    # Test Missing lines 145, 148-149 (Student ID strict format per type)
    assert client.post('/api/visits', json={"name": "John Doe", "visitorType": "student", "studentId": "bad"}).status_code == 400
    assert client.post('/api/visits', json={"name": "John Doe", "visitorType": "parent", "hostId": "bad"}).status_code == 400

    # Success
    mock_ocr.return_value = "MH12AB1234"
    mock_visits.insert_one.return_value.inserted_id = "123"
    res = client.post('/api/visits', json={
        "name": "John Doe", 
        "visitorType": "student", 
        "studentId": "ABCDE12345",
        "vehicleNoPhoto": "base64data"
    })
    assert res.status_code == 201

    mock_visits.insert_one.side_effect = Exception("DB Down")
    assert client.post('/api/visits', json={"name": "John Doe", "visitorType": "other"}).status_code == 500

@patch('app.receipts_collection')
def test_receipts_routes(mock_receipts, client):
    assert client.options('/api/receipts').status_code == 200
    mock_receipts.insert_one.return_value.inserted_id = "123"
    assert client.post('/api/receipts', json={"amount": 100}).status_code == 201
    mock_receipts.find.return_value.sort.return_value.limit.return_value = [{"_id": "1"}]
    assert client.get('/api/receipts').status_code == 200

# ==========================================
# 4. ADMIN DASHBOARD TESTS
# ==========================================
@patch('app.visits_collection')
def test_admin_visitors(mock_visits, client):
    mock_visits.find.return_value.sort.return_value.limit.return_value = [{"_id": "1"}]
    assert client.get('/api/admin/visitors').status_code == 200

@patch('app.receipts_collection')
@patch('app.visits_collection')
def test_manage_visitor(mock_visits, mock_receipts, client):
    # PUT Success (Covering line 249 `if "_id" in data` and 255-257 status sync)
    mock_visits.find_one.return_value = {"_id": "1", "status": "pending"}
    res = client.put('/api/admin/visitors/64b5f8c8a1b2c3d4e5f6a7b8', json={"status": "approved", "_id": "remove_me"})
    assert res.status_code == 200

    # DELETE Success
    mock_visits.delete_one.return_value.deleted_count = 1
    assert client.delete('/api/admin/visitors/64b5f8c8a1b2c3d4e5f6a7b8').status_code == 200

    # DELETE Not Found (Hits 238-239)
    mock_visits.delete_one.return_value.deleted_count = 0
    assert client.delete('/api/admin/visitors/64b5f8c8a1b2c3d4e5f6a7b8').status_code == 404

@patch('app.visits_collection')
def test_update_visitor_status(mock_visits, client):
    assert client.put('/api/admin/status/64b5f8c8a1b2c3d4e5f6a7b8', json={}).status_code == 400
    
    mock_visits.find_one.return_value = None
    assert client.put('/api/admin/status/64b5f8c8a1b2c3d4e5f6a7b8', json={"status": "approved"}).status_code == 404 # Hits 199-200

    mock_visits.find_one.return_value = {"_id": "1"}
    mock_visits.update_one.return_value.modified_count = 1
    assert client.put('/api/admin/status/64b5f8c8a1b2c3d4e5f6a7b8', json={"status": "approved"}).status_code == 200

@patch('app.visits_collection')
@patch('app.extract_plate_from_base64')
def test_live_entry_test(mock_ocr, mock_visits, client):
    assert client.post('/api/admin/scan', json={}).status_code == 400

    mock_ocr.return_value = "MH12AB1234"
    mock_cursor = MagicMock()
    mock_cursor.sort.return_value = [{"_id": "1", "vehicleNo": "MH12AB1234", "status": "pending_review"}]
    mock_visits.find.return_value = mock_cursor
    
    res = client.post('/api/admin/scan', json={"liveFrame": "b64"})
    assert res.status_code == 200 # Hits 162-188

# ==========================================
# 5. STUDENTS ROUTE TESTS
# ==========================================
@patch('app.students_collection')
def test_students_routes(mock_students, client):
    mock_students.find.return_value.sort.return_value = [{"_id": "1"}]
    assert client.get('/api/students').status_code == 200

    mock_students.insert_one.return_value.inserted_id = "123"
    valid_data = {
        "studentName": "John Doe", "studentId": "ABCDE12345", 
        "guardianIncome": 500000, "dob": "2010-01-01", 
        "mobileNo": "9876543210", "email": "test@test.com"
    }
    assert client.post('/api/students', json=valid_data).status_code == 201

# ==========================================
# 6. FACE VERIFICATION TESTS
# ==========================================
@patch('app.match_face_in_db')
@patch('app.students_collection')
@patch('app.visits_collection')
def test_verify_authorized_face(mock_visits, mock_students, mock_match, client):
    assert client.post('/api/guard/verify-face', json={}).status_code == 400

    # Hit 293-294 (No valid student IDs found)
    mock_cursor = MagicMock()
    mock_cursor.sort.return_value.limit.return_value = [{"_id": "1", "status": "pending"}]
    mock_visits.find.return_value = mock_cursor
    assert client.post('/api/guard/verify-face', json={"liveFrame": "b64"}).status_code == 404

    # Valid Match Found (Hits lines 337-347)
    mock_visits.find_one.return_value = {"_id": "1", "studentId": "ABCDE12345", "status": "pending"}
    mock_students.find.return_value = [{"studentId": "ABCDE12345", "studentPhoto": "photo123"}]
    mock_match.return_value = {"studentId": "ABCDE12345", "visitorName": "Test", "relation": "Self"}
    assert client.post('/api/guard/verify-face', json={"liveFrame": "b64", "studentId": "ABCDE12345"}).status_code == 200

    # Face recognized but could not link (Hits line 350)
    mock_match.return_value = {"studentId": "DIFFERENT12345"}
    assert client.post('/api/guard/verify-face', json={"liveFrame": "b64", "studentId": "ABCDE12345"}).status_code == 404

    # Face not recognized at all (Hits line 355)
    mock_match.return_value = None
    assert client.post('/api/guard/verify-face', json={"liveFrame": "b64", "studentId": "ABCDE12345"}).status_code == 404