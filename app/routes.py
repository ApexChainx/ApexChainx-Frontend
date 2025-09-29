from fastapi import APIRouter, HTTPException
from app.data_models import OutageReport, OutageReportVersioned, OutageReportUpdate
from app.db_models import OUTAGE_MODEL
from app.firebase import db
from datetime import datetime
from google.cloud.firestore_v1 import FieldFilter
router = APIRouter()

@router.get("/ping")
def health_check():
    return {"status": "ok"}

@router.post("/outage", status_code=201)
def create_outage(outage: OutageReport):
    """Create a new outage report with version 1."""
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")
        
    outage_data = outage.model_dump()
    outage_data["version"] = 1
    outage_data["previous_version_id"] = None
    outage_data["created_at"] = datetime.now()
    outage_data["updated_at"] = datetime.now()
    
    doc_ref = db.collection(OUTAGE_MODEL).add(outage_data)
    return {"success": True, "document_id": doc_ref[1].id}


def get_latest_version_by_ticket_id(ticket_id: str):
    """Get the latest version of an outage report by ticket_id."""
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")
        
    query = (
        db.collection(OUTAGE_MODEL)
        .where(filter=FieldFilter("ticket_id", "==", ticket_id))
        .order_by("version", direction="DESCENDING")
        .limit(1)
    )
    
    docs = query.get()
    if not docs:
        return None
    
    doc = docs[0]
    doc_data = doc.to_dict()
    doc_data["document_id"] = doc.id
    return doc_data


@router.put("/outages/{ticket_id}")
def update_outage(ticket_id: str, update_data: OutageReportUpdate):
    """
    Update an outage report by creating a new version.
    
    Args:
        ticket_id: The ticket ID to update
        update_data: The fields to update
        
    Returns:
        The new version document
        
    Raises:
        HTTPException: If ticket not found or update fails
    """
    # Get the latest version for this ticket_id
    latest_version = get_latest_version_by_ticket_id(ticket_id)
    
    if not latest_version:
        raise HTTPException(
            status_code=404, 
            detail=f"No outage report found for ticket_id: {ticket_id}"
        )
    
    # Create updated document data
    new_version_data = latest_version.copy()
    
    # Remove document-specific fields that shouldn't be copied
    new_version_data.pop("document_id", None)
    
    # Apply updates (only non-None values)
    update_dict = update_data.model_dump(exclude_none=True)
    new_version_data.update(update_dict)
    
    # Increment version and set versioning fields
    new_version_data["version"] = latest_version["version"] + 1
    new_version_data["previous_version_id"] = latest_version["document_id"]
    new_version_data["updated_at"] = datetime.now()
    
    # Add the new version to Firestore
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")
        
    doc_ref = db.collection(OUTAGE_MODEL).add(new_version_data)
    new_doc_id = doc_ref[1].id
    
    # Prepare response
    response_data = new_version_data.copy()
    response_data["document_id"] = new_doc_id
    
    # Convert datetime objects to ISO strings for JSON response
    response_data["created_at"] = response_data["created_at"].isoformat()
    response_data["updated_at"] = response_data["updated_at"].isoformat()
    response_data["outage_start_time"] = response_data["outage_start_time"].isoformat()
    if response_data.get("outage_end_time"):
        response_data["outage_end_time"] = response_data["outage_end_time"].isoformat()
    
    return response_data


@router.get("/outages/{ticket_id}")
def get_outage_by_ticket_id(ticket_id: str, version: int = None):
    """
    Get outage report(s) by ticket_id.
    
    Args:
        ticket_id: The ticket ID to retrieve
        version: Optional specific version to retrieve (default: latest)
        
    Returns:
        The requested outage report or latest version if version not specified
    """
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")
        
    if version:
        # Get specific version
        query = (
            db.collection(OUTAGE_MODEL)
            .where(filter=FieldFilter("ticket_id", "==", ticket_id))
            .where(filter=FieldFilter("version", "==", version))
            .limit(1)
        )
        docs = query.get()
        if not docs:
            raise HTTPException(
                status_code=404, 
                detail=f"No outage report found for ticket_id: {ticket_id}, version: {version}"
            )
        doc = docs[0]
    else:
        # Get latest version
        latest_version = get_latest_version_by_ticket_id(ticket_id)
        if not latest_version:
            raise HTTPException(
                status_code=404, 
                detail=f"No outage report found for ticket_id: {ticket_id}"
            )
        # Convert to format similar to Firestore doc
        class MockDoc:
            def __init__(self, data, doc_id):
                self.data = data
                self.doc_id = doc_id
            def to_dict(self):
                return self.data
            @property
            def id(self):
                return self.doc_id
        
        doc = MockDoc(latest_version, latest_version["document_id"])
    
    doc_data = doc.to_dict()
    doc_data["document_id"] = doc.id
    
    # Convert datetime objects to ISO strings for JSON response
    if isinstance(doc_data.get("created_at"), datetime):
        doc_data["created_at"] = doc_data["created_at"].isoformat()
    if isinstance(doc_data.get("updated_at"), datetime):
        doc_data["updated_at"] = doc_data["updated_at"].isoformat()
    if isinstance(doc_data.get("outage_start_time"), datetime):
        doc_data["outage_start_time"] = doc_data["outage_start_time"].isoformat()
    if doc_data.get("outage_end_time") and isinstance(doc_data["outage_end_time"], datetime):
        doc_data["outage_end_time"] = doc_data["outage_end_time"].isoformat()
    
    return doc_data