from fastapi import APIRouter, HTTPException, status
from app.models.ticket import Ticket
from app.services.firestore_service import FirestoreService

router = APIRouter()
firestore_service = FirestoreService()

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_ticket(ticket: Ticket):
    try:
        ticket_id = firestore_service.create_ticket(ticket.dict())
        return {"id": ticket_id, "message": "Ticket created successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating ticket: {str(e)}"
        )

@router.get("/{ticket_id}")
async def get_ticket(ticket_id: str):
    try:
        ticket = firestore_service.get_ticket(ticket_id)
        if not ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Ticket with id {ticket_id} not found"
            )
        return {"id": ticket_id, **ticket}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching ticket: {str(e)}"
        )

@router.put("/{ticket_id}")
async def update_ticket(ticket_id: str, ticket: Ticket):
    try:
        updated = firestore_service.update_ticket(ticket_id, ticket.dict())
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Ticket with id {ticket_id} not found"
            )
        return {"id": ticket_id, "message": "Ticket updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating ticket: {str(e)}"
        )

@router.delete("/{ticket_id}")
async def delete_ticket(ticket_id: str):
    try:
        deleted = firestore_service.delete_ticket(ticket_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Ticket with id {ticket_id} not found"
            )
        return {"id": ticket_id, "message": "Ticket deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting ticket: {str(e)}"
        )
