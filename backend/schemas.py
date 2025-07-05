from pydantic import BaseModel
from typing import Optional

class UserCreate(BaseModel):
    email: str
    password: str
    role: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str

# backend/schemas.py


class FolderCreate(BaseModel):
    name: str
    parent_path: Optional[str] = "/"

from pydantic import BaseModel

class RenameFolderRequest(BaseModel):
    old_path: str
    new_name: str

#schema for moving folders
# schemas.py

from pydantic import BaseModel

class MoveFolderRequest(BaseModel):
    source_path: str
    destination_path: str


#schema for moving files
class MoveFileRequest(BaseModel):
    source_path: str
    destination_path: str
