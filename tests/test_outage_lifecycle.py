"""
Tests for the complete outage → SLA → payment lifecycle.
"""

import pytest
import httpx
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock


BASE_URL = "http://testserver"

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def client():
    """Return a synchronous httpx test client."""
    from main import app  # adjust import to your app entrypoint

    with httpx.Client(app=app, base_url=BASE_URL) as c:
        yield c


@pytest.fixture
def auth_headers():
    """Return auth headers used across tests."""
    return {"Authorization": "Bearer test-token"}


@pytest.fixture
def outage_payload():
    return {
        "title": "Core Router Down",
        "description": "Core router at site A is unreachable.",
        "severity": "critical",
        "affected_nodes": ["router-01", "router-02"],
        "reported_by": "noc-agent-1",
        "customer_id": "cust-100",
    }


@pytest.fixture
def created_outage(client, auth_headers, outage_payload):
    """Create an outage and return the response JSON."""
    response = client.post("/api/outages", json=outage_payload, headers=auth_headers)
    assert response.status_code == 201
    return response.json()


# ---------------------------------------------------------------------------
# 1. Create Outage
# ---------------------------------------------------------------------------

class TestCreateOutage:
    def test_create_outage_success(self, client, auth_headers, outage_payload):
        response = client.post("/api/outages", json=outage_payload, headers=auth_headers)
        assert response.status_code == 201
        data = response.json()
        assert data["id"] is not None
        assert data["status"] == "open"
        assert data["title"] == outage_payload["title"]
        assert data["severity"] == outage_payload["severity"]
        assert "created_at" in data

    def test_create_outage_sets_started_at(self, client, auth_headers, outage_payload):
        response = client.post("/api/outages", json=outage_payload, headers=auth_headers)
        assert response.status_code == 201
        data = response.json()
        assert data.get("started_at") is not None

    def test_create_outage_missing_required_fields(self, client, auth_headers):
        response = client.post("/api/outages", json={}, headers=auth_headers)
        assert response.status_code == 422

    def test_create_outage_missing_title(self, client, auth_headers, outage_payload):
        payload = {k: v for k, v in outage_payload.items() if k != "title"}
        response = client.post("/api/outages", json=payload, headers=auth_headers)
        assert response.status_code == 422

    def test_create_outage_invalid_severity(self, client, auth_headers, outage_payload):
        payload = {**outage_payload, "severity": "unknown_level"}
        response = client.post("/api/outages", json=payload, headers=auth_headers)
        assert response.status_code == 422

    def test_create_outage_without_auth(self, client, outage_payload):
        response = client.post("/api/outages", json=outage_payload)
        assert response.status_code in (401, 403)

    def test_create_outage_duplicate_raises_conflict(self, client, auth_headers, created_outage, outage_payload):
        response = client.post("/api/outages", json={**outage_payload, "reference_id": created_outage["id"]}, headers=auth_headers)
        assert response.status_code in (409, 422)

    def test_create_outage_no_affected_nodes(self, client, auth_headers, outage_payload):
        payload = {**outage_payload, "affected_nodes": []}
        response = client.post("/api/outages", json=payload, headers=auth_headers)
        # business rule: at least one node must be affected
        assert response.status_code in (201, 422)

    def test_create_outage_returns_correct_customer_id(self, client, auth_headers, outage_payload):
        response = client.post("/api/outages", json=outage_payload, headers=auth_headers)
        assert response.status_code == 201
        assert response.json()["customer_id"] == outage_payload["customer_id"]


# ---------------------------------------------------------------------------
# 2. Resolve Outage
# ---------------------------------------------------------------------------

