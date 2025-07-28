from database import SessionLocal, engine
from models import File
import os

db = SessionLocal()
storage_dir = os.path.abspath('storage')

print(f'Storage directory path: {storage_dir}')
print('\nFolder entries with missing disk counterparts:')
missing_count = 0
for f in db.query(File).filter(File.is_folder == True).all():
    disk_path = os.path.join(storage_dir, f.path.strip('/'))
    if not os.path.exists(disk_path):
        print(f'Missing on disk: {f.id}: {f.path} (name: {f.name})')
        missing_count += 1
print(f'\nTotal missing folders: {missing_count}')

print('\nFile entries with missing disk counterparts:')
missing_count = 0
for f in db.query(File).filter(File.is_folder == False).all():
    disk_path = os.path.join(storage_dir, f.path.strip('/'))
    if not os.path.exists(disk_path):
        print(f'Missing on disk: {f.id}: {f.path} (name: {f.name})')
        missing_count += 1
print(f'\nTotal missing files: {missing_count}')

db.close()
