from fastapi import APIRouter
from app.data_models import OutageReport
from app.db_models import OUTAGE_MODEL
from app.firebase import db
router = APIRouter()

@router.get("/ping")
def health_check():
    return {"status": "ok"}

@router.post("/outage", status_code=201)
def create_outage(outage: OutageReport):
    outage_data = outage.model_dump()
    outage_data["version"] = 1
    db.collection(OUTAGE_MODEL).add(outage_data)
    return {"success": True}