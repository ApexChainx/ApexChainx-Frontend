import os
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv()

cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

# Only initialize Firebase if credentials are available
db = None
if cred_path and not firebase_admin._apps:
    try:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
    except Exception as e:
        print(f"Warning: Firebase initialization failed: {e}")
        print("Running in test mode without Firebase connection")
        db = None
elif firebase_admin._apps:
    db = firestore.client()
else:
    print("Warning: No Firebase credentials found - running in test mode")
    db = None