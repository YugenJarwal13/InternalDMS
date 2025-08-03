#!/usr/bin/env python3
"""
Test script to verify the upload-folder-structure path logic works correctly
"""

def test_folder_path_logic():
    """Test the folder path calculation logic"""
    
    def calculate_folder_paths(parent_path, rel_folder_parts):
        """Simulate the folder path calculation logic from upload-folder-structure"""
        created_folders = set()
        
        for i in range(1, len(rel_folder_parts)+1):
            # Handle root parent path correctly
            parent_clean = parent_path.strip("/")
            if parent_clean:
                folder_path = "/" + "/".join([parent_clean] + rel_folder_parts[:i])
            else:
                folder_path = "/" + "/".join(rel_folder_parts[:i])
            # Remove any double slashes
            while "//" in folder_path:
                folder_path = folder_path.replace("//", "/")
            created_folders.add(folder_path)
        
        return sorted(created_folders)
    
    def calculate_folder_name(normalized_folder_path):
        """Simulate the folder name calculation logic"""
        import os
        
        folder_name = os.path.basename(normalized_folder_path.rstrip("/"))
        if not folder_name:
            path_parts = normalized_folder_path.strip("/").split("/")
            folder_name = path_parts[-1] if path_parts and path_parts[-1] else "root"
        
        return folder_name
    
    # Test cases
    test_cases = [
        {
            "name": "Upload to root with single folder",
            "parent_path": "/",
            "file_paths": ["testfolder/file1.txt", "testfolder/file2.txt"],
            "expected_folders": ["/testfolder"]
        },
        {
            "name": "Upload to root with nested folders",
            "parent_path": "/",
            "file_paths": ["folder1/subfolder1/file1.txt", "folder1/subfolder2/file2.txt"],
            "expected_folders": ["/folder1", "/folder1/subfolder1", "/folder1/subfolder2"]
        },
        {
            "name": "Upload to existing folder",
            "parent_path": "/existing",
            "file_paths": ["newfolder/file1.txt"],
            "expected_folders": ["/existing/newfolder"]
        },
        {
            "name": "Upload to root with empty parent",
            "parent_path": "",
            "file_paths": ["testfolder/file1.txt"],
            "expected_folders": ["/testfolder"]
        }
    ]
    
    print("Testing folder path calculation logic:")
    print("=" * 50)
    
    all_passed = True
    
    for test_case in test_cases:
        print(f"\nTest: {test_case['name']}")
        print(f"Parent path: {repr(test_case['parent_path'])}")
        print(f"File paths: {test_case['file_paths']}")
        
        # Extract unique folder parts from all file paths
        all_folder_parts = set()
        for file_path in test_case['file_paths']:
            folder_parts = file_path.split("/")[:-1]  # Remove filename
            if folder_parts:
                all_folder_parts.add(tuple(folder_parts))
        
        # Calculate folders for each unique folder structure
        actual_folders = set()
        for folder_parts in all_folder_parts:
            paths = calculate_folder_paths(test_case['parent_path'], list(folder_parts))
            actual_folders.update(paths)
        
        actual_folders = sorted(actual_folders)
        expected_folders = sorted(test_case['expected_folders'])
        
        print(f"Expected: {expected_folders}")
        print(f"Actual:   {actual_folders}")
        
        if actual_folders == expected_folders:
            print("✓ PASSED")
        else:
            print("✗ FAILED")
            all_passed = False
        
        # Test folder name calculation for each folder
        print("Folder names:")
        for folder_path in actual_folders:
            folder_name = calculate_folder_name(folder_path)
            print(f"  {folder_path} -> name: '{folder_name}'")
    
    print("\n" + "=" * 50)
    if all_passed:
        print("✓ All tests PASSED!")
    else:
        print("✗ Some tests FAILED!")
    
    return all_passed

if __name__ == "__main__":
    test_folder_path_logic()
