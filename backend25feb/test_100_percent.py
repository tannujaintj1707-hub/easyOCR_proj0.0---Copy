# test_100_percent.py
import pytest
from unittest.mock import patch, MagicMock
import importlib
import numpy as np

# ==========================================
# 1. IMPORT-TIME AI & DB CRASHES
# ==========================================
@patch('models.visits_collection.drop_index', side_effect=Exception("Drop failed"))
@patch('models.users_collection.create_index', side_effect=Exception("Create failed"))
def test_models_import_exceptions(mock_create, mock_drop):
    import models
    importlib.reload(models) # Forces the try/except blocks in models.py to run with exceptions

@patch('face_scanner.DeepFace.build_model', side_effect=Exception("Warmup fail"))
def test_face_scanner_import_exceptions(mock_build):
    import face_scanner
    importlib.reload(face_scanner)

@patch('plate_ocr.YOLO', side_effect=[Exception("Init fail"), MagicMock()])
def test_plate_ocr_import_exceptions(mock_yolo):
    import plate_ocr
    importlib.reload(plate_ocr)

# ==========================================
# 2. INNER AI EXCEPTIONS
# ==========================================
from face_scanner import match_face_in_db

@patch('face_scanner.DeepFace.extract_faces', side_effect=Exception("Liveness Crash"))
def test_face_scanner_liveness_crash(mock_extract):
    assert match_face_in_db("dummy", []) is None

@patch('face_scanner.DeepFace.extract_faces')
@patch('face_scanner.decode_base64_image', return_value=np.zeros((100, 100, 3), dtype=np.uint8))
@patch('face_scanner.DeepFace.verify', side_effect=Exception("Verify Crash"))
def test_face_scanner_verify_crash(mock_verify, mock_decode, mock_extract):
    # Mock liveness passing, but verification crashing
    mock_extract.return_value = [{"facial_area": {"x": 0, "y": 0, "w": 100, "h": 100}, "is_real": True}]
    dummy_record = {"visitorPhoto": "dummy", "visitorName": "Auth Person"}
    assert match_face_in_db("dummy", [dummy_record]) is None

# ==========================================
# 3. APP.PY DEEP BRANCH EDGE CASES
# ==========================================
@patch('app.roles_collection')
@patch('app.users_collection')
def test_permissions_no_role(mock_users, mock_roles, client):
    mock_users.find_one.return_value = {"role_name": "fake"}
    mock_roles.find_one.return_value = None
    assert client.get('/api/auth/permissions?clerk_id=123').status_code == 404

@patch('app.visits_collection')
def test_app_deep_branches(mock_visits, client):
    # Branch: Visitor Type == Parent (Invalid Host ID)
    res = client.post('/api/visits', json={"name": "John", "visitorType": "parent", "hostId": "bad"})
    assert res.status_code == 400

    # Branch: Admin Status Update -> matched=0
    mock_visits.find_one.return_value = {"_id": "123"}
    with patch('app.visits_collection.update_one') as mock_up:
        mock_up.return_value.modified_count = 0
        mock_up.return_value.matched_count = 0
        assert client.put('/api/admin/status/507f1f77bcf86cd799439011', json={"status": "app"}).status_code == 404

    # Branch: Manage Visitor Delete -> deleted=0
    with patch('app.visits_collection.delete_one') as mock_del:
        mock_del.return_value.deleted_count = 0
        assert client.delete('/api/admin/visitors/507f1f77bcf86cd799439011').status_code == 404

@patch('app.visits_collection')
@patch('app.students_collection')
def test_guard_deep_branches(mock_students, mock_visits, client):
    # Branch: Target ID valid, but NO visit found in DB
    mock_visits.find_one.return_value = None
    assert client.post('/api/guard/verify-face', json={"liveFrame": "dummy", "studentId": "ABCDE12345"}).status_code == 404
    
    # Branch: Target ID valid, Visit Found, but Student profile missing
    mock_visits.find_one.return_value = {"hostId": "ABCDE12345", "status": "pending_review"}
    mock_students.find.return_value = []
    res = client.post('/api/guard/verify-face', json={"liveFrame": "dummy", "studentId": "ABCDE12345"})
    assert res.status_code == 404
    