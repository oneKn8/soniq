"""Unit tests for tenant_config.get_tenant_by_phone.

The httpx client is mocked; no real network. Verifies the happy path parses
the JSON body and hits the right URL, and that every failure mode (404, HTTP
status error, arbitrary transport error) resolves to None rather than raising.
"""

from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

import tenant_config
from conftest import FakeResponse


def _mock_client(get_response=None, get_side_effect=None):
    client = MagicMock()
    if get_side_effect is not None:
        client.get = AsyncMock(side_effect=get_side_effect)
    else:
        client.get = AsyncMock(return_value=get_response)
    return client


async def test_returns_parsed_config_on_success(monkeypatch):
    config = {
        "id": "tenant-7",
        "business_name": "Bright Smiles Dental",
        "system_prompt": "You are the receptionist.",
        "voice_config": {"voice_id": "abc123"},
    }
    resp = FakeResponse(json_data=config, status_code=200)
    client = _mock_client(get_response=resp)
    monkeypatch.setattr(tenant_config, "get_client", lambda: client)

    result = await tenant_config.get_tenant_by_phone("+15551234567")

    assert result == config
    args, _ = client.get.call_args
    assert args[0] == "/internal/tenants/by-phone/+15551234567"


async def test_returns_none_on_404(monkeypatch):
    # 404 is handled explicitly before raise_for_status.
    resp = FakeResponse(json_data={"error": "not found"}, status_code=404)
    client = _mock_client(get_response=resp)
    monkeypatch.setattr(tenant_config, "get_client", lambda: client)

    result = await tenant_config.get_tenant_by_phone("+10000000000")
    assert result is None


async def test_returns_none_on_http_status_error(monkeypatch):
    # A non-404 error status: raise_for_status raises HTTPStatusError.
    request = httpx.Request("GET", "http://api/internal/tenants/by-phone/x")
    response = httpx.Response(500, request=request, text="boom")
    err = httpx.HTTPStatusError("500", request=request, response=response)
    resp = FakeResponse(status_code=500, raise_exc=err)
    client = _mock_client(get_response=resp)
    monkeypatch.setattr(tenant_config, "get_client", lambda: client)

    result = await tenant_config.get_tenant_by_phone("+15550001111")
    assert result is None


async def test_returns_none_on_transport_error(monkeypatch):
    # Arbitrary exception (e.g. connection refused) -> generic except -> None.
    client = _mock_client(get_side_effect=httpx.ConnectError("refused"))
    monkeypatch.setattr(tenant_config, "get_client", lambda: client)

    result = await tenant_config.get_tenant_by_phone("+15550002222")
    assert result is None
