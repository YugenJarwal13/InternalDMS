# DMS Statistics Feature Documentation

## Overview

The statistics feature provides insights into the folder structure and content of the Document Management System. It displays important metrics for each folder including:

- Folder name
- Owner
- Number of subfolders
- Number of files
- Total folder size

The statistics are collected directly from the file system rather than relying on database records, ensuring accurate and up-to-date information.

## Components

### Backend Implementation

The backend API endpoint is located in `backend/routers/folders.py` and provides folder statistics with the following functionality:

- `GET /api/folders/statistics` - Returns statistics for all folders in the storage directory

The endpoint performs the following operations:
1. Uses the base storage directory as the root path
2. Retrieves all immediate subfolders of the root path
3. For each subfolder:
   - Counts all files and subfolders recursively
   - Calculates the total size of all files
   - Retrieves owner information from the database if available
4. Returns the formatted statistics in a sorted list

### Frontend Implementation

The frontend component is located in `frontend/src/components/FileManager/StatisticsTable.jsx` and provides:

- A sortable table view of folder statistics
- Column sorting by clicking on column headers
- Error handling with fallback to mock data if the backend is unavailable

## Usage

1. Navigate to the Dashboard page
2. The statistics table will appear showing folder statistics for all top-level folders
3. Sort the table by clicking on any column header
   - Click again to toggle between ascending and descending order

## Technical Notes

- The statistics are gathered in real-time and not cached
- For large folder structures, the operation may take some time to complete
- The endpoint only counts immediate subfolders of the root path, not all nested folders
- File sizes are formatted for human readability (bytes, KB, MB, GB)
- In development mode, mock data will be displayed if the backend is unavailable

## Security Considerations

- The endpoint validates paths to prevent directory traversal attacks
- Only authenticated users can access statistics
- The API follows the same permission model as other folder operations

## Future Enhancements

Potential improvements for the statistics feature include:

1. Caching mechanism for frequently accessed statistics
2. Additional metrics like file types, creation dates, etc.
3. Visual charts and graphs to represent the data
4. Exporting statistics to CSV or Excel
5. Periodic statistics generation and historical tracking
