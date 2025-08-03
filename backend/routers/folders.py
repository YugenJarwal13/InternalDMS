# backend/routers/folders.py

from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session
from schemas import FolderCreate
from dependencies import get_current_user
from database import get_db
import os
from datetime import datetime, timezone, timedelta
import shutil
from utils import log_activity
from models import File, User, ActivityLog
from typing import Dict, List, Optional, Any

router = APIRouter()

#  Storage configuration - use environment variable with fallback to relative path
BASE_DIR = os.path.abspath(os.getenv("STORAGE_PATH", os.path.join(os.path.dirname(__file__), "..", "storage")))


@router.post("/create")
def create_folder(data: FolderCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):

    from permission_utils import check_parent_permission
    folder_name = data.name.strip()
    parent_path = data.parent_path.strip().lstrip("/")
    remark = data.remark  # Get the optional remark
    check_parent_permission(parent_path, db, user)

    #  Validate folder name
    if not folder_name or "/" in folder_name or "\\" in folder_name:
        raise HTTPException(status_code=400, detail="Invalid folder name")

    full_path = os.path.join(BASE_DIR, parent_path, folder_name)
    full_path = os.path.normpath(full_path)

    #  Disallow path traversal (must stay inside BASE_DIR)
    if not full_path.startswith(BASE_DIR):
        raise HTTPException(status_code=400, detail="Invalid path")

    if os.path.exists(full_path):
        raise HTTPException(status_code=400, detail="Folder already exists")

    #  Create folder
    os.makedirs(full_path)

    #  Save to DB
    new_folder = File(
        name=folder_name,
        path=f"/{parent_path}/{folder_name}".replace("//", "/"),
        is_folder=True,
        size=0,
        owner_id=user.id,
        created_at=datetime.utcnow(),
        modified_at=datetime.utcnow()
    )
    db.add(new_folder)
    db.commit()
    
    # Log folder creation activity
    folder_path = f"/{parent_path}/{folder_name}".replace("//", "/")
    log_activity(db, user.id, action="Create Folder", target_path=folder_path, details=remark)
    
    return {"message": "Folder created successfully", "path": folder_path}
BASE_STORAGE_PATH = BASE_DIR  # Reuse fixed BASE_DIR

