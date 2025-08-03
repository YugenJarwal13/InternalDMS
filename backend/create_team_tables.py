#!/usr/bin/env python3
"""
Migration Script: Create Teams and UserTeamAccess Tables
Run this script to add team-based authorization tables to your database.
"""

from sqlalchemy import create_engine, text
from database import DATABASE_URL
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def run_migration():
    """Create the teams and user_team_access tables"""
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as connection:
        # Start transaction
        trans = connection.begin()
        
        try:
            print("Creating teams table...")
            connection.execute(text("""
                CREATE TABLE IF NOT EXISTS teams (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR NOT NULL UNIQUE,
                    folder_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            
            print("Creating user_team_access table...")
            connection.execute(text("""
                CREATE TABLE IF NOT EXISTS user_team_access (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
                    granted_by INTEGER NOT NULL REFERENCES users(id),
                    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, team_id)
                );
            """))
            
            print("Creating indexes...")
            connection.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_teams_folder_id ON teams(folder_id);
                CREATE INDEX IF NOT EXISTS idx_user_team_access_user_id ON user_team_access(user_id);
                CREATE INDEX IF NOT EXISTS idx_user_team_access_team_id ON user_team_access(team_id);
            """))
            
            # Commit transaction
            trans.commit()
            print("✅ Migration completed successfully!")
            
        except Exception as e:
            # Rollback on error
            trans.rollback()
            print(f"❌ Migration failed: {e}")
            raise

if __name__ == "__main__":
    run_migration()
