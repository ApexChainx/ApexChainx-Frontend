from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
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

# --- Mock Database ---
# In a real application, this data would come from a database like PostgreSQL or MongoDB.
# The key is the ticket_id. The value is a list of report versions.
MOCK_DB: Dict[str, List[ReportVersion]] = {
    "TICKET-123": [
        ReportVersion(version=1, author="Alice", content="Initial report: network is down.", timestamp=datetime(2025, 10, 1, 10, 0, 0)),
        ReportVersion(version=2, author="Bob", content="Update: Issue isolated to router R-5.", timestamp=datetime(2025, 10, 1, 10, 30, 0)),
        ReportVersion(version=3, author="Alice", content="Update: Router rebooted, monitoring status.", timestamp=datetime(2025, 10, 1, 11, 0, 0)),
    ],
    "TICKET-456": [
        ReportVersion(version=1, author="Charlie", content="Database CPU is at 100%.", timestamp=datetime(2025, 10, 2, 14, 0, 0)),
    ],
}

# --- Service Logic ---

def get_report_history(ticket_id: str) -> List[ReportVersion]:
    """
    Retrieves and sorts the history for a given ticket_id.
    """
    if ticket_id not in MOCK_DB:
        raise HTTPException(status_code=404, detail=f"No history found for ticket ID: {ticket_id}")
    
    # Retrieve the history and sort it by version number in descending order
    history = MOCK_DB[ticket_id]
    history.sort(key=operator.attrgetter('version'), reverse=True)
    
    return history

# --- FastAPI Application ---

app = FastAPI(
    title="Outage Reporting API",
    description="An API for managing and viewing outage reports.",
)

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