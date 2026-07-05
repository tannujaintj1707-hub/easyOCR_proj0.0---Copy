from flask import Flask, request, jsonify
from flask_cors import CORS
from models import visits_collection, receipts_collection, users_collection, roles_collection, students_collection
from face_scanner import match_face_in_db
from plate_ocr import extract_plate_from_base64 
from datetime import datetime
from bson import ObjectId
import re

app = Flask(__name__)
CORS(app)

def seed_roles():
    if roles_collection.count_documents({}) == 0:
        default_roles = [
            {"name": "admin", "page_permissions": ["/admin", "/guard", "/apply", "/receipts", "/dashboard"], "field_permissions": ["all"]},
            {"name": "sub_admin", "page_permissions": ["/guard", "/apply", "/receipts", "/dashboard"], "field_permissions": ["read_visits", "update_status"]},
            {"name": "member", "page_permissions": ["/apply", "/receipts", "/dashboard"], "field_permissions": ["create_visit", "read_own_receipts"]}
        ]
        roles_collection.insert_many(default_roles)

seed_roles()

@app.route("/api/auth/sync", methods=["POST"])
def sync_user():
    data = request.json or {}
    clerk_id = data.get("clerk_id")
    if not clerk_id: return jsonify({"error": "Missing clerk_id"}), 400
    existing_user = users_collection.find_one({"clerk_id": clerk_id})
    final_role = data.get("role") if data.get("role") else (existing_user.get("role_name") if existing_user and existing_user.get("role_name") else "member")
    users_collection.update_one({"clerk_id": clerk_id}, {"$set": {"email": data.get("email"), "role_name": final_role}}, upsert=True)
    return jsonify({"message": "User synced", "role": final_role}), 200

@app.route("/api/auth/permissions", methods=["GET"])
def get_permissions():
    clerk_id = request.args.get("clerk_id")
    if not clerk_id: return jsonify({"error": "Missing clerk_id"}), 400
    user = users_collection.find_one({"clerk_id": clerk_id})
    if not user: return jsonify({"role": "unassigned", "page_permissions": [], "field_permissions": []}), 200
    role_data = roles_collection.find_one({"name": user.get("role_name")})
    if not role_data: return jsonify({"error": "Role configuration missing"}), 404
    return jsonify({"role": role_data.get("name"), "page_permissions": role_data.get("page_permissions", []), "field_permissions": role_data.get("field_permissions", [])}), 200

def serialize_doc(doc):
    if doc: doc['_id'] = str(doc['_id'])
    return doc

def sanitize_indian_plate(raw_text):
    if not raw_text: return ""
    clean_text = re.sub(r'[^A-Z0-9]', '', raw_text.upper())
    state_codes = r'(AP|AR|AS|BR|CG|GA|GJ|HR|HP|JH|KA|KL|MP|MH|MN|ML|MZ|NL|OD|PB|RJ|SK|TN|TS|TR|UP|UK|WB|AN|CH|DN|DD|DL|JK|LA|LD|PY|BH)'
    match = re.search(rf'({state_codes}[A-Z0-9]{{7,8}})', clean_text)
    if match: return match.group(1)
    clean_text = re.sub(r'^(IND|1ND|IN0|INO|JND|ND|IN)', '', clean_text)
    fallback_match = re.search(r'([A-Z]{2}[A-Z0-9]{7,8})', clean_text)
    if fallback_match: return fallback_match.group(1)
    if 9 <= len(clean_text) <= 10: return clean_text
    return clean_text[-10:] if len(clean_text) > 10 else clean_text

def build_db_fuzzy_regex(db_plate):
    confusion_map = {'0':'[0ODQ]','O':'[0ODQ]','D':'[0ODQ]','Q':'[0ODQ]','1':'[1ILT]','I':'[1ILT]','L':'[1ILT]','T':'[1ILT]','8':'[8B]','B':'[8B]','5':'[5S]','S':'[5S]','2':'[2Z]','Z':'[2Z]','A':'[A4H]','4':'[A4HL]','H':'[A4H]','G':'[G6C]','6':'[G6C]','C':'[CGO0]','V':'[VUY]','U':'[VUY]','Y':'[VUY]'}
    clean_db_plate = re.sub(r'[^A-Z0-9]', '', db_plate.upper())
    return "".join([confusion_map.get(c, c) + r'.?' for c in clean_db_plate])

def is_valid_name(name):
    if not name: return False
    return bool(re.match(r'^[A-Za-z]{2,}(?: [A-Za-z]+)*$', str(name).strip()))

# 🚨 STRICT STUDENT ID VALIDATOR HELPER
def validate_student_id_format(sid):
    if not sid: return False
    return bool(re.match(r'^[A-Z]{5}\d{5}$', str(sid).strip()))

