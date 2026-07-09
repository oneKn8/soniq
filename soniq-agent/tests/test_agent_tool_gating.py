"""Unit tests for SoniqAgent tool gating (agent.py).

The create_order tool must only be OFFERED to the LLM when the tenant has the
order-taking capability enabled. Legacy capability strings ("takeaway",
"orders") are aliases for "order_taking". The always-on tools must always be
present. The LiveKit Agent base class is stubbed (see conftest) so we can read
back the exact tool list SoniqAgent hands to the framework.
"""

import agent
import tools


def _make_agent(capabilities):
    tenant_config = {
        "system_prompt": "You are a helpful receptionist.",
        "capabilities": capabilities,
    }
    return agent.SoniqAgent(tenant_config, caller_phone="+15551234567", job_ctx=None)


ALWAYS_ON = [
    tools.check_availability,
    tools.create_booking,
    tools.transfer_to_human,
    tools.end_call,
    tools.log_note,
]


def test_always_on_tools_present_without_order_capability():
    a = _make_agent([])
    for tool in ALWAYS_ON:
        assert tool in a.tools
    assert tools.create_order not in a.tools


def test_create_order_offered_when_order_taking_enabled():
    a = _make_agent(["order_taking"])
    assert tools.create_order in a.tools


def test_create_order_offered_for_legacy_takeaway_alias():
    a = _make_agent(["takeaway"])
    assert tools.create_order in a.tools


def test_create_order_offered_for_legacy_orders_alias():
    a = _make_agent(["orders"])
    assert tools.create_order in a.tools


def test_create_order_not_offered_for_unrelated_capability():
    a = _make_agent(["booking", "faq"])
    assert tools.create_order not in a.tools


def test_missing_capabilities_key_defaults_to_no_order_tool():
    # capabilities key absent entirely -> "or []" guard -> no create_order.
    a = agent.SoniqAgent(
        {"system_prompt": "hi"}, caller_phone="+1", job_ctx=None
    )
    assert tools.create_order not in a.tools
    assert tools.log_note in a.tools


def test_null_capabilities_defaults_to_no_order_tool():
    # capabilities explicitly None -> "or []" guard handles it.
    a = _make_agent(None)
    assert tools.create_order not in a.tools


def test_system_prompt_wired_as_instructions():
    a = _make_agent(["order_taking"])
    assert a.instructions == "You are a helpful receptionist."