@router.get("/list")
def list_folder_contents(
    parent_path: str = Query("/", description="Path to folder"),
    user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    abs_path = os.path.abspath(os.path.join(BASE_STORAGE_PATH, parent_path.strip("/")))

    if not abs_path.startswith(BASE_STORAGE_PATH):
        raise HTTPException(status_code=400, detail="Invalid path access")

    if not os.path.exists(abs_path):
        raise HTTPException(status_code=404, detail="Folder not found")

    items = []

    for entry in os.scandir(abs_path):
        item_path = os.path.join(parent_path, entry.name).replace("\\", "/")
        # Normalize path for consistent DB lookup
        normalized_path = "/" + item_path.strip("/")
        
        # Get basic file info from disk
        basic_info = {
            "name": entry.name,
            "path": item_path,
            "is_folder": entry.is_dir(),
            "size": entry.stat().st_size if entry.is_file() else 0,
            "created_at": datetime.fromtimestamp(entry.stat().st_ctime, tz=timezone.utc).isoformat(),
            "modified_at": datetime.fromtimestamp(entry.stat().st_mtime, tz=timezone.utc).isoformat()
        }
        
        # Try to enrich with DB metadata
        db_record = db.query(File).filter(File.path == normalized_path).first()
        if db_record:
            # Add owner information if available
            owner = db.query(User).filter(User.id == db_record.owner_id).first()
            if owner:
                basic_info["owner_id"] = db_record.owner_id
                basic_info["owner"] = owner.email
            
            # Use DB timestamps if available
            if db_record.created_at:
                basic_info["created_at"] = db_record.created_at.isoformat() 
            if db_record.modified_at:
                basic_info["modified_at"] = db_record.modified_at.isoformat()
        
        items.append(basic_info)
    return items



#RENAME FOLDER
from schemas import RenameFolderRequest
@router.put("/rename")
def rename_folder(
    data: RenameFolderRequest,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):

    from permission_utils import check_parent_permission, require_owner_or_admin
    old_path = os.path.normpath(os.path.join(BASE_DIR, data.old_path.strip("/")))
    new_path = os.path.normpath(os.path.join(BASE_DIR, os.path.dirname(data.old_path.strip("/")), data.new_name))
    parent_path = os.path.dirname(data.old_path.strip("/"))
    check_parent_permission(parent_path, db, user)
    require_owner_or_admin(data.old_path, db, user)

    #  Prevent traversal
    if not old_path.startswith(BASE_DIR) or not new_path.startswith(BASE_DIR):
        raise HTTPException(status_code=400, detail="Invalid path")

    if not os.path.exists(old_path):
        raise HTTPException(status_code=404, detail="Folder not found")

    if os.path.exists(new_path):
        raise HTTPException(status_code=400, detail="Folder with new name already exists")

    os.rename(old_path, new_path)

    # Update DB record
    old_db_path = data.old_path
    if not old_db_path.startswith('/'):
        old_db_path = f"/{old_db_path}"
    while "//" in old_db_path:
        old_db_path = old_db_path.replace("//", "/")
        
    new_folder_name = data.new_name
    parent_folder_path = os.path.dirname(old_db_path.strip('/'))
    
    # Calculate new path
    new_db_path = f"/{parent_folder_path}/{new_folder_name}".replace("//", "/")
    
    print(f"Renaming folder from {old_db_path} to {new_db_path}")
    
    # Get all affected items (folder itself and all its contents)
    affected_items = db.query(File).filter(
        (File.path == old_db_path) | 
        (File.path.startswith(old_db_path + "/"))
    ).all()
    
    print(f"Found {len(affected_items)} items to update:")
    for item in affected_items:
        old_path = item.path
        if item.path == old_db_path:
            # This is the folder being renamed
            item.name = new_folder_name
            item.path = new_db_path
            item.modified_at = datetime.utcnow()
        else:
            # This is a child item - update its path
            relative_path = item.path[len(old_db_path):]
            item.path = new_db_path + relative_path
            item.modified_at = datetime.utcnow()
        print(f"  - {item.id}: {old_path} -> {item.path}")
    
    db.commit()
    log_activity(db, user.id, action="Renamed Folder", target_path=new_db_path)
    return {"message": "Folder renamed successfully"}


#FOLDER DELETION:
@router.delete("/delete")
def delete_folder(
    path: str = Body(..., embed=True, description="Path to the folder to delete"),
    force: bool = Body(False, embed=True, description="Set to true if user confirms deletion of non-empty folder"),
    user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from permission_utils import check_parent_permission, require_owner_or_admin
    parent_path = os.path.dirname(path.strip("/"))
    check_parent_permission(parent_path, db, user)
    
    # Normalize the folder path for consistent DB lookups
    folder_db_path = path
    if not folder_db_path.startswith('/'):
        folder_db_path = f"/{folder_db_path}"
    while "//" in folder_db_path:
        folder_db_path = folder_db_path.replace("//", "/")
        
    require_owner_or_admin(folder_db_path, db, user)
    
    #  Secure full path
    abs_path = os.path.abspath(os.path.join(BASE_DIR, path.strip("/")))

    if not abs_path.startswith(BASE_DIR):
        raise HTTPException(status_code=400, detail="Invalid path")

    # Check if folder exists in filesystem
    if not os.path.exists(abs_path) or not os.path.isdir(abs_path):
        # If folder is missing on disk but exists in DB, we can clean up DB entries
        folder_in_db = db.query(File).filter(File.path == folder_db_path, File.is_folder == True).first()
        if folder_in_db:
            # Delete DB entries since filesystem entries are already gone
            items_to_delete = db.query(File).filter(
                (File.path == folder_db_path) | 
                (File.path.startswith(folder_db_path + "/"))
            ).all()
            
            print(f"Folder missing on disk but found in DB. Cleaning up {len(items_to_delete)} database entries.")
            for item in items_to_delete:
                print(f"  - Deleting DB entry: {item.id}: {item.path} ({item.name})")
                db.delete(item)
            
            db.commit()
            log_activity(db, user.id, action="Database Cleanup", target_path=folder_db_path)
            return {"message": "Folder entries removed from database"}
        else:
            raise HTTPException(status_code=404, detail="Folder not found")

    #  Warn if folder is not empty and force is not set
    if os.listdir(abs_path) and not force:
        return {
            "warning": "Folder is not empty. Are you sure you want to delete it?",
            "can_proceed": True
        }

    #  Delete from filesystem
    try:
        shutil.rmtree(abs_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting folder: {str(e)}")

    # Normalize and prepare folder path for DB queries
    folder_db_path = path
    if not folder_db_path.startswith('/'):
        folder_db_path = f"/{folder_db_path}"
    
    # Make sure no double slashes remain
    while "//" in folder_db_path:
        folder_db_path = folder_db_path.replace("//", "/")
        
    print(f"Deleting folder: {folder_db_path} (Original path: {path})")
    
    # Delete both the folder and all its contents from DB
    items_to_delete = db.query(File).filter(
        (File.path == folder_db_path) | 
        (File.path.startswith(folder_db_path + "/"))
    ).all()
    
    # Log what we're deleting
    print(f"Found {len(items_to_delete)} items to delete:")
    for item in items_to_delete:
        print(f"  - {item.id}: {item.path} ({item.name})")
        db.delete(item)
    
    db.commit()
    log_activity(db, user.id, action="Delete Folder", target_path=path)
    return {"message": "Folder deleted successfully"}



#LOGIC TO MOVE FOLDERS
from schemas import MoveFolderRequest
from models import File as FileModel  # ensure already imported

@router.put("/move")
def move_folder(
    data: MoveFolderRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    from permission_utils import check_parent_permission, require_owner_or_admin
    src = os.path.abspath(os.path.join(BASE_STORAGE_PATH, data.source_path.strip("/")))
    dest_dir = os.path.abspath(os.path.join(BASE_STORAGE_PATH, data.destination_path.strip("/")))
    new_folder_path = os.path.join(dest_dir, os.path.basename(src))
    # Permission checks
    src_parent = os.path.dirname(data.source_path.strip("/"))
    dest_parent = data.destination_path.strip("/")
    check_parent_permission(src_parent, db, user)
    check_parent_permission(dest_parent, db, user)
    require_owner_or_admin(data.source_path, db, user)
    
    #  Validations
    if not src.startswith(BASE_STORAGE_PATH) or not dest_dir.startswith(BASE_STORAGE_PATH):
        raise HTTPException(status_code=400, detail="Invalid path")

    if not os.path.exists(src) or not os.path.isdir(src):
        raise HTTPException(status_code=404, detail="Source folder not found")

    if os.path.exists(new_folder_path):
        raise HTTPException(status_code=409, detail="Destination folder already exists")

    #  Move on disk
    os.rename(src, new_folder_path)

    #  Update DB paths recursively
    source_db_path = data.source_path
    if not source_db_path.startswith('/'):
        source_db_path = f"/{source_db_path}"
    while "//" in source_db_path:
        source_db_path = source_db_path.replace("//", "/")
        
    dest_db_path = data.destination_path
    if not dest_db_path.startswith('/'):
        dest_db_path = f"/{dest_db_path}"
    while "//" in dest_db_path:
        dest_db_path = dest_db_path.replace("//", "/")
        
    folder_name = os.path.basename(source_db_path.rstrip("/"))
    
    # Calculate new folder path
    new_folder_db_path = os.path.join(dest_db_path, folder_name).replace("\\", "/")
    # Normalize path
    while "//" in new_folder_db_path:
        new_folder_db_path = new_folder_db_path.replace("//", "/")
    
    print(f"Moving folder from {source_db_path} to {new_folder_db_path}")
    
    # Update all affected items
    affected = db.query(FileModel).filter(
        (FileModel.path == source_db_path) | 
        (FileModel.path.startswith(source_db_path + "/"))
    ).all()
    
    print(f"Found {len(affected)} items to update:")
    for item in affected:
        old_path = item.path
        if item.path == source_db_path:
            # This is the main folder
            item.path = new_folder_db_path
        else:
            # This is a child item
            relative_suffix = item.path[len(source_db_path):]
            item.path = (new_folder_db_path + relative_suffix).replace("\\", "/")
        item.modified_at = datetime.utcnow()
        print(f"  - {item.id}: {old_path} -> {item.path}")

    db.commit()
    log_activity(db, user.id, action="Folder Moved", target_path=new_folder_db_path)
    return {"message": "Folder moved successfully", "new_path": os.path.join(data.destination_path, os.path.basename(src))}

# Upload a folder via multiple files with relative paths (best practice)
from fastapi import UploadFile, File as FastAPIFile, Form
from typing import List

@router.post("/upload-folder-structure")
async def upload_folder_structure(
    parent_path: str = Form(..., description="Path to parent folder where to upload"),
    files: List[UploadFile] = FastAPIFile(..., description="Files in the folder, with relative paths"),
    relpaths: List[str] = Form(..., description="Relative paths for each file, matching order of files list"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    from permission_utils import check_parent_permission
    import os
    # Authorization: user must have permission to upload in parent_path
    check_parent_permission(parent_path, db, user)

    # Save each file to the correct location and collect all folders
    created_folders = set()
    created_files = []
    for upload_file, relpath in zip(files, relpaths):
        # Sanitize the relative path to prevent traversal attacks
        safe_relpath = relpath.strip().replace("..", "").replace("\\", "/").lstrip("/")
        dest_path = os.path.abspath(os.path.join(BASE_DIR, parent_path.strip("/"), safe_relpath))
        
        # Security check
        if not dest_path.startswith(BASE_DIR):
            raise HTTPException(status_code=400, detail=f"Invalid file path: {relpath}")
            
        dest_dir = os.path.dirname(dest_path)
        # Track all folders in the path
        rel_folder_parts = safe_relpath.split("/")[:-1]
        for i in range(1, len(rel_folder_parts)+1):
            # Handle root parent path correctly
            parent_clean = parent_path.strip("/")
            if parent_clean:
                folder_path = "/" + "/".join([parent_clean] + rel_folder_parts[:i])
            else:
                folder_path = "/" + "/".join(rel_folder_parts[:i])
            # Remove any double slashes
            while "//" in folder_path:
                folder_path = folder_path.replace("//", "/")
            created_folders.add(folder_path)
            
        # Create directory if it doesn't exist
        if not os.path.exists(dest_dir):
            try:
                os.makedirs(dest_dir)
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to create directory {dest_dir}: {str(e)}")
            
        # Write file to disk with proper error handling
        try:
            with open(dest_path, "wb") as f:
                # Read in chunks to avoid memory issues with large files
                content = await upload_file.read()
                f.write(content)
            # Get file size after successful write
            file_size = os.path.getsize(dest_path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to write file {safe_relpath}: {str(e)}")
        # Prepare file record for DB - ensure consistent path format
        parent_clean = parent_path.strip("/")
        if parent_clean:
            file_db_path = "/" + "/".join([parent_clean, safe_relpath])
        else:
            file_db_path = "/" + safe_relpath
        # Remove any double slashes and normalize
        file_db_path = file_db_path.replace("\\", "/")
        while "//" in file_db_path:
            file_db_path = file_db_path.replace("//", "/")
            
        created_files.append((os.path.basename(dest_path), file_db_path, file_size))

    # Add folders to DB (if not already present)
    for folder_path in sorted(created_folders, key=lambda x: x.count("/")):
        # Ensure consistent path format
        normalized_folder_path = folder_path
        while "//" in normalized_folder_path:
            normalized_folder_path = normalized_folder_path.replace("//", "/")
            
        existing_folder = db.query(File).filter(File.path == normalized_folder_path, File.is_folder == True).first()
        if not existing_folder:
            # Calculate folder name properly - avoid empty names
            folder_name = os.path.basename(normalized_folder_path.rstrip("/"))
            if not folder_name:
                # Handle root or edge cases - extract from the full path
                path_parts = normalized_folder_path.strip("/").split("/")
                folder_name = path_parts[-1] if path_parts and path_parts[-1] else "root"
            
            db.add(File(
                name=folder_name,
                path=normalized_folder_path,
                is_folder=True,
                size=0,
                owner_id=user.id,
                created_at=datetime.utcnow(),
                modified_at=datetime.utcnow()
            ))
        else:
            # Update the modified_at timestamp for existing folders
            existing_folder.modified_at = datetime.utcnow()
            
    # Add files to DB
    for name, path, size in created_files:
        # Ensure consistent path format
        normalized_path = path
        while "//" in normalized_path:
            normalized_path = normalized_path.replace("//", "/")
            
        existing_file = db.query(File).filter(File.path == normalized_path, File.is_folder == False).first()
        if not existing_file:
            db.add(File(
                name=name,
                path=normalized_path,
                is_folder=False,
                size=size,
                owner_id=user.id,
                created_at=datetime.utcnow(),
                modified_at=datetime.utcnow()
            ))
        else:
            # Update existing file
            existing_file.size = size
            existing_file.modified_at = datetime.utcnow()
    
    try:
        db.commit()
        from utils import log_activity
        log_activity(db, user.id, action="Upload Folder Structure", target_path=parent_path)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save folder structure to database: {str(e)}")
        
    return {"message": "Folder structure uploaded successfully", "created_folders": list(created_folders), "created_files": len(created_files)}


# Statistics endpoint for dashboard
@router.get("/statistics")
def get_folder_statistics(
    user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get folder statistics for dashboard display.
    Returns folder name, owner, number of subfolders, and number of files.
    Statistics are gathered from disk rather than just the database.
    """
    # Use the base storage directory as the root path
    abs_root_path = BASE_DIR
    
    # Prepare result container
    results = []
    
    # Start with immediate subfolders of the root path
    for entry in os.scandir(abs_root_path):
        if not entry.is_dir():
            continue
        
        folder_stats = {
            "folder_name": entry.name,
            "path": "/" + os.path.relpath(entry.path, BASE_DIR).replace("\\", "/"),
            "subfolder_count": 0,
            "file_count": 0,
            "total_size": 0,
            "owner": None,
            "owner_id": None
        }
        
        # Get owner info from database
        folder_db_path = folder_stats["path"]
        db_record = db.query(File).filter(File.path == folder_db_path, File.is_folder == True).first()
        if db_record:
            folder_stats["owner_id"] = db_record.owner_id
            owner = db.query(User).filter(User.id == db_record.owner_id).first()
            if owner:
                folder_stats["owner"] = owner.email
        
        # Walk the folder to count files and subfolders
        for root, dirs, files in os.walk(entry.path):
            folder_stats["subfolder_count"] += len(dirs)
            folder_stats["file_count"] += len(files)
            
            # Calculate total size of files
            for file in files:
                file_path = os.path.join(root, file)
                try:
                    folder_stats["total_size"] += os.path.getsize(file_path)
                except (FileNotFoundError, PermissionError):
                    # Skip files that can't be accessed
                    pass
        
        # Format total size for human readability
        folder_stats["size_formatted"] = format_file_size(folder_stats["total_size"])
        
        results.append(folder_stats)
    
    # Log the statistics request
    # Check for duplicate logging within the last 5 seconds to prevent React strict mode double calls
    recent_log = db.query(ActivityLog).filter(
        ActivityLog.user_id == user.id,
        ActivityLog.action == "View Folder Statistics",
        ActivityLog.timestamp >= datetime.utcnow() - timedelta(seconds=5)
    ).first()
    
    # Only log if no recent identical activity found
    if not recent_log:
        log_activity(db, user.id, action="View Folder Statistics", target_path="/")
    
    return {
        "total_folders": len(results),
        "statistics": sorted(results, key=lambda x: x["folder_name"])
    }

def format_file_size(size_bytes):
    """Format file size from bytes to human-readable format."""
    if size_bytes < 1024:
        return f"{size_bytes} bytes"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.1f} GB"



