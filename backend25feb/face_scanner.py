# face_scanner.py
import cv2
import numpy as np
import base64
import os
from deepface import DeepFace

print("⏳ Warming up Face Recognition Model (Facenet)...")
try:
    # Pre-load Keras weights into RAM on server boot so the first scan is instant.
    DeepFace.build_model("Facenet")
    print("✅ Face Recognition Model Warmed Up.")
except Exception as e:
    print(f"⚠️ Face Model warmup failed: {e}")

def decode_base64_image(base64_string):
    """Converts a base64 string from the frontend into an OpenCV image array."""
    try:
        if "," in base64_string:
            base64_string = base64_string.split(",")[1]
        img_data = base64.b64decode(base64_string)
        nparr = np.frombuffer(img_data, np.uint8)
        return cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    except Exception as e:
        print(f"Error decoding image: {e}")
        return None

def adjust_illumination(image):
    """
    SPEED & EXTREME LIGHTING FIX: Uses fast linear scaling (convertScaleAbs) 
    to instantly rescue pitch-black or highly glared images, followed by CLAHE.
    """
    if image is None:
        return None
        
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    mean_brightness = np.mean(gray)
    
    # 1. Hardware-Accelerated Fast Brightness/Contrast Fix
    if mean_brightness < 80: 
        # Low illumination / Dark: Boost brightness and contrast
        image = cv2.convertScaleAbs(image, alpha=1.5, beta=40)
    elif mean_brightness > 200: 
        # High illumination / Sun Glare: Darken image to recover washed-out features
        image = cv2.convertScaleAbs(image, alpha=0.8, beta=-20)

    # 2. CLAHE on LAB space to recover local facial topography
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)
    
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    cl = clahe.apply(l_channel)
    
    merged = cv2.merge((cl, a_channel, b_channel))
    return cv2.cvtColor(merged, cv2.COLOR_LAB2BGR)

def match_face_in_db(live_frame_b64, db_records):
    """
    Compares the live frame face against a list of database records.
    SMART Anti-Spoofing: Requires at least ONE real face in the frame to proceed.
    """
    live_img = decode_base64_image(live_frame_b64)
    if live_img is None:
        return None

    # ==========================================
    # SPEED OPTIMIZATION: RESIZE LIVE IMAGE
    # Downscaling drastically reduces Face Extraction and Illumination processing time
    # ==========================================
    h_orig, w_orig = live_img.shape[:2]
    if w_orig > 640:
        scale = 640.0 / w_orig
        live_img = cv2.resize(live_img, (640, int(h_orig * scale)))

    # ==========================================
    # SMART ANTI-SPOOFING & SINGLE FACE FILTER
    # ==========================================
    try:
        face_objs = DeepFace.extract_faces(
            img_path=live_img, 
            anti_spoofing=True,    
            enforce_detection=True,
            detector_backend="opencv"
        )
        
        if not face_objs:
            return None

        # 1. SORT BY AREA: Strictly process only the LARGEST face (closest person)
        face_objs = sorted(face_objs, key=lambda x: x['facial_area']['w'] * x['facial_area']['h'], reverse=True)
        primary_face = face_objs[0]
        
        is_real = primary_face.get("is_real", False)
        antispoof_score = primary_face.get("antispoof_score", "N/A") 
        
        print(f"📷 Analyzing Primary Face: Liveness Score = {antispoof_score} | Is Real 3D? = {is_real}")
        
        if not is_real:
            print("🚨 ACCESS DENIED: The AI determined the face in the camera is a flat 2D surface (Phone/Photo).")
            return None # Block entry

        # 2. Crop the live image to ONLY the face based on the coordinates found.
        area = primary_face["facial_area"]
        x, y, w_face, h_face = area["x"], area["y"], area["w"], area["h"]
        
        pad = 20 # Add slight padding around face
        h_img, w_img = live_img.shape[:2]
        y1, y2 = max(0, y - pad), min(h_img, y + h_face + pad)
        x1, x2 = max(0, x - pad), min(w_img, x + w_face + pad)
        
        live_cropped_face = live_img[y1:y2, x1:x2]
        
        # 3. NOW apply the lighting adjustments specifically to the cropped face
        # This enhances the AI embedding match without breaking the earlier Liveness check.
        live_cropped_face = adjust_illumination(live_cropped_face)

    except ValueError:
        print("❌ No human face detected in the live camera frame.")
        return None
    except Exception as e:
        print(f"⚠️ Liveness check error: {e}")
        return None

    # ==========================================
    # HIGH-SPEED FACE MATCHING LOOP
    # ==========================================
    print("✅ Liveness Check Passed. Searching database for a match...")
    
    for record in db_records:
        photos_to_check = []
        
        # Format 1: Authorized Persons
        if record.get("visitorPhoto"):
            photos_to_check.append({
                "name": record.get("visitorName", "Authorized Person"), 
                "photo": record.get("visitorPhoto"), 
                "doc": record
            })
            
        # Format 2: Gate Pass - Student Visitor
        if record.get("photo"):
            photos_to_check.append({
                "name": record.get("name", "Student"), 
                "photo": record.get("photo"), 
                "doc": record
            })
            
        # Format 3: Gate Pass - Parent/Visitor with members array
        if record.get("members"):
            for member in record.get("members", []):
                if member.get("photo"):
                    photos_to_check.append({
                        "name": member.get("name", "Visitor Member"), 
                        "photo": member.get("photo"), 
                        "doc": record
                    })
                    
        # Run Verification
        for item in photos_to_check:
            db_photo_b64 = item["photo"]
            if not db_photo_b64:
                continue
                
            db_img = decode_base64_image(db_photo_b64)
            if db_img is None:
                continue
                
            # CRITICAL SPEED FIX: Resize massive DB images. 
            h_db, w_db = db_img.shape[:2]
            if w_db > 640:
                scale = 640.0 / w_db
                db_img = cv2.resize(db_img, (640, int(h_db * scale)))
                
            # CRITICAL ACCURACY FIX: Illuminate the DB image!
            db_img = adjust_illumination(db_img)

            try:
                # detector_backend="opencv" ensures the DB image gets properly cropped 
                # to just the face before Keras compares embeddings.
                result = DeepFace.verify(
                    img1_path=live_cropped_face, 
                    img2_path=db_img, 
                    model_name="Facenet", 
                    enforce_detection=False,
                    detector_backend="opencv", 
                    align=False
                )
                
                if result["verified"]:
                    print(f"🎉 SUCCESS: Face matched with {item['name']} in the database!")
                    return item["doc"] 
                    
            except Exception as e:
                print(f"DeepFace verification error for {item['name']}: {e}")
                continue
                
    print("❌ Match Failed: The real person in the camera is not in the authorized database.")
    return None