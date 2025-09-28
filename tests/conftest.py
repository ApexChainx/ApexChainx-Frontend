import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from config.wsgi import app

@pytest.fixture
def client():
    return TestClient(app)

