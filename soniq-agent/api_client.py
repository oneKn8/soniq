import os
import logging

import httpx

logger = logging.getLogger("soniq-agent.api")

API_URL = os.environ.get("INTERNAL_API_URL", "http://localhost:3100")
API_KEY = os.environ.get("INTERNAL_API_KEY", "")

_client: httpx.AsyncClient | None = None


def get_client() -> httpx.AsyncClient:
    """Return a shared httpx client for internal API calls."""
    global _client
    if _client is None:
        _client = httpx.AsyncClient(
            base_url=API_URL,
            headers={"Authorization": f"Bearer {API_KEY}"},
            timeout=10.0,
        )
    return _client
