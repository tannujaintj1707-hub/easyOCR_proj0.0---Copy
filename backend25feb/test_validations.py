# test_validations.py
from app import (
    validate_names_in_payload, 
    validate_contacts_in_payload,
    validate_student_id_format, 
    sanitize_indian_plate, 
    is_valid_name,
    validate_student_registration_data
)

def test_validate_student_id_format():
    assert validate_student_id_format("ABCDE12345") is True
    assert validate_student_id_format("abcde12345") is False  # Fails: must be uppercase
    assert validate_student_id_format("ABCD123456") is False  # Fails: wrong letter count
    assert validate_student_id_format("") is False

def test_sanitize_indian_plate():
    assert sanitize_indian_plate("INDMH12AB1234") == "MH12AB1234"
    assert sanitize_indian_plate("1ND RJ14 CD 5678") == "RJ14CD5678"

def test_is_valid_name():
    assert is_valid_name("John Doe") is True
    assert is_valid_name("A") is False # Fails: too short
    assert is_valid_name("John123") is False # Fails: numbers not allowed

def test_validate_student_registration_data():
    # Test valid data
    valid_data = {
        "studentId": "ABCDE12345",
        "guardianIncome": "50000",
        "dob": "2010-01-01"
    }
    is_valid, err = validate_student_registration_data(valid_data)
    assert is_valid is True
    
    # Test underage applicant
    underage_data = {
        "studentId": "ABCDE12345",
        "guardianIncome": "50000",
        "dob": "2020-01-01"
    }
    is_valid, err = validate_student_registration_data(underage_data)
    assert is_valid is False
    assert "least 11 years old" in err

def test_validate_names_in_payload():
    # Valid payload
    is_valid, err = validate_names_in_payload({
        "name": "John Doe", 
        "members": [{"name": "Jane Doe"}], 
        "authorizedPersons": [{"name": "Jim Doe"}]
    })
    assert is_valid is True

    # Invalid main name
    is_valid, err = validate_names_in_payload({"name": "123"})
    assert is_valid is False

    # Invalid member name
    is_valid, err = validate_names_in_payload({"members": [{"name": "123"}]})
    assert is_valid is False

    # Invalid authorized person name
    is_valid, err = validate_names_in_payload({"authorizedPersons": [{"name": "123"}]})
    assert is_valid is False

def test_validate_contacts_in_payload():
    # Valid contacts
    is_valid, err = validate_contacts_in_payload({
        "email": "test@test.com", 
        "mobileNo": "1234567890", 
        "authorizedPersons": [{"mobile": "0987654321"}]
    })
    assert is_valid is True

    # Invalid email
    is_valid, err = validate_contacts_in_payload({"email": "bademail"})
    assert is_valid is False

    # Invalid mobileNo (too short)
    is_valid, err = validate_contacts_in_payload({"mobileNo": "123"})
    assert is_valid is False

    # Invalid authorized person mobile
    is_valid, err = validate_contacts_in_payload({"authorizedPersons": [{"mobile": "123"}]})
    assert is_valid is False