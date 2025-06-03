from fastapi import APIRouter

router = APIRouter()

@router.get("/ping")
def health_check():
    return {"status": "ok"}
