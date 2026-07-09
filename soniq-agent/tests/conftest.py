"""Shared test setup for the soniq-agent unit suite.

The agent's runtime modules (``tools.py``, ``agent.py``) import the LiveKit SDK
(``livekit.agents``, ``livekit.rtc``, ``livekit.plugins`` ...) at module load
time. That SDK is heavy and is not installed in the local Python 3.10
environment, so importing those modules would fail during collection.

To test the *pure logic* (payload building, capability gating, dispatch) we
install lightweight stand-in modules into ``sys.modules`` BEFORE any test
imports the code under test. The stand-ins expose only the attributes the code
references at import time and the small surface the pure functions touch. No
network, no real SDK, no database.

The passthrough ``function_tool`` decorator is deliberate: the real decorator
wraps the coroutine into a LiveKit tool object, but the behaviour under test is
the coroutine body itself, so we keep the raw ``async def`` callable.
"""

import os
import sys
import types

import pytest

# Make the agent package importable (tools.py, call_logger.py, ... live one
# directory up from tests/).
_AGENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _AGENT_DIR not in sys.path:
    sys.path.insert(0, _AGENT_DIR)


def _module(name: str) -> types.ModuleType:
    mod = types.ModuleType(name)
    sys.modules[name] = mod
    return mod


def _install_fake_livekit() -> None:
    """Install minimal fake livekit / dotenv modules into sys.modules."""

    # --- dotenv -----------------------------------------------------------
    dotenv = _module("dotenv")
    dotenv.load_dotenv = lambda *a, **k: False

    # --- livekit (namespace-style parent) ---------------------------------
    livekit = _module("livekit")

    # livekit.rtc -----------------------------------------------------------
    rtc = _module("livekit.rtc")

    class _ParticipantKind:
        PARTICIPANT_KIND_SIP = "SIP"
        PARTICIPANT_KIND_STANDARD = "STANDARD"

    class Room:  # noqa: D401 - marker class used for annotations/isinstance
        pass

    class RemoteParticipant:
        pass

    rtc.ParticipantKind = _ParticipantKind
    rtc.Room = Room
    rtc.RemoteParticipant = RemoteParticipant
    livekit.rtc = rtc

    # livekit.agents --------------------------------------------------------
    agents = _module("livekit.agents")

    class Agent:
        """Base Agent stand-in that records what SoniqAgent passes up."""

        def __init__(self, instructions=None, tools=None):
            self.instructions = instructions
            self.tools = tools

    class AgentSession:
        def __init__(self, *a, **k):
            self.kwargs = k

    class AgentServer:
        def __init__(self, *a, **k):
            self.setup_fnc = None

        def rtc_session(self, *a, **k):
            def _decorator(fn):
                return fn

            return _decorator

    class JobContext:
        pass

    class JobProcess:
        pass

    class RunContext:
        pass

    class _Metrics:
        class UsageCollector:
            def collect(self, *a, **k):
                pass

            def get_summary(self, *a, **k):
                return {}

        @staticmethod
        def log_metrics(*a, **k):
            pass

    class _Cli:
        @staticmethod
        def run_app(*a, **k):
            pass

    # room_io submodule (imported as ``from livekit.agents import room_io``)
    room_io = _module("livekit.agents.room_io")

    class RoomOptions:
        def __init__(self, *a, **k):
            pass

    class AudioInputOptions:
        def __init__(self, *a, **k):
            pass

    room_io.RoomOptions = RoomOptions
    room_io.AudioInputOptions = AudioInputOptions

    agents.Agent = Agent
    agents.AgentSession = AgentSession
    agents.AgentServer = AgentServer
    agents.JobContext = JobContext
    agents.JobProcess = JobProcess
    agents.RunContext = RunContext
    agents.metrics = _Metrics
    agents.cli = _Cli
    agents.room_io = room_io
    livekit.agents = agents

    # livekit.agents.llm ----------------------------------------------------
    llm = _module("livekit.agents.llm")

    def function_tool(*d_args, **d_kwargs):
        """Passthrough stand-in for the LiveKit @function_tool() decorator."""

        def _decorator(fn):
            return fn

        return _decorator

    llm.function_tool = function_tool
    agents.llm = llm

    # livekit.plugins + individual plugin stand-ins ------------------------
    plugins = _module("livekit.plugins")
    for plugin_name in (
        "deepgram",
        "cartesia",
        "openai",
        "silero",
        "noise_cancellation",
    ):
        plugin_mod = _module(f"livekit.plugins.{plugin_name}")
        setattr(plugins, plugin_name, plugin_mod)

    turn_detector = _module("livekit.plugins.turn_detector")
    multilingual = _module("livekit.plugins.turn_detector.multilingual")

    class MultilingualModel:
        def __init__(self, *a, **k):
            pass

    multilingual.MultilingualModel = MultilingualModel
    turn_detector.multilingual = multilingual
    plugins.turn_detector = turn_detector


# Install the fakes at import time (before any test module imports the code
# under test). Idempotent: only installs when the real SDK is absent.
if "livekit.agents" not in sys.modules:
    _install_fake_livekit()


class FakeResponse:
    """Minimal stand-in for an httpx.Response used by the mocked client."""

    def __init__(self, *, json_data=None, status_code=200, raise_exc=None, text=""):
        self._json = json_data if json_data is not None else {}
        self.status_code = status_code
        self._raise_exc = raise_exc
        self.text = text

    def json(self):
        return self._json

    def raise_for_status(self):
        if self._raise_exc is not None:
            raise self._raise_exc


@pytest.fixture
def fake_response():
    return FakeResponse
