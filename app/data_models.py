from pydantic import BaseModel, field_validator, Field
from datetime import datetime
from typing import Optional, Literal
from fastapi import HTTPException

OUTAGE_STATUS_RESOLVED = Literal["resolved", "unresolved"]

class OutageReport(BaseModel):
    """
    Data model for an outage report.
    Fields:
    - ticket_id: str - The ID of the ticket in the ticketing system
    - alarm_name: str - The name of the alarm that triggered the outage
    - site_id: str - The ID of the site in the site system
    - outage_start_time: datetime - The start time of the outage
    - outage_end_time: Optional[datetime] = None - The end time of the outage
    - vendor: Optional[str] = None - The vendor of the equipment that triggered the outage
    - supervisor: Optional[str] = None - The supervisor of the site that triggered the outage
    - rca: Optional[str] = None - The RCA of the outage
    - outage_status: OUTAGE_STATUS_RESOLVED - The status of the outage
    
    Raises:
    - ValueError: If outage start time is in the future
    - ValueError: If outage end time is before start time
    """
    ticket_id: str
    alarm_name: str
    site_id: str
    outage_start_time: datetime
    outage_end_time: Optional[datetime] = None
    vendor: Optional[str] = None
    supervisor: Optional[str] = None
    rca: Optional[str] = None
    outage_status: OUTAGE_STATUS_RESOLVED
    
    @field_validator("outage_start_time", mode="after")
    @classmethod
    def validate_outage_start_time(cls, v):
        """
        Validate the outage start time.
        """
        if v > datetime.now():
            raise HTTPException(status_code=400, detail="Outage start time cannot be in the future")
        return v
    
    @field_validator("outage_end_time", mode="after")
    @classmethod
    def validate_outage_end_time(cls, v):
        """
        Validate the outage end time.
        """
        if v and v < cls.outage_start_time:
            raise HTTPException(status_code=400, detail="Outage end time cannot be before start time")
        return v


class OutageReportVersioned(BaseModel):
    """
    Versioned data model for an outage report with version tracking.
    Used internally for database operations and responses.
    """
    ticket_id: str
    alarm_name: str
    site_id: str
    outage_start_time: datetime
    outage_end_time: Optional[datetime] = None
    vendor: Optional[str] = None
    supervisor: Optional[str] = None
    rca: Optional[str] = None
    outage_status: OUTAGE_STATUS_RESOLVED
    version: int
    previous_version_id: Optional[str] = None
    document_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class OutageReportUpdate(BaseModel):
    """
    Data model for updating an outage report. All fields are optional
    to allow partial updates.
    """
    alarm_name: Optional[str] = None
    site_id: Optional[str] = None
    outage_start_time: Optional[datetime] = None
    outage_end_time: Optional[datetime] = None
    vendor: Optional[str] = None
    supervisor: Optional[str] = None
    rca: Optional[str] = None
    outage_status: Optional[OUTAGE_STATUS_RESOLVED] = None