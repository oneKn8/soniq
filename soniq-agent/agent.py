import asyncio
import logging
import os
from datetime import datetime, timezone

from dotenv import load_dotenv

from livekit import rtc
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    JobProcess,
    cli,
    metrics,
)
from livekit.agents.llm import function_tool
from livekit.agents import room_io
from livekit.plugins import deepgram, cartesia, openai, silero, noise_cancellation
from livekit.plugins.turn_detector.multilingual import MultilingualModel

from tools import (
    check_availability,
    create_booking,
    create_order,
    transfer_to_human,
    end_call,
)
from tenant_config import get_tenant_by_phone
from call_logger import log_call

load_dotenv()
logger = logging.getLogger("soniq-agent")


class SoniqAgent(Agent):
    """Voice agent that handles inbound calls for Soniq tenants."""

    def __init__(self, tenant_config: dict, caller_phone: str, job_ctx: JobContext) -> None:
        super().__init__(
            instructions=tenant_config["system_prompt"],
            tools=[
                check_availability,
                create_booking,
                create_order,
                transfer_to_human,
                end_call,
            ],
        )
        self.tenant_config = tenant_config
        self.caller_phone = caller_phone
        self.job_ctx = job_ctx

    async def on_enter(self):
        self.session.generate_reply(
            instructions=f"Greet the caller: {self.tenant_config['greeting_standard']}"
        )


server = AgentServer()


def prewarm(proc: JobProcess):
    """Prewarm VAD model during process startup for lower first-call latency."""
    proc.userdata["vad"] = silero.VAD.load()


server.setup_fnc = prewarm


