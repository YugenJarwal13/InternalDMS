from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from dependencies import require_admin
from models import ActivityLog, User
from fastapi.encoders import jsonable_encoder

router = APIRouter()

@router.get("/logs/", tags=["Logs"])
def get_activity_logs(admin=Depends(require_admin), db: Session = Depends(get_db)):
    logs = db.query(ActivityLog).order_by(ActivityLog.timestamp.desc()).all()
    result = []
    for log in logs:
        user = db.query(User).filter(User.id == log.user_id).first()
        result.append({
            "id": log.id,
            "timestamp": jsonable_encoder(log.timestamp),
            "user_id": log.user_id,
            "user_email": user.email if user else None,
            "action": log.action,
            "target_path": log.target_path,
            "details": log.details,
        })
    return result 