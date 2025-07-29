# remote_utils/remote_client.py

import httpx
from fastapi import HTTPException

async def send_request(method: str, url: str, params=None, data=None, files=None):
    """Send HTTP request to remote server with proper error handling"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.request(
                method=method,
                url=url,
                params=params,
                data=data,
                files=files
            )
            
            # Handle different response types
            if response.status_code == 404:
                raise HTTPException(status_code=404, detail="Resource not found on remote server")
            elif response.status_code == 409:
                raise HTTPException(status_code=409, detail="Conflict - resource already exists")
            elif response.status_code >= 400:
                try:
                    error_detail = response.json().get('detail', f"Remote server error: {response.status_code}")
                except:
                    error_detail = f"Remote server error: {response.status_code} {response.reason_phrase}"
                raise HTTPException(status_code=response.status_code, detail=error_detail)
            
            response.raise_for_status()
            
            # Return appropriate response based on content type
            content_type = response.headers.get('content-type', '')
            if 'application/json' in content_type:
                return response.json()
            else:
                # For file downloads, return the response object
                return response
                
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Remote server timeout")
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="Cannot connect to remote server")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Remote request failed: {str(e)}")
