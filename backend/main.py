# backend/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import files, folders, users
from routers import remote
from routers import logs
from routers import authorize
from routers import system

app = FastAPI()

# main.py (temporary block after app = FastAPI())
from database import Base, engine
import models

models.Base.metadata.create_all(bind=engine)


# Enable CORS so frontend can talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Later restrict to your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers (modular structure)

app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(files.router, prefix="/api/files", tags=["Files"])
app.include_router(folders.router, prefix="/api/folders", tags=["Folders"])
app.include_router(remote.router)
app.include_router(logs.router, prefix="/api", tags=["Logs"])
app.include_router(authorize.router, prefix="/api", tags=["Authorization"])
app.include_router(system.router, prefix="/api/system", tags=["System"])


@app.get("/")
def read_root():
    return {"message": "DMS Backend is running ✅"}

