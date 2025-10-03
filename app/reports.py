@app.get(
    "/reports",
    response_model=List[Report],
    summary="Get all reports",
    description="Fetches a list of all available reports.",
    tags=["Reports"]
)
async def get_reports():
    return [
        {"id": 1, "title": "Weekly Sales Report", "content": "Sales increased by 12% compared to last week."},
        {"id": 2, "title": "Monthly Sales Report", "content": "Monthly performance overview."}
    ]


@app.get(
    "/reports/{report_id}",
    response_model=Report,
    summary="Get report by ID",
    description="Fetches a single report using its unique ID.",
    tags=["Reports"]
)
async def get_report(report_id: int):
    return {"id": report_id, "title": "Custom Report", "content": "Detailed insights about your query."}


# =========================
# ENDPOINTS (History)
# =========================
@app.get(
    "/history",
    response_model=List[HistoryRecord],
    summary="Get all history records",
    description="Fetches a list of all historical user actions.",
    tags=["History"]
)
async def get_history():
    return [
        {"id": 101, "action": "User logged in", "timestamp": "2025-10-01T10:45:00Z"},
        {"id": 102, "action": "Report generated", "timestamp": "2025-10-02T14:12:00Z"}
    ]


@app.get(
    "/history/{record_id}",
    response_model=HistoryRecord,
    summary="Get history record by ID",
    description="Fetches a single historical record by its unique ID.",
    tags=["History"]
)
async def get_history_record(record_id: int):
    return {"id": record_id, "action": "User logged out", "timestamp": "2025-10-03T09:30:00Z"}
