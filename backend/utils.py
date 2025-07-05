# utils.py
#ACTIVITY LOGGING UTILITY
from models import ActivityLog
from sqlalchemy.orm import Session
from datetime import datetime

def log_activity(db: Session, user_id: int, action: str, target_path: str, details: str = None):
    log = ActivityLog(
        user_id=user_id,
        action=action,
        target_path=target_path,
        timestamp=datetime.utcnow(),
        details=details
    )
    db.add(log)
    db.commit()
