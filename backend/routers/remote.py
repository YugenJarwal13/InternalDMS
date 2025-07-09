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
        return await send_request(
            method="GET",
            url=f"{remote_base_url}/download",
            params={"path": path}
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
