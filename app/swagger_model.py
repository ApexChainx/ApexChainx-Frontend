class Report(BaseModel):
    id: int
    title: str
    content: str

    class Config:
        schema_extra = {
            "example": {
                "id": 1,
                "title": "Weekly Sales Report",
                "content": "Sales increased by 12% compared to last week."
            }
        }


class HistoryRecord(BaseModel):
    id: int
    action: str
    timestamp: str

    class Config:
        schema_extra = {
            "example": {
                "id": 101,
                "action": "User logged in",
                "timestamp": "2025-10-01T10:45:00Z"
            }
        }