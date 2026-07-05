# backend25feb/plate_ocr.py
import os
import cv2
import numpy as np
import base64
import easyocr
import re
from ultralytics import YOLO

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
YOLO_MODEL_PATH = os.path.join(BASE_DIR, "yolov8n.pt")

print("⏳ Initializing AI Models...")
# --- WARM-UP IMAGE ---
_dummy_img = np.zeros((640, 640, 3), dtype=np.uint8)

try:
    _plate_detector = YOLO(YOLO_MODEL_PATH)
    _plate_detector.predict(_dummy_img, verbose=False) # WARM UP
except Exception as e:
    print(f"❌ Custom model failed: {e}. Falling back to default yolov8n.pt")
    _plate_detector = YOLO("yolov8n.pt")
    _plate_detector.predict(_dummy_img, verbose=False) # WARM UP

# EasyOCR handles natural images better without extreme binarization
_ocr_reader = easyocr.Reader(['en'], gpu=False)
_ocr_reader.readtext(_dummy_img, detail=0) # WARM UP
print("✅ AI Models Warmed Up and Ready.")

def enforce_indian_plate_format(text):
    """
    Strict post-processing to fix character confusion based on Indian Format:
    [State: 2 Letters] [RTO: 2 Digits] [Series: 1-3 Letters] [Number: 4 Digits]
    """
    if not text: return text
    clean_text = list(text.upper())
    
    if len(clean_text) < 6 or len(clean_text) > 11:
        return "".join(clean_text)

    # Number mapping
    l2n = {'O':'0', 'D':'0', 'Q':'0', 'C':'6', 'I':'1', 'L':'1', 'T':'1', 'Z':'2', 'A':'4', 'S':'5', 'G':'6', 'B':'8', 'E':'3', 'R':'2', 'J':'3'}
    
    # Standard Letter mapping (Used for State Code)
    n2l_state = {'0':'O', '1':'I', '2':'Z', '3':'E', '4':'A', '5':'S', '6':'G', '8':'B'}
    
    # Series Letter mapping (Enforces NO 'I' or 'O')
    n2l_series = {'0':'D', '1':'L', '2':'Z', '3':'E', '4':'A', '5':'S', '6':'G', '8':'B'}

    # 1. Last 4 characters MUST be digits
    for i in range(max(0, len(clean_text) - 4), len(clean_text)):
        if clean_text[i] in l2n: clean_text[i] = l2n[clean_text[i]]

    # 2. First 2 characters MUST be letters
    for i in range(min(2, len(clean_text))):
        if clean_text[i] in n2l_state: clean_text[i] = n2l_state[clean_text[i]]
        
    # 2.1 State Code Auto-Correction (Fixes OCR mangling valid states)
    if len(clean_text) >= 2:
        state_code = "".join(clean_text[:2])
        state_fixes = {
            'RU': 'RJ', 'RO': 'RJ', 'R0': 'RJ', '8J': 'RJ', 'P.J': 'RJ',
            '0L': 'DL', 'D1': 'DL', 'Q1': 'DL', 'O1': 'DL',
            'U0': 'UP', 'U9': 'UP', 'VP': 'UP', 'OP': 'UP',
            'M8': 'MH', 'N8': 'MH', 'NH': 'MH', 'W4': 'MH',
            'P8': 'PB', 'P6': 'PB', 'PR': 'PB',
            '6J': 'GJ', '6A': 'GA', 'C6': 'CG',
            'A8': 'AR', '4R': 'AR'
        }
        if state_code in state_fixes:
            clean_text[0] = state_fixes[state_code][0]
            clean_text[1] = state_fixes[state_code][1]

    # 3. Characters at index 2 and 3 MUST be digits (RTO code)
    if len(clean_text) >= 4:
        for i in range(2, min(4, len(clean_text) - 4)):
            if clean_text[i] in l2n: clean_text[i] = l2n[clean_text[i]]

    # 4. Middle chars MUST be letters, and strictly NEVER 'I' or 'O'
    if len(clean_text) > 6:
        for i in range(4, len(clean_text) - 4):
            if clean_text[i] in n2l_series: 
                clean_text[i] = n2l_series[clean_text[i]]
            
            if clean_text[i] == 'O': 
                clean_text[i] = 'D'  
            elif clean_text[i] == 'I': 
                clean_text[i] = 'L'  

    return "".join(clean_text)

def clean_indian_plate(ocr_results):
    """Intelligently extract the plate, ignoring background junk."""
    raw_text = "".join(ocr_results).upper()
    clean_text = re.sub(r'[^A-Z0-9]', '', raw_text)
    clean_text = re.sub(r'^(IND|1ND|IN0|INO|JND|MD|ND|IN|1N|INDIA)', '', clean_text)
    
    valid_states = r'(AP|AR|AS|BR|CG|GA|GJ|HR|HP|JH|KA|KL|MP|MH|MN|ML|MZ|NL|OD|PB|RJ|SK|TN|TS|TR|UP|UK|WB|AN|CH|DN|DD|DL|JK|LA|LD|PY|BH)'
    
    pattern = rf'({valid_states}[0-9A-Z]{{4,8}})'
    match = re.search(pattern, clean_text)
    
    if match:
        extracted = match.group(1)
        if 6 <= len(extracted) <= 11:
            return enforce_indian_plate_format(extracted)
            
    if len(clean_text) >= 6:
        target_text = clean_text[-10:] if len(clean_text) > 10 else clean_text
        return enforce_indian_plate_format(target_text)

    return ""

