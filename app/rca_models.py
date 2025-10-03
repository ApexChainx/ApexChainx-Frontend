from pydantic import BaseModel, Field
from typing import List
import datetime

class TimelineEvent(BaseModel):
    timestamp: datetime.datetime
    description: str

class RcaModel(BaseModel):
    ticket_id: str
    author: str
    summary: str
    timeline: List[TimelineEvent]
    root_cause: str
    resolution: str
    corrective_actions: List[str]