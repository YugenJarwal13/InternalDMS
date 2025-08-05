# InternalDMS - Document Management System

A comprehensive full-stack Document Management System built with **FastAPI** (backend) and **React** (frontend) with team-based authorization, file management, activity logging, and remote operations.

## 📑 Table of Contents

1. [Features](#-features)
2. [Technology Stack](#-technology-stack)
3. [Prerequisites](#-prerequisites)
4. [Installation & Setup](#-installation--setup)
5. [Configuration](#-configuration)
6. [Running the Application](#-running-the-application)
7. [API Documentation](#-api-documentation)
8. [Frontend Architecture](#-frontend-architecture)
9. [Database Models](#-database-models)
10. [Team-Based Authorization](#-team-based-authorization)
11. [File Operations](#-file-operations)
12. [Activity Logging](#-activity-logging)
13. [Deployment](#-deployment)
14. [Troubleshooting](#-troubleshooting)
15. [Contributing](#-contributing)

## 🚀 Features

### Core Features
- **User Authentication & Authorization** - JWT-based login with role-based access control
- **Team Management** - Create teams, assign users, manage folder permissions
- **File & Folder Operations** - Upload, download, move, rename, delete files and folders
- **Search & Filter** - Advanced search functionality with metadata filtering
- **Activity Logging** - Comprehensive audit trail of all user actions
- **System Health Monitoring** - Backend health checks and system statistics
- **Remote Operations** - File operations on remote storage systems

### User Interface
- **Responsive Design** - Built with Tailwind CSS for mobile and desktop
- **Dashboard** - Overview of system statistics and recent activities
- **File Manager** - Intuitive file browser with drag-and-drop support
- **User Management** - Admin interface for user creation and role management
- **Team Directory Management** - Assign users to teams and manage folder access
- **Activity Log Viewer** - Real-time activity monitoring with search and filtering

## 🛠 Technology Stack

### Backend
- **FastAPI** - Modern Python web framework for building APIs
- **PostgreSQL** - Primary database for data storage
- **SQLAlchemy** - Object-Relational Mapping (ORM)
- **JWT Authentication** - Secure token-based authentication
- **Uvicorn** - ASGI server for running FastAPI
- **Alembic** - Database migration tool

### Frontend
- **React 19** - Modern JavaScript library for building user interfaces
- **Vite** - Fast build tool and development server
- **React Router Dom** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Axios** - HTTP client for API requests
- **React Icons** - Icon library
- **React DatePicker** - Date selection component

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.8+** (for backend)
- **Node.js 16+** and **npm** (for frontend)
- **PostgreSQL 12+** (database)
- **Git** (for version control)

## 📦 Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd InternalDMS
```

### 2. Backend Setup

#### Step 1: Navigate to Backend Directory
```bash
cd backend
```

#### Step 2: Create Virtual Environment
```bash
# Windows
python -m venv myenv
myenv\Scripts\activate

# Linux/Mac
python3 -m venv myenv
source myenv/bin/activate
```

#### Step 3: Install Python Dependencies
```bash
pip install -r requirements.txt
```

#### Step 4: Database Setup
1. **Install PostgreSQL** and create a database:
```sql
CREATE DATABASE internaldms;
CREATE USER postgres WITH PASSWORD 'your_new_password';
GRANT ALL PRIVILEGES ON DATABASE internaldms TO postgres;
```

2. **Configure Environment Variables** - Create `.env` file:
```bash
cp .env.example .env  # If example exists, or create new .env
```

#### Step 5: Initialize Database
```bash
# Run database migrations and seed data
python seed_roles.py
python create_admin.py
```

### 3. Frontend Setup

#### Step 1: Navigate to Frontend Directory
```bash
cd ../frontend
```

#### Step 2: Install Dependencies
```bash
npm install
```

## ⚙️ Configuration

### Backend Configuration (`.env` file)

Create a `.env` file in the `backend` directory:

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/internaldms

# JWT Configuration
SECRET_KEY=your_super_secret_jwt_key_here_make_it_long_and_random
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Optional: Server Configuration
HOST=127.0.0.1
PORT=8000
```

### Environment Variables Explained

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/dbname` |
| `SECRET_KEY` | JWT signing secret (keep secure!) | Random 32+ character string |
| `ALGORITHM` | JWT algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiration time | `60` (1 hour) |

### Frontend Configuration

The frontend automatically connects to the backend at `http://localhost:8000`. To change this, modify the API base URL in frontend configuration files.

## 🚀 Running the Application

### Development Mode

#### 1. Start Backend Server
```bash
cd backend
# Activate virtual environment if not already activated
# Windows: myenv\Scripts\activate
# Linux/Mac: source myenv/bin/activate

uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The backend will be available at: `http://localhost:8000`
- API Documentation: `http://localhost:8000/docs`
- Alternative Docs: `http://localhost:8000/redoc`

#### 2. Start Frontend Development Server
```bash
cd frontend
npm run dev
```

The frontend will be available at: `http://localhost:5173`

### Production Mode

#### Backend (Production)
```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

#### Frontend (Production)
```bash
cd frontend
npm run build
npm run preview
```

## 📚 API Documentation

### Authentication Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users/login` | User login |
| GET | `/api/users/me` | Get current user info |

### User Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/all` | Get all users (admin) |
| POST | `/api/users/admin-create` | Create new user (admin) |
| PUT | `/api/users/admin-edit/{user_id}` | Edit user (admin) |
| DELETE | `/api/users/delete-user/{user_id}` | Delete user (admin) |

### Team Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/teams/` | Create new team |
| GET | `/teams/` | Get all teams |
| POST | `/teams/{team_id}/users` | Add user to team |
| DELETE | `/teams/{team_id}/users/{user_id}` | Remove user from team |
| DELETE | `/teams/{team_id}` | Delete team |
| GET | `/teams/for-user` | Get teams for current user |

### File Operations
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/files/upload` | Upload file |
| GET | `/api/files/download` | Download file |
| DELETE | `/api/files/delete` | Delete file |
| PUT | `/api/files/rename` | Rename file |
| PUT | `/api/files/move` | Move file |
| GET | `/api/files/search` | Search files |
| GET | `/api/files/filter` | Filter files |
| GET | `/api/files/metadata` | Get file metadata |

### Folder Operations
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/folders/create` | Create folder |
| GET | `/api/folders/list` | List folder contents |
| PUT | `/api/folders/rename` | Rename folder |
| DELETE | `/api/folders/delete` | Delete folder |
| PUT | `/api/folders/move` | Move folder |
| POST | `/api/folders/upload-folder-structure` | Upload folder structure |
| GET | `/api/folders/statistics` | Get folder statistics |

### Activity Logs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/logs/` | Get activity logs |
| GET | `/api/logs/search` | Search activity logs |

### System
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/system/health` | System health check |
| POST | `/api/authorize` | Authorization check |

### Remote Operations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/list` | List remote files |
| POST | `/api/upload` | Upload to remote |
| GET | `/api/download` | Download from remote |
| DELETE | `/api/delete` | Delete remote file |
| POST | `/api/move` | Move remote file |
| POST | `/api/create-folder` | Create remote folder |

## 🏗 Frontend Architecture

### Component Structure
```
src/
├── components/
│   ├── Layout/
│   │   └── MainLayout.jsx          # Main application layout
│   ├── FileManager/                # File management components
│   ├── UserManagement/             # User management components
│   ├── ActivityLog/                # Activity log components
│   ├── Remote/                     # Remote operations components
│   └── SystemHealth.jsx            # System health monitoring
├── pages/
│   ├── LoginPage.jsx               # Authentication page
│   ├── Dashboard.jsx               # Main dashboard
│   ├── Files.jsx                   # File manager page
│   ├── ActivityLogPage.jsx         # Activity log viewer
│   ├── UserManagementPage.jsx      # User management interface
│   ├── DirectoryManagementPage.jsx # Team directory management
│   └── Remote.jsx                  # Remote operations page
├── context/
│   └── UserContext.jsx             # User authentication context
├── services/                       # API service functions
├── utils/                          # Utility functions
└── App.jsx                         # Main application component
```

### Key Features

#### Protected Routes
All routes except `/login` require authentication. The app automatically redirects to login if no valid token is found.

#### User Context
The `UserContext` provides global user state management and authentication status throughout the application.

#### Responsive Design
Built with Tailwind CSS for responsive design that works on desktop, tablet, and mobile devices.

## 🗄 Database Models

### Core Models

#### User Model
```python
class User(Base):
    id: Integer (Primary Key)
    email: String (Unique)
    hashed_password: String
    created_at: DateTime
    role_id: Integer (Foreign Key to Role)
```

#### Role Model
```python
class Role(Base):
    id: Integer (Primary Key)
    name: String (Unique) # "admin" or "user"
```

#### File Model
```python
class File(Base):
    id: Integer (Primary Key)
    name: String
    path: String (Full relative path)
    is_folder: Boolean
    size: Integer (0 for folders)
    owner_id: Integer (Foreign Key to User)
    created_at: DateTime
    modified_at: DateTime
```

#### Team Model
```python
class Team(Base):
    id: Integer (Primary Key)
    name: String (Unique)
    folder_id: Integer (Foreign Key to File)
    created_at: DateTime
```

#### UserTeamAccess Model
```python
class UserTeamAccess(Base):
    id: Integer (Primary Key)
    user_id: Integer (Foreign Key to User)
    team_id: Integer (Foreign Key to Team)
    granted_by: Integer (Foreign Key to User)
    granted_at: DateTime
```

#### ActivityLog Model
```python
class ActivityLog(Base):
    id: Integer (Primary Key)
    user_id: Integer (Foreign Key to User)
    action: String
    target_path: String
    timestamp: DateTime
    details: String (Optional)
```

### Database Relationships

- **User** → **Role**: Many-to-One (users have one role)
- **User** → **File**: One-to-Many (users can own multiple files)
- **User** → **ActivityLog**: One-to-Many (users can have multiple activity logs)
- **Team** → **File**: Many-to-One (teams are associated with one folder)
- **User** ↔ **Team**: Many-to-Many (through UserTeamAccess)

## 🔐 Team-Based Authorization

### Authorization Levels

1. **Admin Users**: Full access to all files and folders
2. **File Owners**: Full access to files they own
3. **Team Members**: Access to team-assigned folders and their contents

### Permission Hierarchy

```
Admin > Owner > Team Member > No Access
```

### How Team Authorization Works

1. **Team Creation**: Admin creates a team and assigns it to a specific folder
2. **User Assignment**: Admin adds users to teams
3. **Access Control**: Users can access:
   - Files they own
   - Files in folders assigned to their teams
   - All subfolders and files within team folders

### Key Authorization Functions

#### `require_owner_or_admin_or_team_member()`
- Checks if user is admin, file owner, or team member
- Used for most file operations

#### `check_parent_permission_with_team_access()`
- Recursively checks parent folder permissions
- Ensures team access is inherited by subfolders

## 📁 File Operations

### Supported Operations

#### File Management
- **Upload**: Single or multiple file upload
- **Download**: File download with permission checks
- **Delete**: Remove files (owner/admin only)
- **Rename**: Change file names
- **Move**: Relocate files between folders
- **Search**: Find files by name or content
- **Filter**: Filter by file type, size, date

#### Folder Management
- **Create**: Make new folders
- **List**: Browse folder contents
- **Rename**: Change folder names
- **Delete**: Remove folders and contents
- **Move**: Relocate folders
- **Statistics**: Get folder size and file counts
- **Upload Structure**: Upload entire folder hierarchies

### File Storage

Files are stored in the `backend/storage/` directory with the following structure:
```
storage/
├── TeamName1/
│   ├── file1.pdf
│   └── subfolder/
├── TeamName2/
│   └── document.docx
└── UserFiles/
    └── personal_file.txt
```

## 📊 Activity Logging

### Logged Actions

The system automatically logs all user activities:

- **File Operations**: upload, download, delete, rename, move
- **Folder Operations**: create, delete, rename, move
- **User Actions**: login, user creation, role changes
- **Team Operations**: team creation, user assignments

### Log Structure

Each activity log entry contains:
- **User ID**: Who performed the action
- **Action Type**: What was done
- **Target Path**: What file/folder was affected
- **Timestamp**: When it happened
- **Details**: Additional context (optional)

### Viewing Logs

Admins can view activity logs through:
- **Activity Log Page**: Web interface with search and filtering
- **API Endpoints**: Direct API access for integration
- **Search Functionality**: Find specific actions or users

## 🚀 Deployment

### Production Deployment

#### 1. Environment Setup

**Backend**:
```bash
# Install dependencies
pip install -r requirements.txt

# Set production environment variables
export DATABASE_URL=postgresql://user:pass@prod-db:5432/internaldms
export SECRET_KEY=production-secret-key
export ACCESS_TOKEN_EXPIRE_MINUTES=60
```

**Frontend**:
```bash
# Build for production
npm run build

# The build files will be in the 'dist' directory
```

#### 2. Database Migration

```bash
# Run database setup
python seed_roles.py
python create_admin.py

# If using Alembic for migrations
alembic upgrade head
```

#### 3. Web Server Configuration

**Using Nginx (Recommended)**:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Using Docker**:

Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/internaldms
    depends_on:
      - db
  
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
  
  db:
    image: postgres:13
    environment:
      - POSTGRES_DB=internaldms
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

#### 4. Process Management

**Using systemd** (Linux):

Create `/etc/systemd/system/internaldms.service`:
```ini
[Unit]
Description=InternalDMS FastAPI app
After=network.target

[Service]
Type=exec
User=www-data
Group=www-data
WorkingDirectory=/path/to/InternalDMS/backend
ExecStart=/path/to/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable internaldms
sudo systemctl start internaldms
```

### Security Considerations

1. **Environment Variables**: Never commit `.env` files with production secrets
2. **CORS Settings**: Update CORS origins in production to your domain
3. **HTTPS**: Use SSL/TLS certificates for production
4. **Database Security**: Use strong passwords and restrict database access
5. **File Permissions**: Ensure proper file system permissions for storage directory

## 🔧 Troubleshooting

### Common Issues

#### Backend Issues

**Problem**: `DATABASE_URL must be set in .env file`
**Solution**: 
1. Create `.env` file in backend directory
2. Add `DATABASE_URL=postgresql://user:pass@localhost:5432/dbname`

**Problem**: `ModuleNotFoundError: No module named 'xyz'`
**Solution**:
1. Activate virtual environment
2. Install requirements: `pip install -r requirements.txt`

**Problem**: Database connection errors
**Solution**:
1. Ensure PostgreSQL is running
2. Check database credentials in `.env`
3. Verify database exists: `CREATE DATABASE internaldms;`

#### Frontend Issues

**Problem**: `npm: command not found`
**Solution**: Install Node.js from [nodejs.org](https://nodejs.org/)

**Problem**: Build fails
**Solution**:
1. Delete `node_modules`: `rm -rf node_modules`
2. Clear npm cache: `npm cache clean --force`
3. Reinstall: `npm install`

**Problem**: API connection errors
**Solution**:
1. Ensure backend is running on port 8000
2. Check CORS configuration in backend
3. Verify API endpoints in frontend code

#### Permission Issues

**Problem**: "Sorry not authorized" message
**Solution**:
1. Check user role (admin vs user)
2. Verify team assignments
3. Check file ownership
4. Review activity logs for permission denials

**Problem**: Team access not working
**Solution**:
1. Ensure user is assigned to correct team
2. Verify team is assigned to correct folder
3. Check that folder exists in database
4. Review team-folder relationships

### Debugging Tips

#### Backend Debugging
```bash
# Check logs
uvicorn main:app --reload --log-level debug

# Test database connection
python -c "from database import engine; print(engine.execute('SELECT 1').scalar())"

# Check environment variables
python -c "import os; print(os.getenv('DATABASE_URL'))"
```

#### Frontend Debugging
```bash
# Check console for errors
# Open browser developer tools (F12)

# Verify API calls
# Check Network tab in developer tools

# Check local storage
localStorage.getItem('accessToken')
```

#### Database Debugging
```sql
-- Check users and roles
SELECT u.email, r.name FROM users u JOIN roles r ON u.role_id = r.id;

-- Check team assignments
SELECT u.email, t.name FROM users u 
JOIN user_team_access uta ON u.id = uta.user_id 
JOIN teams t ON uta.team_id = t.id;

-- Check file ownership
SELECT f.name, f.path, u.email FROM files f JOIN users u ON f.owner_id = u.id;
```

### Performance Optimization

#### Backend Optimization
1. **Database Indexing**: Add indexes on frequently queried columns
2. **Query Optimization**: Use database query profiling
3. **Caching**: Implement Redis for session caching
4. **File Serving**: Use nginx for static file serving

#### Frontend Optimization
1. **Code Splitting**: Implement lazy loading for routes
2. **Bundle Analysis**: Use `npm run build -- --analyze`
3. **Image Optimization**: Compress images and use WebP format
4. **Caching**: Implement service workers for offline capability

## 🤝 Contributing

### Development Workflow

1. **Fork the Repository**
2. **Create Feature Branch**: `git checkout -b feature/new-feature`
3. **Make Changes**: Follow coding standards
4. **Test Changes**: Run both backend and frontend tests
5. **Commit Changes**: Use descriptive commit messages
6. **Push Branch**: `git push origin feature/new-feature`
7. **Create Pull Request**: Describe changes and testing done

### Coding Standards

#### Backend (Python)
- Follow PEP 8 style guide
- Use type hints where appropriate
- Write docstrings for functions and classes
- Add error handling for all operations

#### Frontend (JavaScript/React)
- Use ESLint configuration provided
- Follow React best practices
- Use meaningful component and variable names
- Implement proper error boundaries

### Testing

#### Backend Testing
```bash
cd backend
python -m pytest tests/
```

#### Frontend Testing
```bash
cd frontend
npm test
```

### Code Review Checklist

- [ ] Code follows project conventions
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No security vulnerabilities introduced
- [ ] Performance impact considered
- [ ] Error handling implemented

## 📞 Support

For questions, issues, or contributions:

1. **Check Documentation**: Review this README and API docs
2. **Search Issues**: Look for existing solutions
3. **Create Issue**: Provide detailed description and steps to reproduce
4. **Community**: Join project discussions

## 📄 License

This project is licensed under the MIT License. See LICENSE file for details.

---

## 🎯 Quick Start Summary

**For Beginners**:

1. **Install Prerequisites**: Python 3.8+, Node.js 16+, PostgreSQL
2. **Clone & Setup**:
   ```bash
   git clone <repo-url>
   cd InternalDMS
   
   # Backend
   cd backend
   python -m venv myenv
   myenv\Scripts\activate  # Windows
   pip install -r requirements.txt
   
   # Frontend
   cd ../frontend
   npm install
   ```
3. **Configure Database**: Create PostgreSQL database and update `.env`
4. **Run Application**:
   ```bash
   # Terminal 1 - Backend
   cd backend && uvicorn main:app --reload
   
   # Terminal 2 - Frontend
   cd frontend && npm run dev
   ```
5. **Access Application**: Open `http://localhost:5173`

**Default Admin Account**: Create using `python create_admin.py`

This comprehensive Document Management System provides everything needed for secure, team-based file management with a modern, intuitive interface. Perfect for organizations needing controlled document access with detailed activity tracking.
