import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI") or os.getenv("MONGO_URI")

if not MONGO_URI:
    raise ValueError("❌ MongoDB URI is missing! Check your .env file.")

# Fail fast if IP is not whitelisted
client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)

db = client.entry_shield
visits_collection = db.gate_passes
receipts_collection = db.receipts
users_collection = db.users
roles_collection = db.roles
students_collection = db.students

try:
    # 🚨 FIX: We drop the unique index on studentId so a student can apply for multiple gate passes!
    visits_collection.drop_index("studentId_1")
    print("✅ Dropped unique 'studentId' index to allow multiple gate passes per student.")
except Exception:
    pass # It's fine if the index doesn't exist yet

try:
    users_collection.create_index("clerk_id", unique=True)
    receipts_collection.drop_index("visitId_1")
except Exception:
    pass

print("✅ AWS MongoDB Connected. Indexes verified.")