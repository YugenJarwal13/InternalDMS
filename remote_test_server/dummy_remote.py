from fastapi import FastAPI, UploadFile, File, Query, Form, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from typing import List, Optional
import os, shutil
from datetime import datetime
import mimetypes

app = FastAPI()

BASE_PATH = "dummy_remote"
os.makedirs(BASE_PATH, exist_ok=True)

def get_file_info(file_path: str, relative_path: str):
    """Get standardized file information"""
    stat = os.stat(file_path)
    is_folder = os.path.isdir(file_path)
    
    return {
        "name": os.path.basename(relative_path) or relative_path,
        "path": relative_path,
        "is_folder": is_folder,
        "size": stat.st_size if not is_folder else 0,
        "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
        "modified_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        "mime_type": mimetypes.guess_type(file_path)[0] if not is_folder else None
    }

@app.get("/list")
async def list_files(path: str = Query("/")):
    """List files and folders in the specified path"""
    try:
        # Normalize path
        normalized_path = path.strip("/")
        full_path = os.path.join(BASE_PATH, normalized_path) if normalized_path else BASE_PATH
        
        if not os.path.exists(full_path):
            raise HTTPException(status_code=404, detail="Path not found")
        
        if not os.path.isdir(full_path):
            raise HTTPException(status_code=400, detail="Path is not a directory")
        
        items = []
        for item_name in sorted(os.listdir(full_path)):
            item_path = os.path.join(full_path, item_name)
            relative_path = os.path.join(normalized_path, item_name).replace("\\", "/")
            if normalized_path == "":
                relative_path = item_name
            else:
                relative_path = f"{normalized_path}/{item_name}"
            
            # Add leading slash for consistency
            if not relative_path.startswith("/"):
                relative_path = "/" + relative_path
                
            items.append(get_file_info(item_path, relative_path))
        
        return items
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload")
async def upload_files(
    parent_path: str = Form("/"),
    files: List[UploadFile] = File(...)
):
    """Upload files to the specified parent path"""
    try:
        # Normalize parent path
        normalized_parent = parent_path.strip("/")
        upload_dir = os.path.join(BASE_PATH, normalized_parent) if normalized_parent else BASE_PATH
        
        # Create directory if it doesn't exist
        os.makedirs(upload_dir, exist_ok=True)
        
        uploaded_files = []
        for file in files:
            if not file.filename:
                continue
                
            file_path = os.path.join(upload_dir, file.filename)
            
            # Handle duplicate filenames
            counter = 1
            original_path = file_path
            while os.path.exists(file_path):
                name, ext = os.path.splitext(original_path)
                file_path = f"{name}_{counter}{ext}"
                counter += 1
            
            # Save file
            with open(file_path, "wb") as f:
                content = await file.read()
                f.write(content)
            
            # Create relative path for response
            relative_path = os.path.relpath(file_path, BASE_PATH).replace("\\", "/")
            if not relative_path.startswith("/"):
                relative_path = "/" + relative_path
                
            uploaded_files.append({
                "name": os.path.basename(file_path),
                "path": relative_path,
                "size": len(content)
            })
        
        return {
            "uploaded_files": uploaded_files,
            "count": len(uploaded_files)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/download")
async def download_file(path: str = Query(...)):
    """Download a file from the specified path"""
    try:
        # Normalize path
        normalized_path = path.strip("/")
        file_path = os.path.join(BASE_PATH, normalized_path)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")
        
        if os.path.isdir(file_path):
            raise HTTPException(status_code=400, detail="Cannot download a directory")
        
        return FileResponse(
            file_path, 
            filename=os.path.basename(file_path),
            media_type='application/octet-stream'
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/delete")
async def delete_item(path: str = Query(...)):
    """Delete a file or folder at the specified path"""
    try:
        # Normalize path
        normalized_path = path.strip("/")
        item_path = os.path.join(BASE_PATH, normalized_path)
        
        if not os.path.exists(item_path):
            raise HTTPException(status_code=404, detail="Item not found")
        
        item_name = os.path.basename(item_path)
        is_folder = os.path.isdir(item_path)
        
        if is_folder:
            shutil.rmtree(item_path)
        else:
            os.remove(item_path)
        
        return {
            "deleted": item_name,
            "path": path,
            "is_folder": is_folder
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/move")
async def move_item(source_path: str = Form(...), destination_path: str = Form(...)):
    """Move or rename a file/folder from source to destination"""
    try:
        # Normalize paths
        normalized_source = source_path.strip("/")
        normalized_dest = destination_path.strip("/")
        
        source_full = os.path.join(BASE_PATH, normalized_source)
        dest_full = os.path.join(BASE_PATH, normalized_dest)
        
        if not os.path.exists(source_full):
            raise HTTPException(status_code=404, detail="Source item not found")
        
        # Create destination directory if needed
        dest_dir = os.path.dirname(dest_full)
        if dest_dir and not os.path.exists(dest_dir):
            os.makedirs(dest_dir, exist_ok=True)
        
        # Check if destination already exists
        if os.path.exists(dest_full):
            raise HTTPException(status_code=409, detail="Destination already exists")
        
        # Perform the move
        shutil.move(source_full, dest_full)
        
        return {
            "moved": True,
            "source_path": source_path,
            "destination_path": destination_path,
            "item_name": os.path.basename(dest_full)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/create-folder")
async def create_folder(
    parent_path: str = Form("/"),
    folder_name: str = Form(...)
):
    """Create a new folder"""
    try:
        # Normalize parent path
        normalized_parent = parent_path.strip("/")
        parent_full = os.path.join(BASE_PATH, normalized_parent) if normalized_parent else BASE_PATH
        
        folder_path = os.path.join(parent_full, folder_name)
        
        if os.path.exists(folder_path):
            raise HTTPException(status_code=409, detail="Folder already exists")
        
        os.makedirs(folder_path, exist_ok=True)
        
        # Create relative path for response
        relative_path = os.path.relpath(folder_path, BASE_PATH).replace("\\", "/")
        if not relative_path.startswith("/"):
            relative_path = "/" + relative_path
        
        return {
            "created": True,
            "folder_name": folder_name,
            "path": relative_path,
            "parent_path": parent_path
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/metadata")
async def get_metadata(path: str = Query(...)):
    """Get detailed metadata for a file or folder"""
    try:
        # Normalize path
        normalized_path = path.strip("/")
        item_path = os.path.join(BASE_PATH, normalized_path)
        
        if not os.path.exists(item_path):
            raise HTTPException(status_code=404, detail="Item not found")
        
        return get_file_info(item_path, path)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9000)
