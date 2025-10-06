from fastapi.testclient import TestClient
from main import app, REPORTS_DB as MOCK_DB, ReportVersion  # Import the app and DB from project root
from datetime import datetime

client = TestClient(app)

# This is a sample report that will be used across tests
TICKET_ID_FOR_TESTS = "TICKET-789"

def setup_function():
    """Pytest hook to run before each test function."""
    # Ensure a clean slate for tests that modify the DB
    if TICKET_ID_FOR_TESTS in MOCK_DB:
        del MOCK_DB[TICKET_ID_FOR_TESTS]

def test_create_report():
    """Tests the successful creation of a new report."""
    response = client.post(
        "/outages",
        json={
            "ticket_id": TICKET_ID_FOR_TESTS,
            "author": "Test Author",
            "content": "This is a test report.",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["version"] == 1
    assert data["author"] == "Test Author"
    assert data["content"] == "This is a test report."
    # Verify it was added to our mock DB
    assert TICKET_ID_FOR_TESTS in MOCK_DB
    assert len(MOCK_DB[TICKET_ID_FOR_TESTS]) == 1

def test_update_report_version():
    """Tests updating a report to create a second version."""
    # First, create a report to update
    MOCK_DB[TICKET_ID_FOR_TESTS] = [ReportVersion(version=1, author="Initial", content="First version.", timestamp=datetime.utcnow())]
    
    response = client.patch(
        f"/outages/{TICKET_ID_FOR_TESTS}",
        json={"author": "Updater", "content": "This is version 2."},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["version"] == 2
    assert data["author"] == "Updater"
    # Verify the history now has two versions
    assert len(MOCK_DB[TICKET_ID_FOR_TESTS]) == 2

def test_get_report_history():
    """Tests retrieving the sorted history of a multi-version report."""
    response = client.get("/outages/TICKET-123/history")
    
    assert response.status_code == 200
    history = response.json()
    assert len(history) == 3
    # Check that it's sorted with the newest version first
    assert history[0]["version"] == 3
    assert history[1]["version"] == 2
    assert history[2]["version"] == 1

def test_get_history_for_nonexistent_ticket():
    """Tests that a 404 is returned for a ticket that doesn't exist."""
    response = client.get("/outages/TICKET-DOES-NOT-EXIST/history")
    assert response.status_code == 404
    assert response.json() == {"detail": "No history found for ticket ID: TICKET-DOES-NOT-EXIST"}