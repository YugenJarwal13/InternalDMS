from database import SessionLocal, engine
from models import File
import os

db = SessionLocal()
storage_dir = os.path.abspath('storage')

print(f'Storage directory path: {storage_dir}')

# Set to hold all paths in the database
db_paths = set()
for f in db.query(File).all():
    db_paths.add(f.path)

print('\nDisk entries with missing database counterparts:')
missing_count = 0

def check_recursive(dir_path, rel_path):
    global missing_count
    for item in os.listdir(dir_path):
        item_path = os.path.join(dir_path, item)
        rel_item_path = os.path.join(rel_path, item).replace('\\', '/')
        normalized_path = '/' + rel_item_path
        
        if normalized_path not in db_paths:
            print(f'Missing in DB: {normalized_path}')
            missing_count += 1
            
        if os.path.isdir(item_path):
            check_recursive(item_path, rel_item_path)

# Start recursive check
for top_dir in os.listdir(storage_dir):
    top_dir_path = os.path.join(storage_dir, top_dir)
    if os.path.isdir(top_dir_path):
        check_recursive(top_dir_path, top_dir)

print(f'\nTotal items missing in database: {missing_count}')

db.close()
