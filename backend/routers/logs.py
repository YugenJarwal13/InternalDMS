from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func, String
from database import get_db
from dependencies import require_admin
from models import ActivityLog, User
from fastapi.encoders import jsonable_encoder
from typing import Optional
from datetime import datetime
import os

router = APIRouter()

# Storage configuration - use environment variable with fallback
BASE_STORAGE_PATH = os.path.abspath(os.getenv("STORAGE_PATH", "storage"))

def check_file_status(target_path: str, action: str):
    """
    Check if a file/folder exists on disk and return status and current location
    Only applies to file/folder CRUD operations
    """
    # Define file/folder related actions
    file_folder_actions = [
        "Upload File", "Download File", "Delete File", "Rename File", "Moved File",
        "Create Folder", "Renamed Folder", "Delete Folder", "Folder Moved", 
        "Upload Folder Structure", "Checked File Metadata"
    ]
    
    # If not a file/folder operation, return None for both status and location
    if action not in file_folder_actions:
        return None, None
    
    if not target_path:
        return "Unknown", None
    
    # Construct the absolute path
    try:
        # Remove leading slash if present and join with base storage path
        relative_path = target_path.strip("/")
        absolute_path = os.path.abspath(os.path.join(BASE_STORAGE_PATH, relative_path))
        
        # Security check - ensure the path is within storage directory
        if not absolute_path.startswith(BASE_STORAGE_PATH):
            return "Invalid Path", None
        
        # Check if file/folder exists
        if os.path.exists(absolute_path):
            return "Present", absolute_path
        else:
            return "Deleted", None
            
    except Exception as e:
        return "Error", None

@router.get("/logs/", tags=["Logs"])
def get_activity_logs(admin=Depends(require_admin), db: Session = Depends(get_db)):
    logs = db.query(ActivityLog).order_by(ActivityLog.timestamp.desc()).all()
    result = []
    for log in logs:
        user = db.query(User).filter(User.id == log.user_id).first()
        
        # Check file/folder status on disk
        status, current_location = check_file_status(log.target_path, log.action)
        
        result.append({
            "id": log.id,
            "timestamp": jsonable_encoder(log.timestamp),
            "user_id": log.user_id,
            "user_email": user.email if user else None,
            "action": log.action,
            "details": log.details,
            "status": status,
            "current_location": current_location,
        })
    return result

@router.get("/logs/search", tags=["Logs"])
def search_activity_logs(
    query: str = Query(..., description="Search term for logs"),
    admin=Depends(require_admin), 
    db: Session = Depends(get_db)
):
    """
    Search activity logs by date/time, username, action, or details
    Returns matching results in same format as regular logs endpoint
    """
    if not query or len(query.strip()) < 2:
        return []
    
    search_term = f"%{query.strip()}%"
    print(f"Searching for: '{search_term}'")  # Debug log
    
    # Define file/folder CRUD operations to filter results
    file_folder_actions = [
        "Upload File", "Download File", "Delete File", "Rename File", "Moved File",
        "Create Folder", "Renamed Folder", "Delete Folder", "Folder Moved", 
        "Upload Folder Structure", "Checked File Metadata"
    ]
    
    # Build search query with multiple conditions - detect database type for timestamp search
    try:
        # Check database type
        db_dialect = db.bind.dialect.name
        print(f"Database dialect: {db_dialect}")
        
        if db_dialect == 'postgresql':
            # PostgreSQL timestamp search
            timestamp_search = func.to_char(ActivityLog.timestamp, 'YYYY-MM-DD HH24:MI:SS').ilike(search_term)
        elif db_dialect == 'sqlite':
            # SQLite timestamp search  
            timestamp_search = func.datetime(ActivityLog.timestamp).like(search_term)
        else:
            # Generic fallback
            timestamp_search = func.cast(ActivityLog.timestamp, String).ilike(search_term)
            
        logs_query = db.query(ActivityLog, User).join(
            User, ActivityLog.user_id == User.id, isouter=True
        ).filter(
            and_(
                # Only include file/folder CRUD operations
                ActivityLog.action.in_(file_folder_actions),
                or_(
                    # Search in timestamp
                    timestamp_search,
                    # Search in user email
                    User.email.ilike(search_term),
                    # Search in action
                    ActivityLog.action.ilike(search_term),
                    # Search in details
                    ActivityLog.details.ilike(search_term)
                )
            )
        ).order_by(ActivityLog.timestamp.desc())
        
    except Exception as e:
        print(f"Database query error: {e}")
        # Fallback without timestamp search if there's an error
        logs_query = db.query(ActivityLog, User).join(
            User, ActivityLog.user_id == User.id, isouter=True
        ).filter(
            and_(
                # Only include file/folder CRUD operations
                ActivityLog.action.in_(file_folder_actions),
                or_(
                    # Search in user email
                    User.email.ilike(search_term),
                    # Search in action
                    ActivityLog.action.ilike(search_term),
                    # Search in details
                    ActivityLog.details.ilike(search_term)
                )
            )
        ).order_by(ActivityLog.timestamp.desc())
    
    results = []
    for log, user in logs_query.all():
        # Check file/folder status on disk
        status, current_location = check_file_status(log.target_path, log.action)
        
        results.append({
            "id": log.id,
            "timestamp": jsonable_encoder(log.timestamp),
            "user_id": log.user_id,
            "user_email": user.email if user else None,
            "action": log.action,
            "details": log.details,
            "status": status,
            "current_location": current_location,
        })
    
    print(f"Found {len(results)} results")  # Debug log
    return results 