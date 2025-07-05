# backend/seed_roles.py

from sqlalchemy.orm import Session
from database import SessionLocal
from models import Role

def seed_roles():
    db: Session = SessionLocal()

    roles_to_seed = ["admin", "user"]

    for role_name in roles_to_seed:
        existing = db.query(Role).filter_by(name=role_name).first()
        if not existing:
            new_role = Role(name=role_name)
            db.add(new_role)
            print(f"✅ Added role: {role_name}")
        else:
            print(f"🔁 Role already exists: {role_name}")

    db.commit()
    db.close()

if __name__ == "__main__":
    seed_roles()
