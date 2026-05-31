"""
Tests for the health endpoint and basic app configuration.
"""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.anyio
async def test_health_endpoint(client):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "buckflow-ai"


@pytest.mark.anyio
async def test_docs_endpoint(client):
    response = await client.get("/docs")
    assert response.status_code == 200


@pytest.mark.anyio
async def test_openapi_schema(client):
    response = await client.get("/openapi.json")
    assert response.status_code == 200
    data = response.json()
    assert data["info"]["title"] == "BuckFlow AI"
    assert data["info"]["version"] == "0.1.0"


@pytest.mark.anyio
async def test_cors_headers(client):
    response = await client.options(
        "/health",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )
    # In development mode, CORS allows all origins
    assert response.status_code in (200, 204)


@pytest.mark.anyio
async def test_404_for_unknown_route(client):
    response = await client.get("/api/v1/nonexistent")
    assert response.status_code in (404, 405)
