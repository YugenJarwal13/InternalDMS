# backend/routers/teams.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from database import get_db
from dependencies import require_admin, get_current_user
from models import Team, UserTeamAccess, User, File as FileModel, ActivityLog
from utils import log_activity
import os

router = APIRouter(prefix="/api/teams", tags=["teams"])

# Schemas
class TeamCreate(BaseModel):
    name: str

class TeamResponse(BaseModel):
    id: int
    name: str
    folder_id: int
    folder_path: str
    created_at: str
    
    class Config:
        from_attributes = True

class UserTeamResponse(BaseModel):
    id: int
    email: str
    granted_at: str
    granted_by_email: str

class TeamWithUsers(TeamResponse):
    users: List[UserTeamResponse]

class AssignUserRequest(BaseModel):
    user_id: int


# Create Team (Admin only)
@router.post("/", response_model=TeamResponse)
def create_team(
    team_data: TeamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Create a new team and its corresponding folder"""
    
    # Check if team name already exists
    existing_team = db.query(Team).filter(Team.name == team_data.name).first()
    if existing_team:
        raise HTTPException(status_code=400, detail="Team name already exists")
    
    # Create the team folder in filesystem
    storage_path = os.getenv("STORAGE_PATH", "./storage")
    team_folder_path = os.path.join(storage_path, team_data.name)
    
    try:
        os.makedirs(team_folder_path, exist_ok=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create team folder: {str(e)}")
    
    # Create folder entry in database
    folder_entry = FileModel(
        name=team_data.name,
        path=f"/{team_data.name}",
        is_folder=True,
        size=0,
        owner_id=current_user.id
    )
    db.add(folder_entry)
    db.flush()  # Get the ID
    
    # Create team entry
    team = Team(
        name=team_data.name,
        folder_id=folder_entry.id
    )
    db.add(team)
    db.commit()
    
    # Log activity
    log_activity(
        db=db,
        user_id=current_user.id,
        action="create_team",
        target_path=f"/{team_data.name}",
        details=f"Created team: {team_data.name}"
    )
    
    return TeamResponse(
        id=team.id,
        name=team.name,
        folder_id=team.folder_id,
        folder_path=folder_entry.path,
        created_at=team.created_at.isoformat()
    )


# List all teams (Admin only)
@router.get("/", response_model=List[TeamWithUsers])
def list_teams(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """List all teams with their users"""
    
    teams = db.query(Team).all()
    result = []
    
    for team in teams:
        # Get team folder info
        folder = db.query(FileModel).filter(FileModel.id == team.folder_id).first()
        
        # Get users assigned to this team
        user_accesses = db.query(UserTeamAccess).filter(UserTeamAccess.team_id == team.id).all()
        users = []
        
        for access in user_accesses:
            user = db.query(User).filter(User.id == access.user_id).first()
            granted_by_user = db.query(User).filter(User.id == access.granted_by).first()
            
            if user and granted_by_user:
                users.append(UserTeamResponse(
                    id=user.id,
                    email=user.email,
                    granted_at=access.granted_at.isoformat(),
                    granted_by_email=granted_by_user.email
                ))
        
        result.append(TeamWithUsers(
            id=team.id,
            name=team.name,
            folder_id=team.folder_id,
            folder_path=folder.path if folder else "",
            created_at=team.created_at.isoformat(),
            users=users
        ))
    
    return result


# Assign user to team (Admin only)
@router.post("/{team_id}/users")
def assign_user_to_team(
    team_id: int,
    request: AssignUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Assign a user to a team"""
    
    # Check if team exists
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Check if user exists
    user = db.query(User).filter(User.id == request.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user is already assigned
    existing_access = db.query(UserTeamAccess).filter(
        UserTeamAccess.user_id == request.user_id,
        UserTeamAccess.team_id == team_id
    ).first()
    
    if existing_access:
        raise HTTPException(status_code=400, detail="User is already assigned to this team")
    
    # Create the assignment
    user_access = UserTeamAccess(
        user_id=request.user_id,
        team_id=team_id,
        granted_by=current_user.id
    )
    db.add(user_access)
    db.commit()
    
    # Log activity
    log_activity(
        db=db,
        user_id=current_user.id,
        action="assign_user_to_team",
        target_path=f"/teams/{team.name}",
        details=f"Assigned user {user.email} to team {team.name}"
    )
    
    return {"message": f"User {user.email} assigned to team {team.name}"}


# Remove user from team (Admin only)
@router.delete("/{team_id}/users/{user_id}")
def remove_user_from_team(
    team_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Remove a user from a team"""
    
    # Check if team exists
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Find and remove the assignment
    user_access = db.query(UserTeamAccess).filter(
        UserTeamAccess.user_id == user_id,
        UserTeamAccess.team_id == team_id
    ).first()
    
    if not user_access:
        raise HTTPException(status_code=404, detail="User is not assigned to this team")
    
    db.delete(user_access)
    db.commit()
    
    # Log activity
    log_activity(
        db=db,
        user_id=current_user.id,
        action="remove_user_from_team",
        target_path=f"/teams/{team.name}",
        details=f"Removed user {user.email} from team {team.name}"
    )
    
    return {"message": f"User {user.email} removed from team {team.name}"}


# Delete team (Admin only)
@router.delete("/{team_id}")
def delete_team(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Delete a team and its folder"""
    
    # Check if team exists
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Get team folder
    folder = db.query(FileModel).filter(FileModel.id == team.folder_id).first()
    team_name = team.name
    
    # Remove team folder from filesystem
    if folder:
        storage_path = os.getenv("STORAGE_PATH", "./storage")
        team_folder_path = os.path.join(storage_path, team_name)
        
        try:
            import shutil
            if os.path.exists(team_folder_path):
                shutil.rmtree(team_folder_path)
        except Exception as e:
            # Log but don't fail the deletion
            print(f"Warning: Failed to delete team folder: {str(e)}")
    
    # Delete team (this will cascade delete user_team_access entries)
    db.delete(team)
    
    # Delete folder entry if it exists
    if folder:
        db.delete(folder)
    
    db.commit()
    
    # Log activity
    log_activity(
        db=db,
        user_id=current_user.id,
        action="delete_team",
        target_path=f"/teams/{team_name}",
        details=f"Deleted team: {team_name}"
    )
    
    return {"message": f"Team {team_name} deleted successfully"}


# Get teams for current user (for frontend access checks)
@router.get("/for-user", response_model=List[TeamResponse])
def get_user_teams(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get teams that the current user has access to"""
    
    # Admin can access all teams
    if current_user.role.name == "admin":
        teams = db.query(Team).all()
    else:
        # Get teams user has explicit access to
        team_ids = db.query(UserTeamAccess.team_id).filter(
            UserTeamAccess.user_id == current_user.id
        ).all()
        team_ids = [t[0] for t in team_ids]
        teams = db.query(Team).filter(Team.id.in_(team_ids)).all()
    
    result = []
    for team in teams:
        folder = db.query(FileModel).filter(FileModel.id == team.folder_id).first()
        result.append(TeamResponse(
            id=team.id,
            name=team.name,
            folder_id=team.folder_id,
            folder_path=folder.path if folder else "",
            created_at=team.created_at.isoformat()
        ))
    
    return result