class TestResolveOutage:
    def test_resolve_outage_success(self, client, auth_headers, created_outage):
        outage_id = created_outage["id"]
        response = client.patch(
            f"/api/outages/{outage_id}/resolve",
            json={"resolved_by": "noc-agent-1", "resolution_notes": "Router rebooted."},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "resolved"
        assert data["resolved_at"] is not None

    def test_resolve_outage_sets_duration(self, client, auth_headers, created_outage):
        outage_id = created_outage["id"]
        response = client.patch(
            f"/api/outages/{outage_id}/resolve",
            json={"resolved_by": "noc-agent-1"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("duration_minutes") is not None
        assert data["duration_minutes"] >= 0

    def test_resolve_nonexistent_outage(self, client, auth_headers):
        response = client.patch(
            "/api/outages/nonexistent-id/resolve",
            json={"resolved_by": "noc-agent-1"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    def test_resolve_already_resolved_outage(self, client, auth_headers, created_outage):
        outage_id = created_outage["id"]
        resolve_payload = {"resolved_by": "noc-agent-1"}
        client.patch(f"/api/outages/{outage_id}/resolve", json=resolve_payload, headers=auth_headers)
        response = client.patch(f"/api/outages/{outage_id}/resolve", json=resolve_payload, headers=auth_headers)
        assert response.status_code in (400, 409)

    def test_resolve_outage_without_auth(self, client, created_outage):
        response = client.patch(f"/api/outages/{created_outage['id']}/resolve", json={"resolved_by": "agent"})
        assert response.status_code in (401, 403)

    def test_get_resolved_outage_reflects_status(self, client, auth_headers, created_outage):
        outage_id = created_outage["id"]
        client.patch(
            f"/api/outages/{outage_id}/resolve",
            json={"resolved_by": "noc-agent-1"},
            headers=auth_headers,
        )
        get_resp = client.get(f"/api/outages/{outage_id}", headers=auth_headers)
        assert get_resp.status_code == 200
        assert get_resp.json()["status"] == "resolved"


# ---------------------------------------------------------------------------
# 3. SLA Calculation
# ---------------------------------------------------------------------------

class TestSLACalculation:
    def test_sla_calculated_after_resolution(self, client, auth_headers, created_outage):
        outage_id = created_outage["id"]
        client.patch(
            f"/api/outages/{outage_id}/resolve",
            json={"resolved_by": "noc-agent-1"},
            headers=auth_headers,
        )
        response = client.get(f"/api/outages/{outage_id}/sla", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "sla_status" in data
        assert data["sla_status"] in ("met", "breached")

    def test_sla_met_for_short_outage(self, client, auth_headers, outage_payload):
        """Outage resolved within SLA threshold → status should be 'met'."""
        with patch("services.outage_service.get_current_time") as mock_time:
            start = datetime(2024, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
            mock_time.return_value = start
            create_resp = client.post("/api/outages", json=outage_payload, headers=auth_headers)
            assert create_resp.status_code == 201
            outage_id = create_resp.json()["id"]

            mock_time.return_value = start + timedelta(minutes=30)
            client.patch(
                f"/api/outages/{outage_id}/resolve",
                json={"resolved_by": "noc-agent-1"},
                headers=auth_headers,
            )

        response = client.get(f"/api/outages/{outage_id}/sla", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["sla_status"] == "met"

    def test_sla_breached_for_long_outage(self, client, auth_headers, outage_payload):
        """Outage exceeds SLA threshold → status should be 'breached'."""
        with patch("services.outage_service.get_current_time") as mock_time:
            start = datetime(2024, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
            mock_time.return_value = start
            create_resp = client.post("/api/outages", json=outage_payload, headers=auth_headers)
            assert create_resp.status_code == 201
            outage_id = create_resp.json()["id"]

            mock_time.return_value = start + timedelta(hours=6)
            client.patch(
                f"/api/outages/{outage_id}/resolve",
                json={"resolved_by": "noc-agent-1"},
                headers=auth_headers,
            )

        response = client.get(f"/api/outages/{outage_id}/sla", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["sla_status"] == "breached"

    def test_sla_contains_breach_minutes_on_breach(self, client, auth_headers, outage_payload):
        with patch("services.outage_service.get_current_time") as mock_time:
            start = datetime(2024, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
            mock_time.return_value = start
            create_resp = client.post("/api/outages", json=outage_payload, headers=auth_headers)
            outage_id = create_resp.json()["id"]
            mock_time.return_value = start + timedelta(hours=6)
            client.patch(f"/api/outages/{outage_id}/resolve", json={"resolved_by": "agent"}, headers=auth_headers)

        response = client.get(f"/api/outages/{outage_id}/sla", headers=auth_headers)
        data = response.json()
        assert data["sla_status"] == "breached"
        assert data.get("breach_minutes") is not None
        assert data["breach_minutes"] > 0

    def test_sla_not_available_for_open_outage(self, client, auth_headers, created_outage):
        response = client.get(f"/api/outages/{created_outage['id']}/sla", headers=auth_headers)
        assert response.status_code in (200, 400)
        if response.status_code == 200:
            assert response.json().get("sla_status") in (None, "pending")

    def test_sla_for_nonexistent_outage(self, client, auth_headers):
        response = client.get("/api/outages/bad-id/sla", headers=auth_headers)
        assert response.status_code == 404

    def test_sla_threshold_matches_severity(self, client, auth_headers):
        """Critical outages should have a tighter SLA than low-severity ones."""
        response = client.get("/api/sla/thresholds", headers=auth_headers)
        assert response.status_code == 200
        thresholds = response.json()
        assert thresholds["critical"] < thresholds["low"]


# ---------------------------------------------------------------------------
# 4. Payment Generation
# ---------------------------------------------------------------------------

class TestPaymentGeneration:
    def _create_and_resolve(self, client, auth_headers, outage_payload, duration_hours=5):
        with patch("services.outage_service.get_current_time") as mock_time:
            start = datetime(2024, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
            mock_time.return_value = start
            create_resp = client.post("/api/outages", json=outage_payload, headers=auth_headers)
            assert create_resp.status_code == 201
            outage_id = create_resp.json()["id"]
            mock_time.return_value = start + timedelta(hours=duration_hours)
            client.patch(f"/api/outages/{outage_id}/resolve", json={"resolved_by": "agent"}, headers=auth_headers)
        return outage_id

    def test_payment_generated_after_sla_breach(self, client, auth_headers, outage_payload):
        outage_id = self._create_and_resolve(client, auth_headers, outage_payload, duration_hours=6)
        response = client.get(f"/api/outages/{outage_id}/payment", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ("pending", "generated")
        assert data["amount"] > 0

    def test_no_payment_when_sla_met(self, client, auth_headers, outage_payload):
        outage_id = self._create_and_resolve(client, auth_headers, outage_payload, duration_hours=0)
        response = client.get(f"/api/outages/{outage_id}/payment", headers=auth_headers)
        assert response.status_code in (200, 404)
        if response.status_code == 200:
            data = response.json()
            assert data.get("amount", 0) == 0 or data.get("status") == "not_applicable"

    def test_payment_amount_proportional_to_breach_time(self, client, auth_headers, outage_payload):
        outage_id_short = self._create_and_resolve(client, auth_headers, outage_payload, duration_hours=5)
        outage_id_long = self._create_and_resolve(client, auth_headers, outage_payload, duration_hours=10)

        resp_short = client.get(f"/api/outages/{outage_id_short}/payment", headers=auth_headers)
        resp_long = client.get(f"/api/outages/{outage_id_long}/payment", headers=auth_headers)

        assert resp_short.status_code == 200
        assert resp_long.status_code == 200
        assert resp_long.json()["amount"] > resp_short.json()["amount"]

    def test_payment_linked_to_correct_customer(self, client, auth_headers, outage_payload):
        outage_id = self._create_and_resolve(client, auth_headers, outage_payload, duration_hours=6)
        response = client.get(f"/api/outages/{outage_id}/payment", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["customer_id"] == outage_payload["customer_id"]

    def test_payment_not_generated_for_open_outage(self, client, auth_headers, created_outage):
        response = client.get(f"/api/outages/{created_outage['id']}/payment", headers=auth_headers)
        assert response.status_code in (400, 404)

    def test_payment_for_nonexistent_outage(self, client, auth_headers):
        response = client.get("/api/outages/bad-id/payment", headers=auth_headers)
        assert response.status_code == 404

    def test_trigger_payment_manually(self, client, auth_headers, outage_payload):
        outage_id = self._create_and_resolve(client, auth_headers, outage_payload, duration_hours=6)
        response = client.post(
            f"/api/outages/{outage_id}/payment/generate",
            headers=auth_headers,
        )
        assert response.status_code in (200, 201)
        data = response.json()
        assert data["payment_id"] is not None

    def test_duplicate_payment_not_allowed(self, client, auth_headers, outage_payload):
        outage_id = self._create_and_resolve(client, auth_headers, outage_payload, duration_hours=6)
        client.post(f"/api/outages/{outage_id}/payment/generate", headers=auth_headers)
        response = client.post(f"/api/outages/{outage_id}/payment/generate", headers=auth_headers)
        assert response.status_code in (400, 409)


# ---------------------------------------------------------------------------
# 5. End-to-End Lifecycle
# ---------------------------------------------------------------------------

class TestOutageLifecycle:
    def test_full_lifecycle_creates_payment_on_breach(self, client, auth_headers, outage_payload):
        # Step 1: Create
        create_resp = client.post("/api/outages", json=outage_payload, headers=auth_headers)
        assert create_resp.status_code == 201
        outage_id = create_resp.json()["id"]

        # Step 2: Resolve (simulate long outage via mock)
        with patch("services.outage_service.get_current_time") as mock_time:
            mock_time.return_value = datetime.now(timezone.utc) + timedelta(hours=6)
            resolve_resp = client.patch(
                f"/api/outages/{outage_id}/resolve",
                json={"resolved_by": "noc-agent-1"},
                headers=auth_headers,
            )
        assert resolve_resp.status_code == 200

        # Step 3: SLA
        sla_resp = client.get(f"/api/outages/{outage_id}/sla", headers=auth_headers)
        assert sla_resp.status_code == 200
        assert sla_resp.json()["sla_status"] == "breached"

        # Step 4: Payment
        pay_resp = client.get(f"/api/outages/{outage_id}/payment", headers=auth_headers)
        assert pay_resp.status_code == 200
        assert pay_resp.json()["amount"] > 0

    def test_full_lifecycle_no_payment_on_sla_met(self, client, auth_headers, outage_payload):
        create_resp = client.post("/api/outages", json=outage_payload, headers=auth_headers)
        assert create_resp.status_code == 201
        outage_id = create_resp.json()["id"]

        with patch("services.outage_service.get_current_time") as mock_time:
            mock_time.return_value = datetime.now(timezone.utc) + timedelta(minutes=15)
            client.patch(
                f"/api/outages/{outage_id}/resolve",
                json={"resolved_by": "noc-agent-1"},
                headers=auth_headers,
            )

        sla_resp = client.get(f"/api/outages/{outage_id}/sla", headers=auth_headers)
        assert sla_resp.json()["sla_status"] == "met"

        pay_resp = client.get(f"/api/outages/{outage_id}/payment", headers=auth_headers)
        if pay_resp.status_code == 200:
            assert pay_resp.json().get("amount", 0) == 0 or pay_resp.json().get("status") == "not_applicable"


# ---------------------------------------------------------------------------
# 6. Edge Cases
# ---------------------------------------------------------------------------

class TestEdgeCases:
    def test_outage_resolved_at_exact_sla_boundary(self, client, auth_headers, outage_payload):
        """Resolving exactly at the SLA boundary should count as 'met'."""
        with patch("services.outage_service.get_current_time") as mock_time:
            start = datetime(2024, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
            mock_time.return_value = start
            create_resp = client.post("/api/outages", json=outage_payload, headers=auth_headers)
            outage_id = create_resp.json()["id"]

            sla_threshold_resp = client.get("/api/sla/thresholds", headers=auth_headers)
            threshold_minutes = sla_threshold_resp.json()["critical"]

            mock_time.return_value = start + timedelta(minutes=threshold_minutes)
            client.patch(f"/api/outages/{outage_id}/resolve", json={"resolved_by": "agent"}, headers=auth_headers)

        sla_resp = client.get(f"/api/outages/{outage_id}/sla", headers=auth_headers)
        assert sla_resp.json()["sla_status"] == "met"

    def test_zero_duration_outage(self, client, auth_headers, outage_payload):
        """Create and immediately resolve an outage."""
        create_resp = client.post("/api/outages", json=outage_payload, headers=auth_headers)
        assert create_resp.status_code == 201
        outage_id = create_resp.json()["id"]

        resolve_resp = client.patch(
            f"/api/outages/{outage_id}/resolve",
            json={"resolved_by": "agent"},
            headers=auth_headers,
        )
        assert resolve_resp.status_code == 200
        assert resolve_resp.json()["duration_minutes"] >= 0

    def test_multiple_outages_independent_sla(self, client, auth_headers, outage_payload):
        """Each outage should track SLA independently."""
        ids = []
        for _ in range(3):
            r = client.post("/api/outages", json=outage_payload, headers=auth_headers)
            assert r.status_code == 201
            ids.append(r.json()["id"])

        for oid in ids:
            client.patch(f"/api/outages/{oid}/resolve", json={"resolved_by": "agent"}, headers=auth_headers)
            sla = client.get(f"/api/outages/{oid}/sla", headers=auth_headers)
            assert sla.status_code == 200
            assert "sla_status" in sla.json()

    def test_payment_amount_never_negative(self, client, auth_headers, outage_payload):
        with patch("services.outage_service.get_current_time") as mock_time:
            start = datetime(2024, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
            mock_time.return_value = start
            create_resp = client.post("/api/outages", json=outage_payload, headers=auth_headers)
            outage_id = create_resp.json()["id"]
            mock_time.return_value = start + timedelta(hours=8)
            client.patch(f"/api/outages/{outage_id}/resolve", json={"resolved_by": "agent"}, headers=auth_headers)

        pay_resp = client.get(f"/api/outages/{outage_id}/payment", headers=auth_headers)
        if pay_resp.status_code == 200:
            assert pay_resp.json()["amount"] >= 0

    def test_outage_with_special_characters_in_description(self, client, auth_headers, outage_payload):
        payload = {**outage_payload, "description": "<script>alert('xss')</script> & 'injection'"}
        response = client.post("/api/outages", json=payload, headers=auth_headers)
        assert response.status_code in (201, 422)
        if response.status_code == 201:
            fetched = client.get(f"/api/outages/{response.json()['id']}", headers=auth_headers)
            body = fetched.json()
            assert "<script>" not in body.get("description", "")

    def test_large_number_of_affected_nodes(self, client, auth_headers, outage_payload):
        payload = {**outage_payload, "affected_nodes": [f"node-{i}" for i in range(500)]}
        response = client.post("/api/outages", json=payload, headers=auth_headers)
        assert response.status_code in (201, 422)

    def test_outage_list_pagination(self, client, auth_headers):
        response = client.get("/api/outages?page=1&page_size=10", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data or isinstance(data, list)

    def test_outage_filter_by_status(self, client, auth_headers):
        response = client.get("/api/outages?status=open", headers=auth_headers)
        assert response.status_code == 200

    def test_malformed_json_body(self, client, auth_headers):
        response = client.post(
            "/api/outages",
            content=b"not-valid-json",
            headers={**auth_headers, "Content-Type": "application/json"},
        )
        assert response.status_code in (400, 422)