def validate_names_in_payload(data):
    name_fields = ["name", "hostName", "studentName", "fatherName", "motherName", "guardianName"]
    for field in name_fields:
        if field in data and data[field]:
            if not is_valid_name(data[field]): return False, f"Invalid input: Name must contain only alphabets and at least 2 letters ({field})"
    if "members" in data and isinstance(data["members"], list):
        for m in data["members"]:
            if "name" in m and m["name"]:
                if not is_valid_name(m["name"]): return False, "Invalid input: Name must contain only alphabets and at least 2 letters"
    if "authorizedPersons" in data and isinstance(data["authorizedPersons"], list):
        for p in data["authorizedPersons"]:
            if "name" in p and p["name"]:
                if not is_valid_name(p["name"]): return False, "Invalid input: Name must contain only alphabets and at least 2 letters"
    return True, ""

def validate_contacts_in_payload(data):
    if "email" in data and data["email"]:
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', str(data["email"]).strip()): return False, "Invalid email format"
    if "mobileNo" in data and data["mobileNo"]:
        if not re.match(r'^\d{10}$', str(data["mobileNo"]).strip()): return False, "Phone number must be exactly 10 digits"
    if "authorizedPersons" in data and isinstance(data["authorizedPersons"], list):
        for person in data["authorizedPersons"]:
            if "mobile" in person and person["mobile"]:
                if not re.match(r'^\d{10}$', str(person["mobile"]).strip()): return False, "Phone number must be exactly 10 digits"
    return True, ""

def validate_student_registration_data(data):
    # 🚨 Validate Student ID Strict Format (5 Upper Alphabets + 5 Numbers)
    sid = data.get("studentId")
    if not validate_student_id_format(sid):
        return False, "Student ID must be exactly 5 uppercase letters followed by 5 numbers (e.g., ABCDE12345)."

    income = data.get("guardianIncome")
    if income is None or str(income).strip() == "":
        return False, "Annual income is required."
    income_str = str(income).strip()
    if not income_str.isdigit():
        return False, "Income must contain only numbers (no text or symbols allowed)."
    income_val = int(income_str)
    if income_val < 0:
        return False, "Income cannot be negative."
    if income_val > 1000000000:
        return False, "Income exceeds realistic limits."

    dob_str = data.get("dob")
    if not dob_str:
        return False, "Date of Birth is required."
    try:
        dob_date = datetime.strptime(dob_str[:10], "%Y-%m-%d").date()
        today = datetime.today().date()
        try:
            eleven_years_ago = today.replace(year=today.year - 11)
        except ValueError:
            eleven_years_ago = today.replace(year=today.year - 11, day=28)
        
        if dob_date > eleven_years_ago:
            return False, "Applicant must be at least 11 years old."
    except Exception:
        return False, "Invalid Date of Birth format."

    return True, ""

def auto_sync_receipt_status(visitor_id_obj, visit_doc, new_status):
    try:
        query = {
            "$or": [
                {"visitorId": str(visitor_id_obj)},
                {"visitId": str(visitor_id_obj)}
            ]
        }
        if visit_doc and "submittedAt" in visit_doc:
            query["$or"].append({"submittedAt": visit_doc["submittedAt"], "name": visit_doc.get("name")})
            
        receipts_collection.update_many(query, {"$set": {"status": new_status}})
    except Exception as e:
        print(f"Failed to sync receipt status: {e}")

@app.route("/api/visits", methods=["POST", "GET"])
def handle_visits():
    if request.method == "GET":
        try:
            return jsonify([serialize_doc(v) for v in visits_collection.find().sort("_id", -1).limit(50)]), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    if request.method == "POST":
        try:
            data = request.json
            if not data: return jsonify({"error": "No JSON data provided"}), 400
            is_valid_name_check, err_msg = validate_names_in_payload(data)
            if not is_valid_name_check: return jsonify({"error": err_msg}), 400

            # 🚨 Enforce Student ID constraint strictly for Visit passes
            visitor_type = data.get("visitorType")
            if visitor_type == "student":
                if not validate_student_id_format(data.get("studentId")):
                    return jsonify({"error": "Student ID must be exactly 5 uppercase letters followed by 5 numbers (e.g., ABCDE12345)."}), 400
            elif visitor_type == "parent":
                if not validate_student_id_format(data.get("hostId")):
                    return jsonify({"error": "Host Student ID must be exactly 5 uppercase letters followed by 5 numbers (e.g., ABCDE12345)."}), 400

            image_b64 = data.get("vehicleNoPhoto")
            if image_b64: data["vehiclePlateDetails"] = {"text": sanitize_indian_plate(extract_plate_from_base64(image_b64))}

            data["status"] = data.get("status", "pending_review")
            data["submittedAt"] = datetime.utcnow()
            result = visits_collection.insert_one(data)
            
            # Linking receipt correctly
            receipt_data = dict(data)
            receipt_data.pop("_id", None) 
            receipt_data["visitorId"] = str(result.inserted_id)
            receipts_collection.insert_one(receipt_data)

            return jsonify({"message": "Success", "id": str(result.inserted_id)}), 201
        except Exception as e:
            return jsonify({"error": "Failed to save to database", "details": str(e)}), 500

