import requests

BASE_URL = "http://127.0.0.1:8000"

# Test folder creation with remark
folder_payload = {
    "name": "test_folder_remark",
    "parent_path": "/",
    "remark": "This is a test remark for folder creation."
}
folder_resp = requests.post(f"{BASE_URL}/api/folders/create", json=folder_payload)
print("Folder creation response:", folder_resp.status_code, folder_resp.json())

# Test file upload with remark (requires an existing folder and a test file)
# We'll create a dummy file for upload
with open("dummy.txt", "w") as f:
    f.write("This is a dummy file for upload test.")

with open("dummy.txt", "rb") as file_data:
    files = {"files": ("dummy.txt", file_data)}
    data = {"parent_path": "/test_folder_remark", "remark": "This is a test remark for file upload."}
    upload_resp = requests.post(f"{BASE_URL}/api/files/upload", data=data, files=files)
    print("File upload response:", upload_resp.status_code, upload_resp.json()) 