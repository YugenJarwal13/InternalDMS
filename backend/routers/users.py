# backend/routers/users.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User, Role
from schemas import UserCreate, TokenResponse
from auth import get_password_hash, verify_password, create_access_token
from dependencies import get_current_user, require_admin
from utils import log_activity

router = APIRouter()


@router.post("/signup")
def signup(user: UserCreate, db: Session = Depends(get_db)):
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

    # ✅ Log signup activity
    log_activity(db, new_user.id, action="Signup", target_path="auth/signup")

    return {"msg": "User created successfully", "id": new_user.id, "email": new_user.email}


@router.post("/login", response_model=TokenResponse)
def login(user: UserCreate, db: Session = Depends(get_db)):
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

    # ✅ Log admin viewing all users
    log_activity(db, admin.id, action="Viewed All Users", target_path="user/all")

    return [{"id": u.id, "email": u.email, "role": u.role.name} for u in users]