@app.route("/api/receipts", methods=["GET", "POST", "OPTIONS"])
def handle_receipts_route():
    if request.method == "OPTIONS": return jsonify({"message": "CORS preflight"}), 200
    if request.method == "POST":
        try:
            result = receipts_collection.insert_one(request.json)
            return jsonify({"message": "Receipt created", "id": str(result.inserted_id)}), 201
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    if request.method == "GET":
        try:
            return jsonify([serialize_doc(r) for r in receipts_collection.find().sort("_id", -1).limit(50)]), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@app.route("/api/admin/scan", methods=["POST"])
def live_entry_test():
    try:
        data = request.json or {}
        live_frame_b64 = data.get("liveFrame")
        if not live_frame_b64: return jsonify({"error": "No live frame provided"}), 400

        detected_plate_text = sanitize_indian_plate(extract_plate_from_base64(live_frame_b64))
        
        if detected_plate_text and len(detected_plate_text) >= 4:
            # 櫨 FIX: Added .sort([("_id", -1)]) to match the MOST RECENT plate receipt first
            cursor = visits_collection.find({
                "vehicleNo": {"$exists": True, "$ne": ""},
                "status": {"$in": ["pending_review", "approved"]}
            }).sort([("_id", -1)])

            for visitor in cursor:
                db_plate = visitor.get("vehicleNo", "")
                if not db_plate: continue
                fuzzy_regex = build_db_fuzzy_regex(db_plate)
                
                if fuzzy_regex and re.search(fuzzy_regex, detected_plate_text):
                    visitor_id = visitor.get("_id")
                    visits_collection.update_one({"_id": visitor_id}, {"$set": {"status": "approved"}})
                    auto_sync_receipt_status(visitor_id, visitor, "approved")
                    visitor["status"] = "approved"

                    return jsonify({"success": True, "message": f"Matched Vehicle Plate: {db_plate}", "visitor": serialize_doc(visitor)}), 200

        return jsonify({"success": False, "message": "No matching vehicle found. Access Denied."}), 404
            
    except Exception as e:
        return jsonify({"success": False, "message": f"Server processing error: {str(e)}"}), 500

@app.route("/api/admin/status/<visitor_id>", methods=["PUT"])
def update_visitor_status(visitor_id):
    new_status = (request.json or {}).get("status")
    if not new_status: return jsonify({"error": "No status provided"}), 400
    try:
        vid = ObjectId(visitor_id)
        visit = visits_collection.find_one({"_id": vid})
        if not visit:
            return jsonify({"success": False, "error": "Visitor not found"}), 404

        result = visits_collection.update_one({"_id": vid}, {"$set": {"status": new_status}})
        if result.modified_count == 1 or result.matched_count == 1:
            auto_sync_receipt_status(vid, visit, new_status)
            return jsonify({"success": True, "message": f"Status updated to {new_status}"}), 200
        return jsonify({"success": False, "error": "Visitor not found"}), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/admin/visitors", methods=["GET"])
