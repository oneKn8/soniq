import logging

import httpx

from api_client import get_client

logger = logging.getLogger("soniq-agent.tenant")


async def get_tenant_by_phone(phone: str) -> dict | None:
    """Fetch tenant configuration from soniq-api by phone number.

    Returns tenant config dict including system_prompt, voice_config,
    greetings, escalation settings, etc.
    """
    client = get_client()

    try:
        resp = await client.get(f"/internal/tenants/by-phone/{phone}")

        if resp.status_code == 404:
            logger.warning("No tenant found for phone: %s", phone)
            return None

        resp.raise_for_status()
        return resp.json()
    except httpx.HTTPStatusError as e:
        logger.error(
            "Tenant lookup HTTP error: %s %s",
            e.response.status_code,
            e.response.text,
        )
        return None
    except Exception as e:
        logger.error("Tenant lookup error: %s", e)
        return None
