# remote_utils/remote_client.py

import httpx

async def send_request(method: str, url: str, params=None, data=None, files=None):
    async with httpx.AsyncClient() as client:
        response = await client.request(
            method=method,
            url=url,
            params=params,
            data=data,
            files=files
        )
        response.raise_for_status()
        return response.json()
