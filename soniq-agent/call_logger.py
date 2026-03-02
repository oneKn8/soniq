import logging
import re
from datetime import datetime, timezone

from api_client import get_client

logger = logging.getLogger("soniq-agent.call_logger")


def _detect_outcome(transcript: str) -> str:
    """Detect call outcome from transcript text."""
    lower = transcript.lower()
    if re.search(r"(confirmation code|booked|appointment.*(confirmed|set)|reserved)", lower):
        return "booking"
    if re.search(r"(transfer|human|manager|speak to|real person)", lower):
        return "escalation"
    if re.search(r"(order.*(placed|confirmed)|delivery|pickup)", lower):
        return "booking"
    return "inquiry"


def _build_summary(transcript: str, duration: int) -> str:
    """Build a brief summary from transcript."""
    lines = transcript.strip().split("\n")
    turns = len(lines)
    topics = set()
    lower = transcript.lower()
    if re.search(r"(book|appoint|reserv|schedul)", lower):
        topics.add("booking")
    if re.search(r"(avail|open|slot|time)", lower):
        topics.add("availability")
    if re.search(r"(order|deliver|pickup|menu)", lower):
        topics.add("ordering")
    if re.search(r"(hour|open|close|locat|address)", lower):
        topics.add("business info")
    if re.search(r"(transfer|human|manager|complain)", lower):
        topics.add("escalation")
    if not topics:
        topics.add("general inquiry")
    topic_str = ", ".join(sorted(topics))
    return f"{turns} conversation turns, {duration}s. Topics: {topic_str}."


async def log_call(
    tenant_id: str,
    call_sid: str,
    caller_phone: str,
    session,
    started_at: datetime | None = None,
) -> None:
    """Log a completed call to soniq-api.

    Extracts transcript from the agent session's chat context
    and posts it to the internal calls/log endpoint.
    """
    client = get_client()
    now = datetime.now(timezone.utc)

    # Build transcript from session history (livekit-agents v1.4+)
    # session.history is a ChatContext; .messages() is a method (not property)
    transcript = ""
    try:
        if session and hasattr(session, "history") and session.history:
            lines = []
            for msg in session.history.messages():
                if hasattr(msg, "role") and hasattr(msg, "text_content"):
                    role = str(msg.role)
                    text = msg.text_content
                    if text and role in ("user", "assistant"):
                        speaker = "Customer" if role == "user" else "Agent"
                        lines.append(f"{speaker}: {text}")
            transcript = "\n".join(lines)
    except Exception as e:
        logger.warning("Failed to extract transcript: %s", e)

    # Calculate duration
    start = started_at or now
    duration = int((now - start).total_seconds())

    # Derive outcome and summary from transcript
    outcome = _detect_outcome(transcript) if transcript else "inquiry"
    summary = _build_summary(transcript, duration) if transcript else None

    try:
        resp = await client.post(
            "/internal/calls/log",
            json={
                "tenant_id": tenant_id,
                "call_sid": call_sid,
                "caller_phone": caller_phone,
                "direction": "inbound",
                "status": "completed",
                "started_at": start.isoformat(),
                "ended_at": now.isoformat(),
                "duration_seconds": duration,
                "ended_reason": "completed",
                "outcome_type": outcome,
                "outcome_success": outcome in ("booking", "inquiry"),
                "transcript": transcript or None,
                "summary": summary,
            },
        )
        resp.raise_for_status()
        logger.info("Call logged: %s (%ds, %s)", call_sid, duration, outcome)
    except Exception as e:
        logger.error("Failed to log call %s: %s", call_sid, e)
