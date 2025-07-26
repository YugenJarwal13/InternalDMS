from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import get_db
from dependencies import get_current_user
from permission_utils import require_owner_or_admin, check_parent_permission

router = APIRouter()

@router.post("/api/authorize")
async def authorize_action(request: Request, db: Session = Depends(get_db), user=Depends(get_current_user)):
    data = await request.json()
    action = data.get('action')
    path = data.get('path')
    if not action or not path:
        raise HTTPException(status_code=400, detail="Missing action or path")

    # Map actions to permission checks
    if action in ["create_folder", "upload"]:
        check_parent_permission(path, db, user)
    elif action in ["rename", "move", "delete"]:
        check_parent_permission(path, db, user)
        require_owner_or_admin(path, db, user)
    else:
        raise HTTPException(status_code=400, detail="Unknown action")
    return {"authorized": True}
