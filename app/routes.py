from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse
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
    outage_data = outage.model_dump()
    outage_data["version"] = 1
    outage_data["previous_version_id"] = None
    outage_data["created_at"] = datetime.now()
    outage_data["updated_at"] = datetime.now()
    
    doc_ref = db.collection(OUTAGE_MODEL).add(outage_data)
    return {"success": True, "document_id": doc_ref[1].id}


def get_latest_version_by_ticket_id(ticket_id: str):
    """Get the latest version of an outage report by ticket_id."""
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


@router.get("/outages/{ticket_id}/summary", response_class=PlainTextResponse)
def get_outage_summary(ticket_id: str):
    """
    Returns a pre-formatted, plain-text summary of the latest outage report
    for the given ticket_id. The summary is suitable for sharing via messaging
    apps like WhatsApp.
    """
    # Fetch latest outage version for the ticket
    latest = get_latest_version_by_ticket_id(ticket_id)
    if not latest:
        raise HTTPException(status_code=404, detail=f"No outage report found for ticket_id: {ticket_id}")

    # Helper to safely stringify datetime values
    def fmt_dt(value):
        if value is None:
            return None
        from datetime import datetime as _dt
        if isinstance(value, _dt):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        try:
            # Fallback if value is already a string
            return str(value)
        except Exception:
            return ""

    start_dt = latest.get("outage_start_time")
    end_dt = latest.get("outage_end_time")

    start_str = fmt_dt(start_dt)
    end_str = fmt_dt(end_dt) if end_dt else "Ongoing"

    # Compute duration if possible
    duration_str = "Ongoing"
    try:
        from datetime import datetime as _dt
        if isinstance(start_dt, _dt) and isinstance(end_dt, _dt):
            delta = end_dt - start_dt
            total_minutes = int(delta.total_seconds() // 60)
            hours, minutes = divmod(total_minutes, 60)
            duration_str = f"{hours}h {minutes}m"
    except Exception:
        pass

    ticket = latest.get("ticket_id", "-")
    alarm = latest.get("alarm_name", "-")
    site = latest.get("site_id", "-")
    vendor = latest.get("vendor") or "N/A"
    supervisor = latest.get("supervisor") or "N/A"
    status = latest.get("outage_status") or "N/A"
    rca = latest.get("rca") or "N/A"
    version = latest.get("version", 1)

    summary_lines = [
        f"Outage Summary (Ticket: {ticket})",
        f"Version: {version}",
        "",
        f"Alarm: {alarm}",
        f"Site: {site}",
        f"Vendor: {vendor}",
        f"Supervisor: {supervisor}",
        f"Status: {status}",
        f"Start: {start_str}",
        f"End: {end_str}",
        f"Duration: {duration_str}",
        "",
        f"RCA: {rca}",
    ]

    return "\n".join(summary_lines)