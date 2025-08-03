# backend/dependencies.py

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from database import get_db
from models import User
import os
from dotenv import load_dotenv

# Load secrets from .env
load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")

# Use clean Bearer token auth
oauth2_scheme = HTTPBearer()

# ✅ Extract user from JWT token
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    token = credentials.credentials  # Extracts just the token part
    credentials_exception = HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Could not validate credentials"
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        user_id = int(user_id)
    except (JWTError, ValueError):
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception

    return user

# ✅ Require admin for protected routes
def require_admin(user: User = Depends(get_current_user)):
    if user.role.name != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ✅ Team Access Control Dependency
def check_team_access(folder_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Check if user has access to a team folder (first-level folder under root).
    Admin users have full access to all folders.
    Regular users need explicit team access.
    """
    from models import Team, UserTeamAccess, File as FileModel
    
    # Admin has full access
    if current_user.role.name == "admin":
        return current_user
    
    # Check if this folder is a team folder (first-level folder under root)
    folder = db.query(FileModel).filter(FileModel.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    # Check if this folder is associated with a team
    team = db.query(Team).filter(Team.folder_id == folder_id).first()
    if team:
        # This is a team folder, check if user has access
        has_access = db.query(UserTeamAccess).filter(
            UserTeamAccess.user_id == current_user.id,
            UserTeamAccess.team_id == team.id
        ).first()
        
        if not has_access:
            raise HTTPException(
                status_code=403, 
                detail="Sorry, not authorized. Please contact admin for access."
            )
    
    return current_user


# ✅ Check if folder path is under a team folder
def check_parent_team_access(folder_path: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Check team access for operations inside team folders.
    This checks if the operation is happening within a team folder hierarchy.
    """
    from models import Team, UserTeamAccess, File as FileModel
    
    # Admin has full access
    if current_user.role.name == "admin":
        return current_user
    
    # Handle empty or root path - no team access needed for root operations
    if not folder_path or folder_path.strip('/') == '':
        return current_user
    
    # Get the root folder from the path
    path_parts = folder_path.strip('/').split('/')
    if len(path_parts) > 0 and path_parts[0]:  # Make sure we have a non-empty folder name
        root_folder_name = path_parts[0]
        
        # Find the team folder by checking if there's a team with a folder having this exact path
        team_folder = db.query(FileModel).filter(
            FileModel.name == root_folder_name,
            FileModel.is_folder == True,
            FileModel.path == f"/{root_folder_name}"
        ).first()
        
        if team_folder:
            team = db.query(Team).filter(Team.folder_id == team_folder.id).first()
            if team:
                # This operation is within a team folder, check access
                has_access = db.query(UserTeamAccess).filter(
                    UserTeamAccess.user_id == current_user.id,
                    UserTeamAccess.team_id == team.id
                ).first()
                
                if not has_access:
                    raise HTTPException(
                        status_code=403,
                        detail="Sorry, not authorized. Please contact admin for access."
                    )
    
    return current_user
