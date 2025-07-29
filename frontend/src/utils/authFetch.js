export const authFetch = async (url, options = {}) => {
  const token = localStorage.getItem("accessToken");
  if (!token) throw new Error("No token found");

  // Prepend backend URL for all /api/ requests
  let fullUrl = url;
  if (url.startsWith('/api/')) {
    fullUrl = 'http://localhost:8000' + url;
  }

  // Only set Content-Type if not sending FormData
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
  };
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const debug = process.env.NODE_ENV === 'development';
  if (debug) {
    console.log(`📡 Fetching: ${fullUrl}`);
  }

  try {
    const res = await fetch(fullUrl, {
      ...options,
      headers,
    });

    // Check if response is JSON
    const contentType = res.headers.get("content-type");
    const isJson = contentType && contentType.includes("application/json");

    if (res.status === 401) {
      // Token expired or unauthorized - clear token and redirect
      localStorage.removeItem("accessToken");
      
      // Only redirect if not already on the login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = "/login";
      }
      
      const err = new Error("Unauthorized - Please log in again");
      err.status = 401;
      throw err;
    }
    
    if (res.status === 403) {
      // Forbidden
      const data = isJson ? await res.json().catch(() => ({})) : {};
      const message = data.detail || 'You do not have permission to access this resource';
      const err = new Error(message);
      err.status = 403;
      throw err;
    }
    
    if (res.status === 404) {
      // Not found
      const err = new Error(`Resource not found: ${url}`);
      err.status = 404;
      throw err;
    }
    
    if (!res.ok) {
      // Other errors
      const data = isJson ? await res.json().catch(() => ({})) : {};
      const message = data.detail || `Error: ${res.status} ${res.statusText}`;
      const err = new Error(message);
      err.status = res.status;
      throw err;
    }
    
    // Return JSON data or empty object if not JSON
    const data = isJson ? await res.json() : {};
    
    if (debug) {
      console.log(`✅ Response from ${fullUrl}:`, data);
    }
    
    return data;
  } catch (error) {
    // Check if it's a network error (e.g., server not running)
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      console.error(`⚠️ Network error for ${fullUrl} - Is the backend server running?`);
      // Return mock data for statistics endpoint in development mode
      if (debug && url.includes('/api/folders/statistics')) {
        console.info('🔄 Using mock data for statistics');
        return {
          root_path: '/',
          total_folders: 3,
          statistics: [
            {
              folder_name: "Documents",
              path: "/Documents",
              subfolder_count: 5,
              file_count: 12,
              total_size: 1024 * 1024 * 3.2,
              size_formatted: "3.2 MB",
              owner: "admin@example.com"
            },
            {
              folder_name: "Images",
              path: "/Images",
              subfolder_count: 8,
              file_count: 45,
              total_size: 1024 * 1024 * 15.7,
              size_formatted: "15.7 MB",
              owner: "user@example.com"
            },
            {
              folder_name: "Projects",
              path: "/Projects",
              subfolder_count: 12,
              file_count: 78,
              total_size: 1024 * 1024 * 250,
              size_formatted: "250.0 MB",
              owner: "admin@example.com"
            }
          ]
        };
      }
    }
    
    console.error(`❌ Fetch error for ${fullUrl}:`, error);
    throw error;
  }
};
