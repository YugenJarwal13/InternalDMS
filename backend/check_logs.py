from database import SessionLocal
from models import ActivityLog

db = SessionLocal()
latest_logs = db.query(ActivityLog).order_by(ActivityLog.id.desc()).limit(2).all()

for log in reversed(latest_logs):
    print(f'Activity log: ID={log.id}, Action={log.action}, Path={log.target_path}, Details={log.details}')

db.close()