def process_and_read_crop(crop_img, is_full_frame=False):
    """
    Multi-Pass Confidence Scoring OCR with Natural Unadulterated Passes.
    """
    if crop_img is None or crop_img.size == 0:
        return ""

    try:
        gray = cv2.cvtColor(crop_img, cv2.COLOR_BGR2GRAY) if len(crop_img.shape) == 3 else crop_img
        
        # Color correction
        mean_brightness = np.mean(gray)
        if mean_brightness < 80: 
            gray = cv2.convertScaleAbs(gray, alpha=1.5, beta=40)
        elif mean_brightness > 200: 
            gray = cv2.convertScaleAbs(gray, alpha=0.8, beta=-20)
            
        h, w = gray.shape
        if h < 80 and not is_full_frame:
            scale = 120.0 / max(h, 1)
            gray = cv2.resize(gray, (int(w * scale), 120), interpolation=cv2.INTER_CUBIC)

        # CRITICAL FIX: Replaced Bilateral & Sharpening with gentle Gaussian. 
        # This prevents the number 1 from turning into 4, and 5 from turning into 3.
        if not is_full_frame:
            gray = cv2.GaussianBlur(gray, (3, 3), 0)

        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        
        # Adaptive Thresholding calculates shadows locally, preserving thin gaps in 3 and 5
        binary = cv2.adaptiveThreshold(enhanced, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
        inverted = cv2.bitwise_not(enhanced)                 
            
        allowlist = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        
        # Passes: Raw natural images run first. They do not hallucinate edges.
        passes = [
            (enhanced, 1), 
            (gray, 1),     
            (binary, 1),
            (inverted, 1),
            (enhanced, 1.2)
        ]
        
        if is_full_frame:
            passes = [(enhanced, 1), (gray, 1)]
        
        best_text = ""
        highest_score = -1.0
        valid_states_regex = r'(AP|AR|AS|BR|CG|GA|GJ|HR|HP|JH|KA|KL|MP|MH|MN|ML|MZ|NL|OD|PB|RJ|SK|TN|TS|TR|UP|UK|WB|AN|CH|DN|DD|DL|JK|LA|LD|PY|BH)'
        
        for img, mag in passes:
            results = _ocr_reader.readtext(img, allowlist=allowlist, detail=1, text_threshold=0.2, mag_ratio=mag)
            
            if not results: 
                continue
                
            combined_text = "".join([res[1] for res in results])
            avg_conf = sum([res[2] for res in results]) / len(results)
            
            cleaned = clean_indian_plate([combined_text])
            if not cleaned: 
                continue
                
            # CONFIDENCE-GATED EARLY EXIT
            is_perfect_format = re.match(rf'^{valid_states_regex}[0-9]{{2}}[A-Z]{{1,3}}[0-9]{{4}}$', cleaned)
            
            if is_perfect_format and avg_conf >= 0.40:
                print(f"⚡ HIGH-CONFIDENCE MATCH: '{cleaned}' (Conf: {avg_conf:.2f})")
                return cleaned 
                
            score = avg_conf
            if is_perfect_format:
                score += 0.5 
                
            if score > highest_score:
                highest_score = score
                best_text = cleaned
                
        return best_text

    except Exception as e:
        print(f"⚠️ Error in process_and_read_crop: {e}")
        return ""

def extract_plate_from_frame(img):
    best_plate_text = ""
    results = None 
    
    if img is None or img.size == 0:
        return ""
        
    try:
        # CRITICAL FIX: Illuminate the ENTIRE frame before passing to YOLO.
        # This prevents YOLO from going blind in dark lighting or heavy glare.
        gray_frame = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        mean_brightness = np.mean(gray_frame)
        if mean_brightness < 80: 
            yolo_img = cv2.convertScaleAbs(img, alpha=1.5, beta=40)
        elif mean_brightness > 200: 
            yolo_img = cv2.convertScaleAbs(img, alpha=0.8, beta=-20)
        else:
            yolo_img = img

        results = _plate_detector.predict(yolo_img, conf=0.10, verbose=False)
        for r in results:
            boxes = sorted(r.boxes, key=lambda x: x.conf[0], reverse=True)
            
            for box in boxes[:6]:
                b = box.xyxy[0].cpu().numpy().astype(int)
                x1, y1, x2, y2 = b[0], b[1], b[2], b[3]
                
                h, w = img.shape[:2]
                pad_y, pad_x = 15, 20
                
                y1_pad = max(0, y1 - pad_y)
                y2_pad = min(h, y2 + pad_y)
                x1_pad = max(0, x1 - pad_x)
                x2_pad = min(w, x2 + pad_x)
                
                crop = img[y1_pad:y2_pad, x1_pad:x2_pad]
                
                if crop.size > 0:
                    best_plate_text = process_and_read_crop(crop, is_full_frame=False)
                
                if best_plate_text:
                    break 
            
            if best_plate_text:
                break
                
    except Exception as e:
        print(f"YOLO Processing Warning: {e}")

    # FULL-FRAME FALLBACK
    if not best_plate_text:
        print("⚠️ YOLO crop failed or yielded no text. Running fast full-frame fallback OCR...")
        h, w = img.shape[:2]
        if w > 800:
            scale = 800.0 / w
            img = cv2.resize(img, (800, int(h * scale)))
            
        best_plate_text = process_and_read_crop(img, is_full_frame=True)

    print(f"🔍 Final Extracted Plate Text: '{best_plate_text}'")
    return best_plate_text

def extract_plate_from_base64(image_b64):
    try:
        if not image_b64:
            return ""
            
        if "," in image_b64:
            image_b64 = image_b64.split(",")[1]
            
        img_bytes = base64.b64decode(image_b64)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        return extract_plate_from_frame(img)
    except Exception as e:
        print(f"OCR Base64 Decoding Error: {e}")
        return ""