def get_visitors():
    try:
        return jsonify([serialize_doc(v) for v in visits_collection.find().sort("_id", -1).limit(100)]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/admin/visitors/<visitor_id>", methods=["PUT", "DELETE"])
def manage_visitor(visitor_id):
    try:
        vid = ObjectId(visitor_id)
        if request.method == "DELETE":
            if visits_collection.delete_one({"_id": vid}).deleted_count == 1:
                receipts_collection.delete_many({"$or": [{"visitorId": str(vid)}, {"visitId": str(vid)}]})
                return jsonify({"success": True, "message": "Visitor deleted successfully"}), 200
            return jsonify({"success": False, "error": "Visitor not found"}), 404
        if request.method == "PUT":
            data = request.json
            if "_id" in data: del data["_id"]
            
            visit = visits_collection.find_one({"_id": vid})
            visits_collection.update_one({"_id": vid}, {"$set": data})
            if "status" in data and visit:
                auto_sync_receipt_status(vid, visit, data["status"])
                
            return jsonify({"success": True, "message": "Visitor updated successfully"}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/students", methods=["POST", "GET"])
def handle_students():
    if request.method == "GET":
        try:
            return jsonify([serialize_doc(s) for s in students_collection.find().sort("_id", -1)]), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    if request.method == "POST":
        try:
            data = request.json
            is_valid_name, err_name = validate_names_in_payload(data)
            if not is_valid_name: return jsonify({"error": err_name}), 400
            is_valid_contact, err_contact = validate_contacts_in_payload(data)
            if not is_valid_contact: return jsonify({"error": err_contact}), 400
            is_valid_student, err_student = validate_student_registration_data(data)
            if not is_valid_student: return jsonify({"error": err_student}), 400

            data["submittedAt"] = datetime.utcnow()
            result = students_collection.insert_one(data)
            return jsonify({"message": "Student Registration Saved", "id": str(result.inserted_id)}), 201
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@app.route("/api/guard/verify-face", methods=["POST"])
def verify_authorized_face():
    data = request.json or {}
    live_frame_b64 = data.get("liveFrame")
    target_student_id = data.get("studentId")  
    
    if not live_frame_b64: return jsonify({"error": "No live frame provided"}), 400

    try:
        expected_student_ids = []
        pending_visits_pool = []

        search_status = {"$in": ["pending_review", "approved"]}

        if target_student_id:
            expected_student_ids = [target_student_id]
            # 櫨 FIX: Added sort=[("_id", -1)] to match the MOST RECENT face receipt first
            visit = visits_collection.find_one({
                "$or": [{"hostId": target_student_id}, {"studentId": target_student_id}],
                "status": search_status
            }, sort=[("_id", -1)])
            if visit:
                pending_visits_pool.append(visit)
        else:
            # 櫨 FIX: Added .sort([("_id", -1)])
            pending_visits_pool = list(visits_collection.find({
                "status": search_status
            }).sort([("_id", -1)]).limit(50))
            
            if not pending_visits_pool:
                return jsonify({"success": False, "message": "No pending visitors found."}), 404
                
            for v in pending_visits_pool:
                sid = v.get("hostId") or v.get("studentId")
                if sid and sid not in expected_student_ids:
                    expected_student_ids.append(sid)

        if not expected_student_ids:
            return jsonify({"success": False, "message": "No valid Student IDs found in pending visits."}), 404

        students = list(students_collection.find({"studentId": {"$in": expected_student_ids}}))
        
        registered_ids = [s.get("studentId") for s in students if s.get("authorizedPersons") or s.get("studentPhoto")]
        missing_ids = [sid for sid in expected_student_ids if sid not in registered_ids]

        if not registered_ids:
            missing_str = ", ".join(missing_ids)
            return jsonify({
                "success": False, 
                "message": f"Access Denied: The Student Registration (PDF form) has not been filled for Student ID '{missing_str}'. The visitor is not authorized."
            }), 404

        flattened_persons = []
        for student in students:
            if student.get("studentId") not in registered_ids: continue
            
            if student.get("studentPhoto"):
                flattened_persons.append({
                    "visitorPhoto": student.get("studentPhoto"),
                    "visitorName": student.get("studentName", "Student (Self)"),
                    "relation": "Self",
                    "studentName": student.get("studentName", "N/A"),
                    "studentId": student.get("studentId", "N/A")
                })
                
            for person in student.get("authorizedPersons", []):
                if person.get("photo"):
                    flattened_persons.append({
                        "visitorPhoto": person.get("photo"),
                        "visitorName": person.get("name"),
                        "relation": person.get("relation", "N/A"),
                        "studentName": student.get("studentName", "N/A"),
                        "studentId": student.get("studentId", "N/A") 
                    })

        if not flattened_persons: 
            return jsonify({
                "success": False, 
                "message": "Access Denied: No valid face photos found in the Student Registration."
            }), 404

        matched_person = match_face_in_db(live_frame_b64, flattened_persons)
        
        if matched_person:
            matched_student_id = matched_person.get("studentId")
            
            latest_visit = None
            for v in pending_visits_pool:
                v_sid = v.get("hostId") or v.get("studentId")
                if v_sid == matched_student_id:
                    latest_visit = v
                    break

            if latest_visit:
                visitor_id = latest_visit.get("_id")
                visits_collection.update_one({"_id": visitor_id}, {"$set": {"status": "approved"}})
                auto_sync_receipt_status(visitor_id, latest_visit, "approved")
                latest_visit["status"] = "approved"

                return jsonify({
                    "success": True, 
                    "message": f"Authorized Person Verified: {matched_person.get('visitorName')}", 
                    "person": matched_person,
                    "visitor": serialize_doc(latest_visit)
                }), 200
            else:
                return jsonify({
                    "success": False, 
                    "message": "Access Denied: Face recognized, but could not link it to a pending visitor form for that Student ID."
                }), 404
        else:
            return jsonify({
                "success": False, 
                "message": "Access Denied: The person is not authorized. The visitor is not among the authorized person list for that particular student."
            }), 404
            
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == "__main__":# pragma: no cover
    app.run(host="0.0.0.0", port=5000, debug=True, use_reloader=False)