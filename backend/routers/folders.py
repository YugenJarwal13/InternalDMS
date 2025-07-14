# backend/routers/folders.py

from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session
from schemas import FolderCreate
from dependencies import get_current_user
from database import get_db
import os
from datetime import datetime
import shutil
from utils import log_activity
from models import File

router = APIRouter()

#  Correct path to /backend/storage
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "storage"))


@router.post("/create")
def create_folder(data: FolderCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    folder_name = data.name.strip()
    parent_path = data.parent_path.strip().lstrip("/")
    remark = data.remark  # Get the optional remark

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
    db.refresh(new_folder)
    log_activity(db, user.id, action="Create Folder", target_path=new_folder.path, details=remark)
    return {"message": "Folder created", "folder": new_folder.name, "id": new_folder.id}




#  List folder contents
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
        items.append({
            "name": entry.name,
            "path": os.path.join(parent_path, entry.name).replace("\\", "/"),
            "is_folder": entry.is_dir(),
            "size": entry.stat().st_size if entry.is_file() else 0,
            "created_at": entry.stat().st_ctime,
            "modified_at": entry.stat().st_mtime
        })
    return items



#RENAME FOLDER
from schemas import RenameFolderRequest
@router.put("/rename")
def rename_folder(
    data: RenameFolderRequest,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    old_path = os.path.normpath(os.path.join(BASE_DIR, data.old_path.strip("/")))
    new_path = os.path.normpath(os.path.join(BASE_DIR, os.path.dirname(data.old_path.strip("/")), data.new_name))

    #  Prevent traversal
    if not old_path.startswith(BASE_DIR) or not new_path.startswith(BASE_DIR):
        raise HTTPException(status_code=400, detail="Invalid path")

    if not os.path.exists(old_path):
        raise HTTPException(status_code=404, detail="Folder not found")

    if os.path.exists(new_path):
        raise HTTPException(status_code=400, detail="Folder with new name already exists")

    os.rename(old_path, new_path)

    # Update DB record
    folder_record = db.query(File).filter(File.path == data.old_path, File.is_folder == True).first()
    if folder_record:
        folder_record.name = data.new_name
        folder_record.path = f"/{os.path.dirname(data.old_path.strip('/'))}/{data.new_name}".replace("//", "/")
        folder_record.modified_at = datetime.utcnow()
        db.commit()
    log_activity(db, user.id, action="Renamed Folder", target_path=folder_record.path)
    return {"message": "Folder renamed successfully"}


#FOLDER DELETION:
@router.delete("/delete")
def delete_folder(
    path: str = Body(..., embed=True, description="Path to the folder to delete"),
    force: bool = Body(False, embed=True, description="Set to true if user confirms deletion of non-empty folder"),
    user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    #  Secure full path
    abs_path = os.path.abspath(os.path.join(BASE_DIR, path.strip("/")))

    if not abs_path.startswith(BASE_DIR):
        raise HTTPException(status_code=400, detail="Invalid path")

    if not os.path.exists(abs_path) or not os.path.isdir(abs_path):
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

    #  Remove metadata from database
    db.query(File).filter(File.path == f"/{path.strip('/')}").delete()
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
    src = os.path.abspath(os.path.join(BASE_STORAGE_PATH, data.source_path.strip("/")))
    dest_dir = os.path.abspath(os.path.join(BASE_STORAGE_PATH, data.destination_path.strip("/")))
    new_folder_path = os.path.join(dest_dir, os.path.basename(src))
    
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
    affected = db.query(FileModel).filter(FileModel.path.startswith(data.source_path)).all()
    for item in affected:
        relative_suffix = item.path[len(data.source_path):]
        item.path = os.path.join(data.destination_path, os.path.basename(src) + relative_suffix).replace("\\", "/")
        item.modified_at = datetime.utcnow()

    db.commit()
    log_activity(db, user.id, action="Folder Moved", target_path=os.path.join(data.destination_path, os.path.basename(src))
)
    return {"message": "Folder moved successfully", "new_path": os.path.join(data.destination_path, os.path.basename(src))}


