# backend/routers/system.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from dependencies import get_current_user, require_admin
import psutil
import os
import platform
import datetime
import time
from models import User

router = APIRouter()

# Store the server start time
SERVER_START_TIME = time.time()

@router.get("/health")
def get_system_health(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    """
    Get system health metrics (admin only)
    """
    try:
        # Calculate server uptime
        uptime_seconds = time.time() - SERVER_START_TIME
        uptime_days = int(uptime_seconds // (24 * 3600))
        uptime_hours = int((uptime_seconds % (24 * 3600)) // 3600)
        uptime_minutes = int((uptime_seconds % 3600) // 60)
        uptime_formatted = f"{uptime_days}d {uptime_hours}h {uptime_minutes}m"
        
        # Get CPU and memory usage
        cpu_percent = psutil.cpu_percent(interval=0.5)
        memory = psutil.virtual_memory()
        memory_used_gb = round(memory.used / (1024 ** 3), 2)
        memory_total_gb = round(memory.total / (1024 ** 3), 2)
        memory_percent = memory.percent
        
        # Get system load averages (1, 5, 15 minutes)
        try:
            if platform.system() == "Windows":
                # Windows doesn't have load averages, use CPU as substitute
                load_avg = [cpu_percent / 100]
            else:
                load_avg = [round(x, 2) for x in psutil.getloadavg()]
        except Exception:
            load_avg = [0.0]
        
        # Get network information
        try:
            net_io = psutil.net_io_counters()
            net_sent_mb = round(net_io.bytes_sent / (1024 * 1024), 2)
            net_recv_mb = round(net_io.bytes_recv / (1024 * 1024), 2)
        except Exception:
            net_sent_mb = 0
            net_recv_mb = 0
            
        # Get process information
        current_process = psutil.Process()
        process_uptime = time.time() - current_process.create_time()
        process_uptime_formatted = f"{int(process_uptime // 3600)}h {int((process_uptime % 3600) // 60)}m"
        
        # Simulate response time (in a real system, you'd use actual metrics)
        response_time = round(psutil.cpu_percent(interval=0.1) / 20, 2)  # Simulated response time based on current CPU
        
        # Get disk usage for the storage directory
        storage_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "storage")
        if os.path.exists(storage_path):
            disk_usage = psutil.disk_usage(storage_path)
            storage_used_gb = round(disk_usage.used / (1024 ** 3), 2)
            storage_total_gb = round(disk_usage.total / (1024 ** 3), 2)
            storage_percent = disk_usage.percent
        else:
            storage_used_gb = 0
            storage_total_gb = 0
            storage_percent = 0
        
        # Count total users
        user_count = db.query(User).count()
        
        return {
            "server": {
                "uptime": uptime_formatted,
                "platform": platform.platform(),
                "response_time": f"{response_time} ms"
            },
            "resources": {
                "cpu_usage": f"{cpu_percent}%",
                "memory_usage": f"{memory_used_gb} GB / {memory_total_gb} GB ({memory_percent}%)",
                "storage_usage": f"{storage_used_gb} GB / {storage_total_gb} GB ({storage_percent}%)"
            },
            "status": {
                "system_load": {
                    "status": "Normal" if (load_avg[0] < 0.7) else "High",
                    "load_average": f"{load_avg[0]:.2f}" if len(load_avg) > 0 else "N/A",
                    "process_uptime": process_uptime_formatted
                },
                "database": {
                    "status": "Connected",
                    "storage_size": f"{storage_used_gb} GB / {storage_total_gb} GB",
                    "active_connections": db.bind.pool.size() if hasattr(db.bind, 'pool') and hasattr(db.bind.pool, 'size') else "N/A"
                }
            },
            "users": {
                "total_users": user_count
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving system health: {str(e)}")
