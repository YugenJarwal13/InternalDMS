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

  const res = await fetch(fullUrl, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    // Token expired or unauthorized
    localStorage.removeItem("accessToken");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  return res.json();
};
