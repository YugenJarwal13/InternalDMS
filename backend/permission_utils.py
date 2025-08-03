from fastapi import HTTPException, status, Depends
from dependencies import get_current_user
from models import File as FileModel, Team, UserTeamAccess
from sqlalchemy.orm import Session

def require_owner_or_admin_or_team_member(path: str, db: Session, user=Depends(get_current_user)):
    """Enhanced authorization that supports admin, owner, AND team member access"""
    record = db.query(FileModel).filter(FileModel.path == path).first()
    if not record:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    # Admin has full access
    if user.role.name == "admin":
        return record
    
    # Owner has full access
    if record.owner_id == user.id:
        return record
    
    # Check if this is within a team folder and user has team access
    path_parts = path.strip('/').split('/')
    if len(path_parts) > 0 and path_parts[0]:
        root_folder_name = path_parts[0]
        
        # Find the team folder
        team_folder = db.query(FileModel).filter(
            FileModel.name == root_folder_name,
            FileModel.is_folder == True,
            FileModel.path == f"/{root_folder_name}"
        ).first()
        
        if team_folder:
            team = db.query(Team).filter(Team.folder_id == team_folder.id).first()
            if team:
                # Check if user has team access
                has_access = db.query(UserTeamAccess).filter(
                    UserTeamAccess.user_id == user.id,
                    UserTeamAccess.team_id == team.id
                ).first()
                
                if has_access:
                    return record
    
    # If none of the above, deny access
    raise HTTPException(status_code=403, detail="Not authorised")

def check_parent_permission_with_team_access(parent_path: str, db, user):
    """Enhanced parent permission check that supports team access"""
    norm_parent = parent_path.strip().replace("\\", "/").strip("/")
    
    # For empty or root path, allow access
    if not norm_parent:
        return
    
    # Check team access for the root folder first
    path_parts = norm_parent.split('/')
    if len(path_parts) > 0 and path_parts[0]:
        root_folder_name = path_parts[0]
        
        # Check if this is a team folder
        team_folder = db.query(FileModel).filter(
            FileModel.name == root_folder_name,
            FileModel.is_folder == True,
            FileModel.path == f"/{root_folder_name}"
        ).first()
        
        if team_folder:
            team = db.query(Team).filter(Team.folder_id == team_folder.id).first()
            if team:
                # This is a team folder, check team access instead of owner access
                if user.role.name == "admin":
                    return  # Admin has access
                
                has_access = db.query(UserTeamAccess).filter(
                    UserTeamAccess.user_id == user.id,
                    UserTeamAccess.team_id == team.id
                ).first()
                
                if has_access:
                    return  # Team member has access
                else:
                    raise HTTPException(status_code=403, detail="Not authorised - no team access")
    
    # Fall back to traditional recursive owner check for non-team folders
    while norm_parent not in ("", "/"):
        folder_db_path = f"/{norm_parent}"
        require_owner_or_admin_or_team_member(folder_db_path, db, user)
        # Move up one level
        if "/" in norm_parent:
            norm_parent = norm_parent.rsplit("/", 1)[0]
        else:
            norm_parent = ""
    return

# Legacy functions for backward compatibility
def require_owner_or_admin(path: str, db: Session, user=Depends(get_current_user)):
    """Legacy function - redirects to team-aware version"""
    return require_owner_or_admin_or_team_member(path, db, user)

def check_parent_permission(parent_path: str, db, user):
    """Legacy function - redirects to team-aware version"""
    return check_parent_permission_with_team_access(parent_path, db, user)
