import os
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv
import firebase_admin

load_dotenv()

# Lazily initialize Firestore client only when credentials are available.
# This allows tests to patch `app.firebase.db` without requiring real creds.
cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
if cred_path:
    if not firebase_admin._apps:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    db = firestore.client()
else:
    # No credentials provided; set db to None so tests can patch it.
    db = None

def initialize_firebase():
    """
    Initializes the Firebase Admin SDK using credentials
    from environment variables.
    """
    
    firebase_creds_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")

    if not firebase_creds_json:
        raise ValueError("FIREBASE_SERVICE_ACCOUNT_JSON environment variable not set.")

    cred = credentials.Certificate(firebase_creds_json)

    try:
        firebase_admin.get_app()
    except ValueError:
        firebase_admin.initialize_app(cred)

    print("Firebase Admin SDK initialized successfully.")
