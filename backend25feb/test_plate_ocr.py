# test_plate_ocr.py
from unittest.mock import patch, MagicMock
from plate_ocr import enforce_indian_plate_format, clean_indian_plate, extract_plate_from_frame, process_and_read_crop, extract_plate_from_base64
import numpy as np

def test_enforce_indian_plate_format():
    assert enforce_indian_plate_format("RU12AB1234") == "RJ12AB1234"
    assert enforce_indian_plate_format("MH1ZAB1234") == "MH12AB1234"
    assert enforce_indian_plate_format("MH") == "MH"
    assert enforce_indian_plate_format("MH120B1234") == "MH12DB1234"

def test_clean_indian_plate():
    assert clean_indian_plate(["IND MH12 AB 1234"]) == "MH12AB1234"
    assert clean_indian_plate(["1ND RJ 14 CD 5678"]) == "RJ14CD5678"

@patch('plate_ocr._ocr_reader.readtext')
def test_process_and_read_crop(mock_readtext):
    mock_readtext.return_value = [([[[0,0], [10,0], [10,10], [0,10]]], "MH12AB1234", 0.95)]
    dummy_img = np.zeros((100, 100, 3), dtype=np.uint8)
    assert process_and_read_crop(dummy_img, is_full_frame=False) == "MH12AB1234"
    
    mock_readtext.side_effect = Exception("OCR Crash")
    assert process_and_read_crop(dummy_img) == ""
    assert process_and_read_crop(None) == ""

@patch('plate_ocr._plate_detector.predict')
@patch('plate_ocr.process_and_read_crop')
def test_extract_plate_from_frame(mock_process, mock_yolo_predict):
    mock_process.return_value = "MH12AB1234"
    
    # Mock YOLO returning a valid box
    mock_box = MagicMock()
    mock_box.xyxy = [MagicMock(cpu=lambda: MagicMock(numpy=lambda: np.array([[10, 10, 100, 50]])))]
    mock_box.conf = [0.9]
    mock_yolo_predict.return_value = [MagicMock(boxes=[mock_box])]
    
    dummy_img = np.zeros((640, 640, 3), dtype=np.uint8)
    assert extract_plate_from_frame(dummy_img) == "MH12AB1234"

    # Test Empty/None Image
    assert extract_plate_from_frame(None) == ""

def test_extract_plate_base64():
    assert extract_plate_from_base64("") == ""
    assert extract_plate_from_base64("bad_data!@#") == ""
@patch('plate_ocr.process_and_read_crop')
@patch('plate_ocr._plate_detector.predict')
def test_extract_plate_from_frame_yolo_fallback(mock_predict, mock_process):
    # Mock YOLO returning ZERO bounding boxes
    mock_predict.return_value = [MagicMock(boxes=[])]
    mock_process.return_value = "FALLBACK1234"
    
    # Create an extra large image to trigger the w > 800 resize logic in the fallback
    dummy_img_large = np.zeros((1000, 1000, 3), dtype=np.uint8) 
    
    assert extract_plate_from_frame(dummy_img_large) == "FALLBACK1234"

@patch('plate_ocr._ocr_reader.readtext')
def test_process_and_read_crop_low_confidence(mock_readtext):
    # Return a low confidence (0.10) to force the function to loop through ALL passes
    mock_readtext.return_value = [([[[0,0], [10,0], [10,10], [0,10]]], "MH12AB1234", 0.10)]
    dummy_img = np.zeros((100, 100, 3), dtype=np.uint8)
    
    # It should still eventually return the string despite low confidence
    assert process_and_read_crop(dummy_img, is_full_frame=False) == "MH12AB1234"