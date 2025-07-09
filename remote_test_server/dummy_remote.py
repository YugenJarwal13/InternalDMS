from fastapi import FastAPI, UploadFile, File, Query, Form, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from typing import List
import os, shutil

app = FastAPI()

BASE_PATH = "dummy_remote"
os.makedirs(BASE_PATH, exist_ok=True)

@app.get("/list")
async def list_files(path: str = Query("/")):
    try:
        files = os.listdir(BASE_PATH)
        return {"path": path, "files": files}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/upload")
async def upload_files(
    parent_path: str = Form(...),
    files: List[UploadFile] = File(...)
):
    try:
        saved = []
        for file in files:
            file_path = os.path.join(BASE_PATH, file.filename)
            with open(file_path, "wb") as f:
                content = await file.read()
                f.write(content)
            saved.append(file.filename)
        return {"uploaded": saved}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/download")
async def download_file(path: str = Query(...)):
    file_path = os.path.join(BASE_PATH, os.path.basename(path))
    if not os.path.isfile(file_path):
        return JSONResponse(status_code=404, content={"error": "File not found"})
    return FileResponse(file_path, filename=os.path.basename(path))

@app.delete("/delete")
async def delete_file(path: str = Query(...)):
    try:
        file_path = os.path.join(BASE_PATH, os.path.basename(path))
        if os.path.isfile(file_path):
            os.remove(file_path)
            return {"deleted": os.path.basename(path)}
        else:
            return JSONResponse(status_code=404, content={"error": "File not found"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/move")
async def move_item(source_path: str = Form(...), destination_path: str = Form(...)):
    source = os.path.join(BASE_PATH, source_path.strip("/"))
    destination = os.path.join(BASE_PATH, destination_path.strip("/"))

    if not os.path.exists(source):
        raise HTTPException(status_code=404, detail="Source does not exist")

    os.makedirs(os.path.dirname(destination), exist_ok=True)
    shutil.move(source, destination)
    return {"detail": f"Moved from {source_path} to {destination_path}"}
