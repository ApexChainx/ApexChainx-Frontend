from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock


def test_outage_report_post(client: TestClient):
    mock_db = MagicMock()
    with patch('app.firebase.db', mock_db):
        response = client.post("/outage", json={
            "ticket_id": "123",
            "alarm_name": "test",
            "site_id": "123",
            "outage_start_time": "2021-01-01T00:00:00Z",
            "outage_end_time": "2021-01-01T00:00:00Z",
            "outage_status": "unresolved",
        })
        
        assert response.status_code == 201
        assert response.json() == {"success": True}
        