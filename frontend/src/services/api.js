// src/services/api.js

export const loginUser = async ({ email, password }) => {
  const response = await fetch('http://localhost:8000/api/users/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password
    })
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.detail || 'Login failed');
  }

  const data = await response.json();

  // Optional: If you want to store bearer token immediately
  localStorage.setItem('accessToken', data.access_token);
  return data;
};

export const addUser = async ({ email, password, role }) => {
  const token = localStorage.getItem('accessToken');
  const response = await fetch('http://localhost:8000/api/users/admin-create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ email, password, role })
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.detail || 'Add user failed');
  }
  return response.json();
};

export const editUser = async ({ id, email, password, role }) => {
  const token = localStorage.getItem('accessToken');
  const response = await fetch(`http://localhost:8000/api/users/admin-edit/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ email, password, role })
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.detail || 'Edit user failed');
  }
  return response.json();
};
