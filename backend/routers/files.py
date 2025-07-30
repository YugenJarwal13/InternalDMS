from fastapi import APIRouter, Depends, HTTPException, UploadFile, File as FastAPIFile, Form, Query, File, Body
from sqlalchemy.orm import Session
from models import File as FileModel,User
from database import get_db
from dependencies import get_current_user
import os
from datetime import datetime
import shutil
import urllib.parse
from fastapi.responses import FileResponse
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from utils import log_activity
from fastapi.encoders import jsonable_encoder

router = APIRouter()

# Storage configuration - use environment variable with fallback
BASE_STORAGE_PATH = os.path.abspath(os.getenv("STORAGE_PATH", "storage"))

# DISK-BASED SEARCH ENDPOINT
@router.get("/disk-search")
def disk_search(
    query: str = Query(..., min_length=1),
    parent_path: str = Query("/", description="Path to folder to search in"),
    user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Only search inside user's accessible folder (parent_path)
    abs_parent = os.path.abspath(os.path.join(BASE_STORAGE_PATH, parent_path.strip("/")))
    if not abs_parent.startswith(BASE_STORAGE_PATH):
        raise HTTPException(status_code=400, detail="Invalid path")
    if not os.path.exists(abs_parent):
        raise HTTPException(status_code=404, detail="Folder not found")
    results = []
    for root, dirs, files in os.walk(abs_parent):
        # Search folders
        for d in dirs:
            if query.lower() in d.lower():
                rel_path = os.path.relpath(os.path.join(root, d), BASE_STORAGE_PATH)
                path_with_slash = "/" + rel_path.replace("\\", "/")
                
                # Try to get folder metadata from DB
                db_record = db.query(FileModel).filter(FileModel.path == path_with_slash).first()
                
                folder_info = {
                    "name": d,
                    "path": path_with_slash,
                    "is_folder": True
                }
                
                # Add DB metadata if available
                if db_record:
                    folder_info.update({
                        "id": db_record.id,
                        "created_at": jsonable_encoder(db_record.created_at),
                        "modified_at": jsonable_encoder(db_record.modified_at),
                        "owner_id": db_record.owner_id,
                        "owner": db.query(User).filter(User.id == db_record.owner_id).first().email
                    })
                
                results.append(folder_info)
                
        # Search files
        for f in files:
            if query.lower() in f.lower():
                rel_path = os.path.relpath(os.path.join(root, f), BASE_STORAGE_PATH)
                path_with_slash = "/" + rel_path.replace("\\", "/")
                file_path = os.path.join(root, f)
                
                # Basic file info from disk
                file_info = {
                    "name": f,
                    "path": path_with_slash,
                    "is_folder": False,
                    "size": os.path.getsize(file_path)
                }
                
                # Try to get file metadata from DB
                db_record = db.query(FileModel).filter(FileModel.path == path_with_slash).first()
                
                # Add DB metadata if available
                if db_record:
                    file_info.update({
                        "id": db_record.id,
                        "created_at": jsonable_encoder(db_record.created_at),
                        "modified_at": jsonable_encoder(db_record.modified_at),
                        "owner_id": db_record.owner_id,
                        "owner": db.query(User).filter(User.id == db_record.owner_id).first().email
                    })
                
                results.append(file_info)
    return results

# DISK-BASED FILTER ENDPOINT
@router.get("/disk-filter")
def disk_filter(
    parent_path: str = Query("/", description="Path to folder to filter in"),
    is_folder: Optional[bool] = Query(None, description="True for folders, False for files, None for both"),
    min_size: Optional[int] = Query(None, description="Minimum file size in bytes"),
    max_size: Optional[int] = Query(None, description="Maximum file size in bytes"),
    owner_email: Optional[str] = Query(None, description="Email of file owner"),
    created_after: Optional[datetime] = Query(None, description="Filter items created after this date"),
    created_before: Optional[datetime] = Query(None, description="Filter items created before this date"),
    user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Prepare owner_id filter if owner_email is provided
    owner_id = None
    if owner_email:
        owner = db.query(User).filter(User.email == owner_email).first()
        if not owner:
            raise HTTPException(status_code=404, detail="User not found")
        owner_id = owner.id

    # Validate and prepare the parent path
    abs_parent = os.path.abspath(os.path.join(BASE_STORAGE_PATH, parent_path.strip("/")))
    if not abs_parent.startswith(BASE_STORAGE_PATH):
        raise HTTPException(status_code=400, detail="Invalid path")
    if not os.path.exists(abs_parent):
        raise HTTPException(status_code=404, detail="Folder not found")
    
    results = []
    
    # First scan the filesystem to find all files/folders
    for root, dirs, files in os.walk(abs_parent):
        # Process folders if needed
        if is_folder in (None, True):
            for d in dirs:
                rel_path = os.path.relpath(os.path.join(root, d), BASE_STORAGE_PATH)
                path_with_slash = "/" + rel_path.replace("\\", "/")
                
                # Try to get folder metadata from DB
                db_record = db.query(FileModel).filter(FileModel.path == path_with_slash).first()
                
                # Apply database filters
                if db_record:
                    # Skip if owner filter doesn't match
                    if owner_id is not None and db_record.owner_id != owner_id:
                        continue
                    
                    # Skip if date filters don't match
                    if created_after and db_record.created_at < created_after:
                        continue
                    if created_before and db_record.created_at > created_before:
                        continue
                    
                    # All filters passed, create result with DB metadata
                    folder_info = {
                        "id": db_record.id,
                        "name": d,
                        "path": path_with_slash,
                        "is_folder": True,
                        "created_at": jsonable_encoder(db_record.created_at),
                        "modified_at": jsonable_encoder(db_record.modified_at),
                        "owner_id": db_record.owner_id,
                        "owner": db.query(User).filter(User.id == db_record.owner_id).first().email
                    }
                    results.append(folder_info)
                # If no DB record but we're not filtering by owner or dates, include it with basic info
                elif owner_id is None and created_after is None and created_before is None:
                    folder_info = {
                        "name": d,
                        "path": path_with_slash,
                        "is_folder": True
                    }
                    results.append(folder_info)
                
        # Process files if needed
        if is_folder in (None, False):
            for f in files:
                file_path = os.path.join(root, f)
                size = os.path.getsize(file_path)
                
                # Apply size filters
                if (min_size is not None and size < min_size) or (max_size is not None and size > max_size):
                    continue
                    
                rel_path = os.path.relpath(file_path, BASE_STORAGE_PATH)
                path_with_slash = "/" + rel_path.replace("\\", "/")
                
                # Try to get file metadata from DB
                db_record = db.query(FileModel).filter(FileModel.path == path_with_slash).first()
                
                # Apply database filters
                if db_record:
                    # Skip if owner filter doesn't match
                    if owner_id is not None and db_record.owner_id != owner_id:
                        continue
                    
                    # Skip if date filters don't match
                    if created_after and db_record.created_at < created_after:
                        continue
                    if created_before and db_record.created_at > created_before:
                        continue
                    
                    # All filters passed, create result with DB metadata
                    file_info = {
                        "id": db_record.id,
                        "name": f,
                        "path": path_with_slash,
                        "is_folder": False,
                        "size": size,
                        "created_at": jsonable_encoder(db_record.created_at),
                        "modified_at": jsonable_encoder(db_record.modified_at),
                        "owner_id": db_record.owner_id,
                        "owner": db.query(User).filter(User.id == db_record.owner_id).first().email
                    }
                    results.append(file_info)
                # If no DB record but we're not filtering by owner or dates, include it with basic info
                elif owner_id is None and created_after is None and created_before is None:
                    file_info = {
                        "name": f,
                        "path": path_with_slash,
                        "is_folder": False,
                        "size": size
                    }
                    results.append(file_info)
                
    return results

# ✅ MULTIPLE FILES UPLOAD
@router.post("/upload")
def upload_files(
    parent_path: str = Form(...),
    files: List[UploadFile] = File(...),
    remark: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):

    from permission_utils import check_parent_permission
    check_parent_permission(parent_path.strip("/"), db, user)
    target_folder = os.path.abspath(os.path.join(BASE_STORAGE_PATH, parent_path.strip("/")))

    if not target_folder.startswith(BASE_STORAGE_PATH):
        raise HTTPException(status_code=400, detail="Invalid upload path")

    if not os.path.exists(target_folder):
        raise HTTPException(status_code=404, detail="Target folder does not exist")

    uploaded_file_data = []

    for uploaded_file in files:
        file_location = os.path.join(target_folder, uploaded_file.filename)

        if os.path.exists(file_location):
            raise HTTPException(status_code=400, detail=f"File '{uploaded_file.filename}' already exists")

        # Save file to disk
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(uploaded_file.file, buffer)

        # Store metadata
        file_record = FileModel(
            name=uploaded_file.filename,
            path=os.path.join("/", parent_path.strip("/"), uploaded_file.filename).replace("\\", "/"),
            is_folder=False,
            size=os.path.getsize(file_location),
            owner_id=user.id,
            created_at=datetime.utcnow(),
            modified_at=datetime.utcnow()
        )
        db.add(file_record)
        db.commit()
        db.refresh(file_record)

        uploaded_file_data.append({
            "name": uploaded_file.filename,
            "size": file_record.size,
            "id": file_record.id,
        })
    log_activity(db, user.id, action="Upload File", target_path=file_record.path, details=remark)
    return {"message": "Files uploaded successfully", "files": uploaded_file_data}


# ✅ DOWNLOAD FILE
@router.get("/download")
def download_file(
    path: str = Query(...),
    user=Depends(get_current_user),
    db: Session = Depends(get_db) 
):
    decoded_path = urllib.parse.unquote(path).strip("/")
    full_path = os.path.abspath(os.path.join(BASE_STORAGE_PATH, decoded_path))

    if not full_path.startswith(BASE_STORAGE_PATH):
        raise HTTPException(status_code=400, detail="Invalid file path")

    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="File not found")

    if os.path.isdir(full_path):
        raise HTTPException(status_code=400, detail="Path is a folder, not a file")
    log_activity(db, user.id, action="Download File", target_path=path)
    return FileResponse(full_path, filename=os.path.basename(full_path))

# ✅ DELETE FILE
@router.delete("/delete")
def delete_file(
    path: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    decoded_path = urllib.parse.unquote(path).strip("/")
    full_path = os.path.abspath(os.path.join(BASE_STORAGE_PATH, decoded_path))

    # Validate path
    if not full_path.startswith(BASE_STORAGE_PATH):
        raise HTTPException(status_code=400, detail="Invalid path")

    # Ensure file exists
    if not os.path.isfile(full_path):
        raise HTTPException(status_code=404, detail="File not found")

    # Get metadata from DB
    file_record = db.query(FileModel).filter(FileModel.path == f"/{decoded_path}").first()
    if not file_record:
        raise HTTPException(status_code=404, detail="File record not found")

    from permission_utils import require_owner_or_admin
    require_owner_or_admin(f"/{decoded_path}", db, user)

    # Delete from disk
    try:
        os.remove(full_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error deleting file from server")

    # Delete metadata
    db.delete(file_record)
    db.commit()
    log_activity(db, user.id, action="Delete File", target_path=file_record.path)
    return {"message": "File deleted successfully"}


#RENAME FILE
# ✅ Schema for renaming
class RenameRequest(BaseModel):
    path: str          # Full existing file path, e.g. /new_data/image.png
    new_name: str      # New file name, e.g. photo.png

@router.put("/rename")
def rename_file(
    data: RenameRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):

    from permission_utils import check_parent_permission, require_owner_or_admin
    old_path = os.path.abspath(os.path.join(BASE_STORAGE_PATH, data.path.strip("/")))
    parent_path = os.path.dirname(data.path.strip("/"))
    check_parent_permission(parent_path, db, user)
    require_owner_or_admin(data.path, db, user)

    # ✅ Path validation
    if not old_path.startswith(BASE_STORAGE_PATH):
        raise HTTPException(status_code=400, detail="Invalid path")
    if not os.path.exists(old_path):
        raise HTTPException(status_code=404, detail="File not found")
    if os.path.isdir(old_path):
        raise HTTPException(status_code=400, detail="Path is a folder, not a file")

    # ✅ Extension check: prevent changing file type
    old_ext = os.path.splitext(old_path)[1].lower()
    new_ext = os.path.splitext(data.new_name)[1].lower()
    if old_ext != new_ext:
        raise HTTPException(status_code=400, detail="Changing file extension is not allowed")

    new_path = os.path.join(os.path.dirname(old_path), data.new_name)

    if os.path.exists(new_path):
        raise HTTPException(status_code=409, detail="A file with the new name already exists")

    # ✅ Rename file on disk
    os.rename(old_path, new_path)

    # ✅ Update DB record
    db_file = db.query(FileModel).filter(FileModel.path == data.path).first()
    if db_file:
        db_file.name = data.new_name
        db_file.path = os.path.join(os.path.dirname(data.path), data.new_name).replace("\\", "/")
        db_file.modified_at = datetime.utcnow()
        db.commit()
    log_activity(db, user.id, action="Rename File", target_path=db_file.path)
    return {
        "message": "File renamed successfully",
        "new_path": db_file.path if db_file else "Unknown"
    }


#MOVING FILES CODE:
from schemas import MoveFileRequest

@router.put("/move")
def move_file(
    data: MoveFileRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):

    from permission_utils import check_parent_permission, require_owner_or_admin
    src_path = os.path.abspath(os.path.join(BASE_STORAGE_PATH, data.source_path.strip("/")))
    dest_folder = os.path.abspath(os.path.join(BASE_STORAGE_PATH, data.destination_path.strip("/")))
    dest_path = os.path.join(dest_folder, os.path.basename(src_path))
    # Permission checks
    src_parent = os.path.dirname(data.source_path.strip("/"))
    dest_parent = data.destination_path.strip("/")
    check_parent_permission(src_parent, db, user)
    check_parent_permission(dest_parent, db, user)
    require_owner_or_admin(data.source_path, db, user)

    #  Safety checks
    if not src_path.startswith(BASE_STORAGE_PATH) or not dest_folder.startswith(BASE_STORAGE_PATH):
        raise HTTPException(status_code=400, detail="Invalid path")
    if not os.path.exists(src_path):
        raise HTTPException(status_code=404, detail="Source file not found")
    if os.path.isdir(src_path):
        raise HTTPException(status_code=400, detail="Source is a folder")
    if not os.path.exists(dest_folder) or not os.path.isdir(dest_folder):
        raise HTTPException(status_code=404, detail="Destination folder not found")
    if os.path.exists(dest_path):
        raise HTTPException(status_code=409, detail="A file with the same name already exists at destination")

    #  Move file on disk
    os.rename(src_path, dest_path)

    #  Update database path
    db_file = db.query(FileModel).filter(FileModel.path == data.source_path).first()
    if db_file:
        db_file.path = os.path.join(data.destination_path, os.path.basename(src_path)).replace("\\", "/")
        db_file.modified_at = datetime.utcnow()
        db.commit()
    log_activity(db, user.id, action="Moved File", target_path=db_file.path)
    return {"message": "File moved successfully", "new_path": db_file.path}


#CODE FOR SEARCHING FILES ON BASIS OF ACCESS [ADMIN/USER]
from sqlalchemy import or_
@router.get("/search")
def search_items(
    query: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    try:
        # 🔎 Search folders/files owned by user with name match
        results = db.query(FileModel).filter(
            FileModel.owner_id == user.id,
            FileModel.name.ilike(f"%{query}%")  # ✅ case-insensitive partial match
        ).all()
        return [
            {
                "id": item.id,
                "name": item.name,
                "path": item.path,
                "is_folder": item.is_folder,
                "size": item.size,
                "created_at": jsonable_encoder(item.created_at),
                "modified_at": jsonable_encoder(item.modified_at)
            }
            for item in results
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


#FILE METADATA API CODE, USEFUL FOR FRONTEND TO DISPLAY FILE DETAILS
@router.get("/metadata")
def get_metadata(
    path: str = Query(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    decoded_path = urllib.parse.unquote(path).strip("/")
    abs_path = os.path.abspath(os.path.join(BASE_STORAGE_PATH, decoded_path))

    if not abs_path.startswith(BASE_STORAGE_PATH):
        raise HTTPException(status_code=400, detail="Invalid path")

    # Check if file/folder exists on disk
    if not os.path.exists(abs_path):
        raise HTTPException(status_code=404, detail="Item not found")

    # Fetch DB metadata
    record = db.query(FileModel).filter(FileModel.path == f"/{decoded_path}").first()

    if not record:
        raise HTTPException(status_code=404, detail="Metadata not found")
    log_activity(db, user.id, action="Checked File Metadata", target_path=record.path)
    return {
        "id": record.id,
        "name": record.name,
        "path": record.path,
        "is_folder": record.is_folder,
        "size": record.size,
        "created_at": jsonable_encoder(record.created_at),
        "modified_at": jsonable_encoder(record.modified_at),
        "owner": db.query(User).filter(User.id == record.owner_id).first().email
    }

#FILTTER/SEARCH BY OWNER, DATE:
@router.get("/filter")
def filter_files(
    owner_email: Optional[str] = Query(None, description="Email of file owner"),
    is_folder: Optional[bool] = Query(None, description="True for folders, False for files"),
    created_after: Optional[datetime] = Query(None),
    created_before: Optional[datetime] = Query(None),
    user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(FileModel)

    #  Filter by owner email
    if owner_email:
        user_obj = db.query(User).filter(User.email == owner_email).first()
        if not user_obj:
            raise HTTPException(status_code=404, detail="User not found")
        query = query.filter(FileModel.owner_id == user_obj.id)

    #  Filter by file or folder
    if is_folder is not None:
        query = query.filter(FileModel.is_folder == is_folder)

    #  Filter by date range
    if created_after:
        query = query.filter(FileModel.created_at >= created_after)
    if created_before:
        query = query.filter(FileModel.created_at <= created_before)

    files = query.all()
    return [
        {
            "name": f.name,
            "path": f.path,
            "is_folder": f.is_folder,
            "size": f.size,
            "created_at": jsonable_encoder(f.created_at),
            "owner": db.query(User).filter(User.id == f.owner_id).first().email
        }
        for f in files
    ]
    