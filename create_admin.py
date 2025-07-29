import requests
import json

# Configuration
BASE_URL = "http://localhost:8000"  # Backend URL

def create_admin_user():
    """Create an admin user for testing"""
    signup_url = f"{BASE_URL}/api/users/signup"
    
    # Admin user details
    user_data = {
        "email": "admin@example.com",
        "password": "admin123",
        "role": "admin"  # This might not work if the API doesn't allow role selection during signup
    }
    
    response = requests.post(signup_url, json=user_data)
    
    print(f"Status code: {response.status_code}")
    print(f"Response: {response.text}")

if __name__ == "__main__":
    create_admin_user()
