# test_face_scanner.py
from face_scanner import decode_base64_image, adjust_illumination, match_face_in_db
from unittest.mock import patch
import numpy as np

DUMMY_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="

def test_decode_base64_image():
    assert decode_base64_image("bad_data") is None
    assert decode_base64_image("data:image/jpeg;base64," + DUMMY_B64) is not None

def test_adjust_illumination():
    assert adjust_illumination(None) is None
    dark_img = np.zeros((100, 100, 3), dtype=np.uint8)
    assert adjust_illumination(dark_img).shape == (100, 100, 3)
    bright_img = np.full((100, 100, 3), 255, dtype=np.uint8)
    assert adjust_illumination(bright_img).shape == (100, 100, 3)

@patch('face_scanner.DeepFace.extract_faces')
@patch('face_scanner.DeepFace.verify')
def test_match_face_in_db_all_formats(mock_verify, mock_extract):
    mock_extract.return_value = [{"facial_area": {"x": 0, "y": 0, "w": 100, "h": 100}, "is_real": True}]
    mock_verify.return_value = {"verified": True}
    
    dummy_record = {
        "visitorPhoto": DUMMY_B64, "visitorName": "Auth Person",
        "photo": DUMMY_B64, "name": "Student Visitor",
        "members": [{"photo": DUMMY_B64, "name": "Mem 1"}]
    }
    
    result = match_face_in_db(DUMMY_B64, [dummy_record])
    assert result == dummy_record

@patch('face_scanner.DeepFace.extract_faces')
def test_match_face_in_db_liveness_fails(mock_extract):
    # Mock fake face (photo/phone)
    mock_extract.return_value = [{"facial_area": {"x": 0, "y": 0, "w": 100, "h": 100}, "is_real": False}]
    assert match_face_in_db(DUMMY_B64, [{"visitorPhoto": DUMMY_B64}]) is None

@patch('face_scanner.DeepFace.extract_faces')
def test_match_face_in_db_no_face(mock_extract):
    mock_extract.side_effect = ValueError("No face")
    assert match_face_in_db(DUMMY_B64, []) is None
@patch('face_scanner.decode_base64_image')
@patch('face_scanner.DeepFace.extract_faces')
@patch('face_scanner.DeepFace.verify')
def test_match_face_in_db_large_image(mock_verify, mock_extract, mock_decode):
    # Return an image larger than 640px wide to trigger the resize optimization block
    mock_decode.return_value = np.zeros((1000, 1000, 3), dtype=np.uint8) 
    mock_extract.return_value = [{"facial_area": {"x": 0, "y": 0, "w": 100, "h": 100}, "is_real": True}]
    mock_verify.return_value = {"verified": True}
    
    dummy_record = {"visitorPhoto": "dummy", "visitorName": "Auth Person"}
    result = match_face_in_db("dummy", [dummy_record])
    assert result == dummy_record