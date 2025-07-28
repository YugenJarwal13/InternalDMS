from database import SessionLocal, engine
from models import File
import os

db = SessionLocal()
storage_dir = os.path.abspath('storage')

print(f'Storage directory path: {storage_dir}')
print('\nFinding and cleaning up missing folders and files in database...')

# Find and delete folder entries that don't exist on disk
missing_folders = []
for f in db.query(File).filter(File.is_folder == True).all():
    disk_path = os.path.join(storage_dir, f.path.strip('/'))
    if not os.path.exists(disk_path):
        missing_folders.append((f.id, f.path, f.name))
        
print(f'Found {len(missing_folders)} missing folders in database')

# Find and delete file entries that don't exist on disk
missing_files = []
for f in db.query(File).filter(File.is_folder == False).all():
    disk_path = os.path.join(storage_dir, f.path.strip('/'))
    if not os.path.exists(disk_path):
        missing_files.append((f.id, f.path, f.name))
        
print(f'Found {len(missing_files)} missing files in database')

# Ask for confirmation
confirm = input(f"Do you want to delete these {len(missing_folders)} folders and {len(missing_files)} files from the database? (y/n): ")

if confirm.lower() == 'y':
    # Delete the missing folders
    for id, path, name in missing_folders:
        folder = db.query(File).filter(File.id == id).first()
        if folder:
            print(f"Deleting folder from DB: {id}: {path} (name: {name})")
            db.delete(folder)
    
    # Delete the missing files
    for id, path, name in missing_files:
        file = db.query(File).filter(File.id == id).first()
        if file:
            print(f"Deleting file from DB: {id}: {path} (name: {name})")
            db.delete(file)
    
    # Commit changes
    db.commit()
    print("Database cleanup completed successfully")
else:
    print("Operation cancelled")

db.close()
