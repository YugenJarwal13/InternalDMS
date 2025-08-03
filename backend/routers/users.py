# backend/routers/users.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User, Role, ActivityLog
from schemas import UserCreate, TokenResponse
from pydantic import BaseModel
from auth import get_password_hash, verify_password, create_access_token
from dependencies import get_current_user, require_admin
from utils import log_activity
from schemas import UserLogin
from fastapi.encoders import jsonable_encoder
from datetime import datetime, timedelta

router = APIRouter()


class UserEdit(BaseModel):
    email: str
    password: str
    role: str


@router.post("/login", response_model=TokenResponse)
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token(data={"sub": str(db_user.id)})

    # ✅ Log login activity
    log_activity(db, db_user.id, action="Login", target_path="auth/login")

    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me")
def get_my_profile(user = Depends(get_current_user)):
    # ✅ Log profile view activity
    return {"email": user.email, "role": user.role.name}


@router.delete("/delete-user/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), admin = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()

    # ✅ Log user deletion activity
    log_activity(db, admin.id, action="Deleted User", target_path=f"user/{user_id}")

    return {"message": f"User with ID {user_id} deleted successfully"}


@router.get("/all")
def list_users(admin = Depends(require_admin), db: Session = Depends(get_db)):
    users = db.query(User).all()

    # Check for duplicate logging within the last 5 seconds to prevent React strict mode double calls
    recent_log = db.query(ActivityLog).filter(
        ActivityLog.user_id == admin.id,
        ActivityLog.action == "Viewed All Users",
        ActivityLog.timestamp >= datetime.utcnow() - timedelta(seconds=5)
    ).first()
    
    # Only log if no recent identical activity found
    if not recent_log:
        log_activity(db, admin.id, action="Viewed All Users", target_path="user/all")

    return [{"id": u.id, "email": u.email, "role": u.role.name} for u in users]

# Admin-only: Create user
@router.post("/admin-create")
def admin_create_user(user: UserCreate, db: Session = Depends(get_db), admin = Depends(require_admin)):
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    role = db.query(Role).filter(Role.name == user.role).first()
    if not role:
        raise HTTPException(status_code=400, detail="Invalid role")

    hashed_pw = get_password_hash(user.password)

    new_user = User(
        email=user.email,
        hashed_password=hashed_pw,
        role_id=role.id
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    log_activity(db, admin.id, action="Admin Created User", target_path=f"user/{new_user.id}")

    return {"msg": "User created successfully", "id": new_user.id, "email": new_user.email}

# Admin-only: Edit user
@router.put("/admin-edit/{user_id}")
def admin_edit_user(user_id: int, user: UserEdit, db: Session = Depends(get_db), admin = Depends(require_admin)):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    if db_user.email != user.email:
        # Check for email conflict
        if db.query(User).filter(User.email == user.email).first():
            raise HTTPException(status_code=400, detail="Email already registered")
        db_user.email = user.email

    if user.password:
        db_user.hashed_password = get_password_hash(user.password)

    role = db.query(Role).filter(Role.name == user.role).first()
    if not role:
        raise HTTPException(status_code=400, detail="Invalid role")
    db_user.role_id = role.id

    db.commit()
    db.refresh(db_user)

    log_activity(db, admin.id, action="Admin Edited User", target_path=f"user/{user_id}")

    return {"msg": "User updated successfully", "id": db_user.id, "email": db_user.email}
