"""Unit tests for call_logger.py pure classification helpers.

_detect_outcome and _build_summary are pure functions over transcript text.
These tests assert real classification behaviour on representative transcripts,
including keyword precedence (booking is checked before escalation).
"""

import call_logger


# --------------------------------------------------------------------------
# _detect_outcome
# --------------------------------------------------------------------------
def test_detect_outcome_confirmed_appointment_is_booking():
    t = "Agent: Great, your appointment is confirmed for Tuesday at 2pm."
    assert call_logger._detect_outcome(t) == "booking"


def test_detect_outcome_confirmation_code_is_booking():
    t = "Agent: Your confirmation code is 8842. See you then!"
    assert call_logger._detect_outcome(t) == "booking"


def test_detect_outcome_reserved_is_booking():
    t = "Agent: I've reserved that slot under your name."
    assert call_logger._detect_outcome(t) == "booking"


def test_detect_outcome_transfer_request_is_escalation():
    t = "Customer: Can I speak to a manager please?"
    assert call_logger._detect_outcome(t) == "escalation"


def test_detect_outcome_real_person_is_escalation():
    t = "Customer: I want to talk to a real person, not a bot."
    assert call_logger._detect_outcome(t) == "escalation"


def test_detect_outcome_delivery_order_is_booking():
    t = "Customer: I'd like to place an order for delivery tonight."
    assert call_logger._detect_outcome(t) == "booking"


def test_detect_outcome_plain_question_is_inquiry():
    t = "Customer: What are your weekend prices?\nAgent: They vary by service."
    assert call_logger._detect_outcome(t) == "inquiry"


def test_detect_outcome_booking_precedence_over_escalation():
    # Contains both a booking signal and an escalation keyword; booking is
    # evaluated first in the source, so it must win.
    t = "Agent: You're booked. Customer: Actually, can I speak to a manager?"
    assert call_logger._detect_outcome(t) == "booking"


def test_detect_outcome_empty_transcript_is_inquiry():
    assert call_logger._detect_outcome("") == "inquiry"


# --------------------------------------------------------------------------
# _build_summary
# --------------------------------------------------------------------------
def test_build_summary_counts_turns_and_detects_booking_topic():
    transcript = "Customer: I want to book a haircut.\nAgent: Sure, what day?"
    summary = call_logger._build_summary(transcript, 42)
    assert "2 conversation turns" in summary
    assert "42s" in summary
    assert "booking" in summary


def test_build_summary_detects_multiple_sorted_topics():
    transcript = (
        "Customer: What times are available to book an appointment?\n"
        "Agent: We have several open slots.\n"
        "Customer: Also what are your hours and address?"
    )
    summary = call_logger._build_summary(transcript, 90)
    # book/appoint -> booking, avail/open/slot/time -> availability,
    # hour/open/close/locat/address -> business info. Sorted, comma-joined.
    assert "Topics: availability, booking, business info." in summary
    assert "3 conversation turns" in summary


def test_build_summary_detects_ordering_and_escalation():
    transcript = (
        "Customer: Can I order delivery?\n"
        "Agent: Let me transfer you to a human."
    )
    summary = call_logger._build_summary(transcript, 15)
    assert "escalation" in summary
    assert "ordering" in summary


def test_build_summary_falls_back_to_general_inquiry():
    transcript = "Customer: Hi there.\nAgent: Hello, how can I help?"
    summary = call_logger._build_summary(transcript, 7)
    assert "Topics: general inquiry." in summary
    assert "2 conversation turns, 7s." in summary