@server.rtc_session(agent_name="soniq-voice-agent")
async def entrypoint(ctx: JobContext):
    """Entrypoint for each inbound SIP call.

    Flow:
    1. Wait for the SIP participant to join the room
    2. Extract the dialed number and caller phone from SIP attributes
    3. Fetch tenant config (including system prompt) from soniq-api
    4. Start the agent session with STT/LLM/TTS
    5. Agent greets the caller via on_enter()
    """
    # Connect to the room first, then wait for the SIP participant
    await ctx.connect()
    participant = await ctx.wait_for_participant()
    dialed_number = participant.attributes.get("sip.trunkPhoneNumber", "")
    caller_phone = participant.attributes.get("sip.phoneNumber", "")

    logger.info(
        "Call started: dialed=%s caller=%s room=%s",
        dialed_number,
        caller_phone,
        ctx.room.name,
    )

    # Fetch tenant config from soniq-api internal endpoint
    tenant_config = await get_tenant_by_phone(dialed_number)
    if not tenant_config:
        logger.error("No tenant found for number: %s", dialed_number)
        return

    # Configure LLM: gpt-4.1-mini (best balance of quality, speed, tool calling)
    llm = openai.LLM(
        model="gpt-4.1-mini",
        temperature=0.8,
    )
    logger.info("Using OpenAI gpt-4.1-mini")

    # Configure the voice pipeline with explicit plugin instances (self-hosted, BYOK)
    session = AgentSession(
        stt=deepgram.STT(
            model="nova-3",
            language="multi",
            smart_format=True,
            keyterm=[tenant_config["business_name"]],
        ),
        llm=llm,
        tts=cartesia.TTS(
            model="sonic-3",
            voice=tenant_config["voice_config"]["voice_id"],
            speed=0.95,
            emotion=["Content"],
        ),
        vad=ctx.proc.userdata["vad"],
        turn_detection=MultilingualModel(),
        # Production tuning -- patient turn-taking for natural conversation
        preemptive_generation=True,
        resume_false_interruption=True,
        false_interruption_timeout=1.5,
        min_endpointing_delay=0.8,
        max_endpointing_delay=2.5,
    )

    # Track call start time for accurate duration
    call_started_at = datetime.now(timezone.utc)

    # Call duration limit: transfer to human when exceeded (default 15 min, min 2 min)
    max_duration = max(tenant_config.get("max_call_duration_seconds", 900), 120)
    escalation_phone = tenant_config.get("escalation_phone", "")

    # Duration watchdog: warns agent to wrap up, then transfers to human
    watchdog_task: asyncio.Task | None = None

    # Metrics collection for observability
    usage_collector = metrics.UsageCollector()

    @session.on("metrics_collected")
    def _on_metrics_collected(ev):
        metrics.log_metrics(ev.metrics)
        usage_collector.collect(ev.metrics)

    async def on_shutdown():
        # Cancel the duration watchdog if still running
        if watchdog_task and not watchdog_task.done():
            watchdog_task.cancel()

        summary = usage_collector.get_summary()
        logger.info("Call usage: %s", summary)

        # Fire-and-forget: log the call without blocking session teardown
        try:
            await asyncio.wait_for(
                log_call(
                    tenant_id=tenant_config["id"],
                    call_sid=ctx.room.name,
                    caller_phone=caller_phone,
                    session=session,
                    started_at=call_started_at,
                ),
                timeout=5.0,
            )
        except asyncio.TimeoutError:
            logger.warning("Call logging timed out for %s", ctx.room.name)
        except Exception as e:
            logger.error("Call logging failed for %s: %s", ctx.room.name, e)

    ctx.add_shutdown_callback(on_shutdown)

    async def _duration_watchdog():
        """Enforce max call duration with graceful escalation to human."""
        try:
            # Phase 1: Wait until 2 minutes before the limit
            warn_at = max(max_duration - 120, 0)
            if warn_at > 0:
                await asyncio.sleep(warn_at)

            # Nudge the agent to start wrapping up
            session.generate_reply(
                instructions="The call has been going on for a while. Start wrapping up the conversation naturally. Ask if there's anything else you can quickly help with."
            )
            logger.info("Duration watchdog: wrap-up nudge sent at %ds", warn_at)

            # Phase 2: Wait until 30 seconds before the limit
            await asyncio.sleep(max(max_duration - warn_at - 30, 30))

            # Final warning: offer transfer to human
            session.generate_reply(
                instructions="You need to wrap up now. Politely tell the caller you need to go, and offer to transfer them to a human team member if they need more help."
            )
            logger.info("Duration watchdog: final warning sent")

            # Phase 3: Wait the final 30 seconds, then force transfer/end
            await asyncio.sleep(30)

            logger.warning(
                "Duration limit reached (%ds) for room %s, initiating transfer",
                max_duration,
                ctx.room.name,
            )

            # Transfer to human if escalation phone is configured
            if escalation_phone:
                from tools import _get_sip_participant
                sip_participant = _get_sip_participant(ctx.room)
                if sip_participant:
                    try:
                        sip_uri = f"sip:{escalation_phone}@sip.signalwire.com"
                        await sip_participant.transfer_sip_call(sip_uri)
                        logger.info("Duration limit: transferred to %s", escalation_phone)
                        return
                    except Exception as e:
                        logger.error("Duration limit: transfer failed: %s", e)

            # Fallback: end the call if transfer not possible
            try:
                await ctx.delete_room()
                logger.info("Duration limit: room deleted (no escalation phone)")
            except Exception as e:
                logger.error("Duration limit: failed to end call: %s", e)

        except asyncio.CancelledError:
            logger.debug("Duration watchdog cancelled (call ended normally)")

    # Start the agent session with echo cancellation for SIP calls
    agent = SoniqAgent(tenant_config, caller_phone, ctx)
    await session.start(
        agent=agent,
        room=ctx.room,
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=noise_cancellation.BVCTelephony(),
            ),
        ),
    )
    # Greeting is handled by SoniqAgent.on_enter()

    # Start the duration watchdog after session is live
    if max_duration > 0:
        watchdog_task = asyncio.create_task(_duration_watchdog())
        logger.info("Duration watchdog started: %ds limit", max_duration)


if __name__ == "__main__":
    cli.run_app(server)
