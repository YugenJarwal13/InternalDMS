# backend/routers/remote.py

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File as FastAPIFile, Form, Query
from typing import List
from dependencies import get_current_user
from remote_utils.remote_client import send_request  

router = APIRouter(prefix="/remote", tags=["Remote Server"])


# Proxy: List remote folder contents
@router.get("/list")
async def list_remote_folder(
    remote_base_url: str = Query(..., description="Remote server base URL"),
    path: str = Query("/", description="Path to list on remote server")
):
    try:
        return await send_request(
            method="GET",
            url=f"{remote_base_url}/list",
            params={"path": path}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Remote list failed: {str(e)}")


# Proxy: Upload files to remote server
@router.post("/upload")
async def upload_to_remote(
    remote_base_url: str = Form(..., description="Remote server base URL"),
    parent_path: str = Form(..., description="Remote upload folder path"),
    files: List[UploadFile] = FastAPIFile(...)
):
    try:
        # prepare file data
        file_data = []
        for file in files:
            content = await file.read()
            file_data.append(("files", (file.filename, content, file.content_type)))

        return await send_request(
            method="POST",
            url=f"{remote_base_url}/upload",
            data={"parent_path": parent_path},
            files=file_data
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Remote upload failed: {str(e)}")


# Proxy: Download from remote server
@router.get("/download")
async def download_from_remote(
    remote_base_url: str = Query(...),
    path: str = Query(...)
):
    try:
        response = await send_request(
            method="GET",
            url=f"{remote_base_url}/download",
            params={"path": path}
        )
        # For downloads, send_request returns the httpx response object
        from fastapi.responses import StreamingResponse
        return StreamingResponse(
            response.iter_bytes(),
            media_type=response.headers.get('content-type', 'application/octet-stream'),
            headers={
                'Content-Disposition': response.headers.get('content-disposition', f'attachment; filename="{path.split("/")[-1]}"')
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Remote download failed: {str(e)}")


# Proxy: Delete file from remote server
@router.delete("/delete")
async def delete_from_remote(
    remote_base_url: str = Query(...),
    path: str = Query(...)
):
    try:
        return await send_request(
            method="DELETE",
            url=f"{remote_base_url}/delete",
            params={"path": path}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Remote delete failed: {str(e)}")

#  Proxy: Move file/folder on remote server
@router.post("/move")
async def move_on_remote(
    remote_base_url: str = Form(...),
    source_path: str = Form(...),
    destination_path: str = Form(...)
):
    try:
        return await send_request(
            method="POST",
            url=f"{remote_base_url}/move",
            data={
                "source_path": source_path,
                "destination_path": destination_path
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Remote move failed: {str(e)}")

# Proxy: Create folder on remote server
@router.post("/create-folder")
async def create_folder_on_remote(
    remote_base_url: str = Form(...),
    parent_path: str = Form(...),
    folder_name: str = Form(...)
):
    try:
        return await send_request(
            method="POST",
            url=f"{remote_base_url}/create-folder",
            data={
                "parent_path": parent_path,
                "folder_name": folder_name
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Remote folder creation failed: {str(e)}")


# Proxy: Search remote files/folders
@router.get("/search")
async def search_remote(
    remote_base_url: str = Query(..., description="Remote server base URL"),
    query: str = Query(..., min_length=1, description="Search query"),
):
    try:
        return await send_request(
            method="GET",
            url=f"{remote_base_url}/search",
            params={"query": query}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Remote search failed: {str(e)}")

# Proxy: Filter remote files/folders
@router.get("/filter")
async def filter_remote(
    remote_base_url: str = Query(..., description="Remote server base URL"),
    owner_email: str = Query(None, description="Email of file owner"),
    is_folder: bool = Query(None, description="True for folders, False for files"),
    created_after: str = Query(None, description="Created after (ISO format)"),
    created_before: str = Query(None, description="Created before (ISO format)")
):
    try:
        params = {"owner_email": owner_email, "is_folder": is_folder, "created_after": created_after, "created_before": created_before}
        # Remove None values
        params = {k: v for k, v in params.items() if v is not None}
        return await send_request(
            method="GET",
            url=f"{remote_base_url}/filter",
            params=params
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Remote filter failed: {str(e)}")

# Proxy: Get remote file/folder metadata
@router.get("/metadata")
async def remote_metadata(
    remote_base_url: str = Query(..., description="Remote server base URL"),
    path: str = Query(..., description="Path to file/folder")
):
    try:
        return await send_request(
            method="GET",
            url=f"{remote_base_url}/metadata",
            params={"path": path}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Remote metadata failed: {str(e)}")
