from fastapi import APIRouter, HTTPException, status
from typing import Dict
from .rca_models import RcaModel 

from .auth import get_current_user

router = APIRouter(
    prefix="/rca",
    tags=["RCA Management"]
)


db: Dict[str, RcaModel] = {}

@router.post("/{ticket_id}", status_code=status.HTTP_201_CREATED, response_model=RcaModel)
def create_rca(ticket_id: str, rca: RcaModel):
    if ticket_id in db:
        raise HTTPException(status_code=409, detail="RCA already exists.")
    db[ticket_id] = rca
    return rca

@router.get("/{ticket_id}", response_model=RcaModel)
def get_rca(ticket_id: str):
    if ticket_id not in db:
        raise HTTPException(status_code=404, detail="RCA not found.")
    return db[ticket_id]

@router.put("/{ticket_id}", response_model=RcaModel)
def update_rca(ticket_id: str, rca: RcaModel):
    if ticket_id not in db:
        raise HTTPException(status_code=404, detail="RCA not found.")
    db[ticket_id] = rca
    return rca

@router.post("/")
async def create_rca_entry(
    rca_data: dict, # Replace with your Pydantic model
    current_user: Dict = Depends(get_current_user)
):
    """
    Create a new Root Cause Analysis entry.
    This is a protected route.
    """
    user_uid = current_user.get("uid")
    print(f"Authenticated user UID: {user_uid}")
    
    
    return {"message": "RCA entry created successfully", "user_uid": user_uid, "data": rca_data}

@router.get("/me")
async def read_user_me(current_user: Dict = Depends(get_current_user)):
    """
    An example endpoint to get the current authenticated user's info.
    """
    return {"user_info": current_user}