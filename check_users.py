from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
import sys

# Add the backend directory to the Python path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend'))
sys.path.append(backend_dir)

# Import the database models
from models import User, Role, Base

# Create database engine
DATABASE_URL = "sqlite:///./backend/test.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def check_users():
    """Check what users exist in the database"""
    db = SessionLocal()
    try:
        # Check if any users exist
        users = db.query(User).all()
        
        print(f"Found {len(users)} users in the database:")
        for user in users:
            role = db.query(Role).filter(Role.id == user.role_id).first()
            role_name = role.name if role else "Unknown"
            print(f"User ID: {user.id}, Email: {user.email}, Role: {role_name}")
        
        # Check available roles
        roles = db.query(Role).all()
        print(f"\nAvailable roles ({len(roles)}):")
        for role in roles:
            print(f"Role ID: {role.id}, Name: {role.name}")
    finally:
        db.close()

def create_admin_user():
    """Create an admin user if none exists"""
    db = SessionLocal()
    try:
        # Check if admin role exists
        admin_role = db.query(Role).filter(Role.name == "admin").first()
        if not admin_role:
            print("Creating admin role...")
            admin_role = Role(name="admin")
            db.add(admin_role)
            db.commit()
            db.refresh(admin_role)
        
        # Check if admin user exists
        admin_email = "admin@example.com"
        admin_exists = db.query(User).filter(User.email == admin_email).first()
        
        if admin_exists:
            print(f"Admin user already exists with ID: {admin_exists.id}")
            return
        
        # Import password hashing function
        from auth import get_password_hash
        
        # Create admin user
        from auth import get_password_hash
        admin_user = User(
            email=admin_email,
            hashed_password=get_password_hash("admin123"),
            role_id=admin_role.id
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        print(f"Created admin user with ID: {admin_user.id}")
    finally:
        db.close()

if __name__ == "__main__":
    check_users()
    create_admin_user()
    check_users()  # Check again after creating
