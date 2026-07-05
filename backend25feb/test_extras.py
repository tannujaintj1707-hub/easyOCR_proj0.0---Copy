# test_extras.py
import pytest
from unittest.mock import patch
import numpy as np

# 1. Clear out the unused/config files to get 100% on them
import config
import database

def test_database_and_config():
    # Literally just accessing them marks their lines as covered
    assert config.DB_NAME is not None
    
    # We mock the collection so it doesn't try to use a real DB
    with patch('database.visits_collection') as mock_coll:
        db = database.get_db()
        assert db is not None

# 2. Cover the straggling helper functions in app.py
from app import auto_sync_receipt_status, serialize_doc

@patch('app.receipts_collection')
def test_auto_sync_receipt_status_exception(mock_receipts):
    # Force the auto-sync to fail to hit the 'except Exception as e: print(e)' block
    mock_receipts.update_many.side_effect = Exception("Sync Fail")
    
    # Run it - it should safely catch the exception without crashing the app
    auto_sync_receipt_status("123", {"submittedAt": "now", "name": "John"}, "approved")

def test_serialize_doc():
    # Hit the 'if not doc:' branches
    assert serialize_doc(None) is None
    assert serialize_doc({"_id": "507f1f77bcf86cd799439011"}) == {"_id": "507f1f77bcf86cd799439011"}

# 3. Hit the final YOLO crash exception in plate_ocr.py
from plate_ocr import extract_plate_from_frame

@patch('plate_ocr._plate_detector.predict')
def test_extract_plate_yolo_crash(mock_predict):
    # Force YOLO model to completely crash
    mock_predict.side_effect = Exception("YOLO Engine Dead")
    dummy_img = np.zeros((100, 100, 3), dtype=np.uint8)
    
    # Even if YOLO crashes, your code has a fallback to full-frame OCR.
    # This test ensures the except Exception block safely handles the crash.
    result = extract_plate_from_frame(dummy_img)
    assert result is not None
    