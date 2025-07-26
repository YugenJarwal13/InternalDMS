from fastapi import HTTPException, status, Depends
from dependencies import get_current_user
from models import File as FileModel
from sqlalchemy.orm import Session

def require_owner_or_admin(path: str, db: Session, user=Depends(get_current_user)):
    record = db.query(FileModel).filter(FileModel.path == path).first()
    if not record:
        raise HTTPException(status_code=404, detail="Resource not found")
    if user.role.name == "admin" or record.owner_id == user.id:
        return record
    raise HTTPException(status_code=403, detail="Not authorised")

def check_parent_permission(parent_path: str, db, user):
    norm_parent = parent_path.strip().replace("\\", "/").strip("/")
    # Recursively check all ancestors up to root
    while norm_parent not in ("", "/"):
        folder_db_path = f"/{norm_parent}"
        require_owner_or_admin(folder_db_path, db, user)
        # Move up one level
        if "/" in norm_parent:
            norm_parent = norm_parent.rsplit("/", 1)[0]
        else:
            norm_parent = ""
    # root, allow
    return
