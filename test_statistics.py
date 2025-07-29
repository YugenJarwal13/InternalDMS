import requests
import json
import os

# Configuration
BASE_URL = "http://localhost:8000"  # Backend URL
TOKEN = ""  # Will be populated after login

def login():
    """Authenticate and get a token"""
    global TOKEN
    login_url = f"{BASE_URL}/api/users/login"
    
    # Replace with valid credentials
    credentials = {
        "email": "admin@example.com",  # Update with your admin email
        "password": "admin123"  # Update with your admin password
    }
    
    response = requests.post(login_url, json=credentials)
    
    if response.status_code == 200:
        result = response.json()
        TOKEN = result.get("access_token")
        print(f"Login successful. Token: {TOKEN[:10]}...")
        return True
    else:
        print(f"Login failed: {response.status_code} - {response.text}")
        return False

def test_statistics_endpoint():
    """Test the folder statistics endpoint"""
    if not TOKEN:
        if not login():
            return
    
    headers = {
        "Authorization": f"Bearer {TOKEN}"
    }
    
    print(f"\nTesting statistics endpoint")
    stats_url = f"{BASE_URL}/api/folders/statistics"
    
    response = requests.get(stats_url, headers=headers)
    
    if response.status_code == 200:
        result = response.json()
        print(f"Statistics retrieved successfully:")
        print(f"Total folders: {result.get('total_folders')}")
        
        # Print details of first 3 folders (if available)
        stats = result.get('statistics', [])
        for i, folder in enumerate(stats[:3]):
            print(f"\nFolder {i+1}:")
            print(f"  Name: {folder.get('folder_name')}")
            print(f"  Path: {folder.get('path')}")
            print(f"  Owner: {folder.get('owner')}")
            print(f"  Subfolders: {folder.get('subfolder_count')}")
            print(f"  Files: {folder.get('file_count')}")
            print(f"  Size: {folder.get('size_formatted')}")
            
        if len(stats) > 3:
            print(f"\n... and {len(stats) - 3} more folders")
    else:
        print(f"Error getting statistics: {response.status_code} - {response.text}")


if __name__ == "__main__":
    test_statistics_endpoint()
