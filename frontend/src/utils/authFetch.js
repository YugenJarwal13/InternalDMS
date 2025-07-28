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
      
      const err = new Error("Unauthorized");
      err.status = 401;
      throw err;
    }
    
    if (res.status === 403) {
      // Forbidden
      const data = isJson ? await res.json().catch(() => ({})) : {};
      const message = data.detail || 'Not Authorized';
      const err = new Error(message);
      err.status = 403;
      throw err;
    }
    
    if (res.status === 404) {
      // Not found
      const err = new Error(`Endpoint not found: ${url}`);
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
    return isJson ? await res.json() : {};
  } catch (error) {
    console.error(`Fetch error for ${fullUrl}:`, error);
    throw error;
  }
};
