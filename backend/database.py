# backend/database.py

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()  # Loads from .env file

DATABASE_URL = os.getenv("DATABASE_URL")

# Ensure PostgreSQL URL is configured
if not DATABASE_URL:
    raise ValueError("DATABASE_URL must be set in .env file for PostgreSQL connection")

# Create engine with PostgreSQL
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
