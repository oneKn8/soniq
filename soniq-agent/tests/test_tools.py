"""Unit tests for tools.py.

Covers:
- _call_tool: posts to the correct internal action endpoint with the right
  payload, extracts the result message, falls back sensibly, and swallows
  errors into a safe spoken string.
- create_order: builds the neutral (industry-agnostic) request payload and
  dispatches to the create_order action.
- log_note: dispatches note + note_type to the log_note action.

The httpx client is fully mocked; no network is touched.
"""

from unittest.mock import AsyncMock, MagicMock

import pytest

import tools
from conftest import FakeResponse


# --------------------------------------------------------------------------
# Test doubles for the LiveKit RunContext the tools receive.
# --------------------------------------------------------------------------
class _FakeAgent:
    def __init__(self):
        self.tenant_config = {"id": "tenant-42", "escalation_phone": "+18005551212"}
        self.caller_phone = "+15551230000"


class _FakeRoom:
    name = "room-xyz"


class _FakeRoomIO:
    room = _FakeRoom()


class _FakeSession:
    def __init__(self):
        self.current_agent = _FakeAgent()
        self.room_io = _FakeRoomIO()


class _FakeContext:
    def __init__(self):
        self.session = _FakeSession()


def _mock_client_returning(response):
    client = MagicMock()
    client.post = AsyncMock(return_value=response)
    return client


# --------------------------------------------------------------------------
# _call_tool
# --------------------------------------------------------------------------
async def test_call_tool_posts_to_correct_action_and_returns_message(monkeypatch):
    resp = FakeResponse(json_data={"result": {"message": "You're all set for 3pm."}})
    client = _mock_client_returning(resp)
    monkeypatch.setattr(tools, "get_client", lambda: client)

    ctx = _FakeContext()
    result = await tools._call_tool(ctx, "create_booking", {"date": "2026-07-10"})

    assert result == "You're all set for 3pm."

    # URL is the internal voice-tools endpoint for the given action.
    args, kwargs = client.post.call_args
    assert args[0] == "/internal/voice-tools/create_booking"

    payload = kwargs["json"]
    assert payload["tenant_id"] == "tenant-42"
    assert payload["caller_phone"] == "+15551230000"
    assert payload["escalation_phone"] == "+18005551212"
    assert payload["call_sid"] == "room-xyz"
    assert payload["args"] == {"date": "2026-07-10"}


async def test_call_tool_falls_back_to_str_result_when_no_message(monkeypatch):
    resp = FakeResponse(json_data={"result": {"status": "queued"}})
    client = _mock_client_returning(resp)
    monkeypatch.setattr(tools, "get_client", lambda: client)

    result = await tools._call_tool(_FakeContext(), "log_note", {"note": "x"})
    # No "message" key -> stringified result dict.
    assert result == str({"status": "queued"})


async def test_call_tool_handles_missing_result_key(monkeypatch):
    # data with no "result" -> result defaults to {} -> str({}) message.
    resp = FakeResponse(json_data={"ok": True})
    client = _mock_client_returning(resp)
    monkeypatch.setattr(tools, "get_client", lambda: client)

    result = await tools._call_tool(_FakeContext(), "end_call", {"reason": "done"})
    assert result == str({})


async def test_call_tool_returns_safe_message_on_http_error(monkeypatch):
    # raise_for_status raises -> caught -> safe spoken fallback.
    resp = FakeResponse(raise_exc=RuntimeError("500 server error"))
    client = _mock_client_returning(resp)
    monkeypatch.setattr(tools, "get_client", lambda: client)

    result = await tools._call_tool(_FakeContext(), "create_booking", {})
    assert result == "I encountered an error. Let me try again."


async def test_call_tool_returns_safe_message_when_post_raises(monkeypatch):
    client = MagicMock()
    client.post = AsyncMock(side_effect=ConnectionError("network down"))
    monkeypatch.setattr(tools, "get_client", lambda: client)

    result = await tools._call_tool(_FakeContext(), "check_availability", {})
    assert result == "I encountered an error. Let me try again."


# --------------------------------------------------------------------------
# create_order -> neutral payload + correct action
# --------------------------------------------------------------------------
async def test_create_order_builds_neutral_payload(monkeypatch):
    spy = AsyncMock(return_value="Request logged.")
    monkeypatch.setattr(tools, "_call_tool", spy)

    ctx = _FakeContext()
    result = await tools.create_order(
        ctx,
        customer_name="Jordan",
        request_summary="Two large pepperoni pizzas",
        fulfillment_type="delivery",
        customer_phone="+15559990000",
        fulfillment_address="42 Elm St",
        notes="ring the bell",
    )

    assert result == "Request logged."
    spy.assert_awaited_once()
    call_ctx, action, payload = spy.await_args.args

    assert call_ctx is ctx
    assert action == "create_order"
    # Neutral / industry-agnostic keys: nothing booking- or menu-specific,
    # and the exact shape the API expects.
    assert payload == {
        "customer_name": "Jordan",
        "request_summary": "Two large pepperoni pizzas",
        "customer_phone": "+15559990000",
        "fulfillment_type": "delivery",
        "fulfillment_address": "42 Elm St",
        "notes": "ring the bell",
    }


async def test_create_order_defaults_fulfillment_to_none(monkeypatch):
    spy = AsyncMock(return_value="ok")
    monkeypatch.setattr(tools, "_call_tool", spy)

    await tools.create_order(
        _FakeContext(),
        customer_name="Sam",
        request_summary="Callback about a quote",
    )

    _, action, payload = spy.await_args.args
    assert action == "create_order"
    assert payload["fulfillment_type"] == "none"
    assert payload["customer_phone"] == ""
    assert payload["fulfillment_address"] == ""
    assert payload["notes"] == ""


# --------------------------------------------------------------------------
# log_note dispatch
# --------------------------------------------------------------------------
async def test_log_note_dispatches_note_and_type(monkeypatch):
    spy = AsyncMock(return_value="Noted.")
    monkeypatch.setattr(tools, "_call_tool", spy)

    ctx = _FakeContext()
    result = await tools.log_note(ctx, note="Prefers morning slots", note_type="preference")

    assert result == "Noted."
    call_ctx, action, payload = spy.await_args.args
    assert call_ctx is ctx
    assert action == "log_note"
    assert payload == {"note": "Prefers morning slots", "note_type": "preference"}


async def test_log_note_defaults_note_type_to_general(monkeypatch):
    spy = AsyncMock(return_value="ok")
    monkeypatch.setattr(tools, "_call_tool", spy)

    await tools.log_note(_FakeContext(), note="Called about a refund")

    _, action, payload = spy.await_args.args
    assert action == "log_note"
    assert payload["note_type"] == "general"
