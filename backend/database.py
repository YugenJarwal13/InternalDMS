# backend/database.py

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()  # Loads from .env file

DATABASE_URL = os.getenv("DATABASE_URL")

# Fallback to SQLite if PostgreSQL is not available
if not DATABASE_URL:
    DATABASE_URL = "sqlite:///./test.db"

try:
    engine = create_engine(DATABASE_URL)
    # Test the connection
    engine.connect()
except Exception as e:
    print(f"PostgreSQL connection failed: {e}")
    print("Falling back to SQLite...")
    DATABASE_URL = "sqlite:///./test.db"
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency for routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
