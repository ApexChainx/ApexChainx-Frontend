from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Dict
from datetime import datetime
import operator

# --- Pydantic Models (Data Shape) ---

class ReportVersion(BaseModel):
    """Defines the structure of a single version of a report."""
    version: int
    author: str
    content: str
    timestamp: datetime

# --- NEW: Pydantic Models for RCA ---

class TimelineEvent(BaseModel):
    """Defines a single event in an incident timeline."""
    timestamp: datetime = Field(..., example="2025-10-26T10:00:00Z")
    description: str = Field(..., example="Initial alert received from monitoring system.")

class RcaModel(BaseModel):
    """Defines the structure for a Root Cause Analysis document."""
    ticket_id: str = Field(..., example="OUTAGE-20251026-001")
    author: str = Field(..., example="dev-team@example.com")
    summary: str = Field(..., example="A brief summary of the incident and its impact.")
    timeline: List[TimelineEvent]
    root_cause: str = Field(..., example="A misconfiguration in the load balancer led to traffic being routed incorrectly.")
    resolution: str = Field(..., example="The load balancer configuration was corrected and deployed.")
    corrective_actions: List[str] = Field(..., example=["Review all load balancer configurations.", "Add automated checks for deployment pipelines."])

# --- Mock Databases ---

# Existing DB for outage reports
REPORTS_DB: Dict[str, List[ReportVersion]] = {
    "TICKET-123": [
        ReportVersion(version=1, author="Alice", content="Initial report: network is down.", timestamp=datetime(2025, 10, 1, 10, 0, 0)),
        ReportVersion(version=2, author="Bob", content="Update: Issue isolated to router R-5.", timestamp=datetime(2025, 10, 1, 10, 30, 0)),
        ReportVersion(version=3, author="Alice", content="Update: Router rebooted, monitoring status.", timestamp=datetime(2025, 10, 1, 11, 0, 0)),
    ],
    "TICKET-456": [
        ReportVersion(version=1, author="Charlie", content="Database CPU is at 100%.", timestamp=datetime(2025, 10, 2, 14, 0, 0)),
    ],
}

# NEW: In-memory DB for RCA documents
RCA_DB: Dict[str, RcaModel] = {}

# --- Service Logic ---

def get_report_history(ticket_id: str) -> List[ReportVersion]:
    """
    Retrieves and sorts the history for a given ticket_id.
    """
    if ticket_id not in REPORTS_DB:
        raise HTTPException(status_code=404, detail=f"No history found for ticket ID: {ticket_id}")
    
    history = REPORTS_DB[ticket_id]
    history.sort(key=operator.attrgetter('version'), reverse=True)
    
    return history

# --- FastAPI Application ---

app = FastAPI(
    title="Outage Reporting & RCA API",
    description="An API for managing outage reports and their corresponding Root Cause Analyses.",
)

# --- Report Endpoints ---

@app.get(
    "/outages/{ticket_id}/history",
    response_model=List[ReportVersion],
    summary="Retrieve the full version history of a report",
    tags=["Reports"],
)
def fetch_report_history(ticket_id: str):
    """
    Retrieves all versions of a report for a specific `ticket_id`,
    sorted with the newest version first.
    """
    return get_report_history(ticket_id)

# --- NEW: RCA Management Endpoints ---

@app.post(
    "/rca/{ticket_id}",
    status_code=status.HTTP_201_CREATED,
    response_model=RcaModel,
    summary="Create a new RCA for an outage ticket",
    tags=["RCA Management"],
)
def create_rca(ticket_id: str, rca: RcaModel):
    """
    Create a new Root Cause Analysis (RCA) entry for a specific outage ticket.
    """
    if ticket_id in RCA_DB:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"RCA for ticket ID '{ticket_id}' already exists."
        )
    if ticket_id != rca.ticket_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The ticket ID in the URL must match the ticket_id in the request body."
        )
    RCA_DB[ticket_id] = rca
    return rca

@app.get(
    "/rca/{ticket_id}",
    response_model=RcaModel,
    summary="Retrieve an existing RCA",
    tags=["RCA Management"],
)
def get_rca(ticket_id: str):
    """
    Retrieve an existing RCA by its outage ticket ID.
    """
    if ticket_id not in RCA_DB:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"RCA for ticket ID '{ticket_id}' not found."
        )
    return RCA_DB[ticket_id]

@app.put(
    "/rca/{ticket_id}",
    response_model=RcaModel,
    summary="Update an existing RCA",
    tags=["RCA Management"],
)
def update_rca(ticket_id: str, rca: RcaModel):
    """
    Update an existing RCA. The entire RCA object must be provided.
    """
    if ticket_id not in RCA_DB:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"RCA for ticket ID '{ticket_id}' not found."
        )
    if ticket_id != rca.ticket_id:
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The ticket ID in the URL must match the ticket_id in the request body."
        )
    RCA_DB[ticket_id] = rca
    return rca