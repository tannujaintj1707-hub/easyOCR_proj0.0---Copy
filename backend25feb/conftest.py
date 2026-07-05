# conftest.py
import pytest
import mongomock
from unittest.mock import patch

# 🚨 CRITICAL FIX: We must intercept the MongoDB connection globally BEFORE importing app.py.
# This forces 'models.py', 'database.py', and 'app.py' to use an in-memory fake database 
# during the initial load, preventing seed_roles() from crashing the test suite.
patch('pymongo.MongoClient', mongomock.MongoClient).start()

from app import app

@pytest.fixture
def client():
    # Configure Flask for testing
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

# Note: The old mock_mongo autouse fixture is completely removed because 
# mongomock is now handling all database interceptions natively!