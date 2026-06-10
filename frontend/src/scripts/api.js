// API Configuration
// Set your Azure TimelogAPI URL here
const API_BASE_URL = import.meta.env.VITE_API_URL || "https://your-azure-timelogapi-url.azurewebsites.net";

// Helper function to get auth token from localStorage
function getAuthToken() {
  return localStorage.getItem("auth_token");
}

// Helper function to set auth token
function setAuthToken(token) {
  localStorage.setItem("auth_token", token);
}

// Helper function to clear auth token
function clearAuthToken() {
  localStorage.removeItem("auth_token");
}

// Generic fetch wrapper with error handling
async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearAuthToken();
        // Redirect to login if needed
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

// ===== Authentication APIs =====
async function login(email, password) {
  return apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

async function register(email, password, displayName) {
  return apiFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, displayName }),
  });
}

async function logout() {
  clearAuthToken();
  return Promise.resolve();
}

// ===== TimeLogs APIs =====
async function getTimeLogs(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const endpoint = `/api/timelogs${queryString ? `?${queryString}` : ""}`;
  return apiFetch(endpoint);
}

async function getTimeLog(id) {
  return apiFetch(`/api/timelogs/${id}`);
}

async function createTimeLog(data) {
  return apiFetch("/api/timelogs", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

async function updateTimeLog(id, data) {
  return apiFetch(`/api/timelogs/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

async function deleteTimeLog(id) {
  return apiFetch(`/api/timelogs/${id}`, {
    method: "DELETE",
  });
}

// ===== Categories APIs =====
async function getCategories() {
  return apiFetch("/api/categories");
}

async function createCategory(name, color = null) {
  return apiFetch("/api/categories", {
    method: "POST",
    body: JSON.stringify({ name, color }),
  });
}

async function updateCategory(id, name, color = null) {
  return apiFetch(`/api/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name, color }),
  });
}

async function deleteCategory(id) {
  return apiFetch(`/api/categories/${id}`, {
    method: "DELETE",
  });
}

// ===== SavedContent APIs =====
async function getSavedContent(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const endpoint = `/api/saved-content${queryString ? `?${queryString}` : ""}`;
  return apiFetch(endpoint);
}

async function createSavedContent(data) {
  return apiFetch("/api/saved-content", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

async function updateSavedContent(id, data) {
  return apiFetch(`/api/saved-content/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

async function deleteSavedContent(id) {
  return apiFetch(`/api/saved-content/${id}`, {
    method: "DELETE",
  });
}

export {
  API_BASE_URL,
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  apiFetch,
  // Auth
  login,
  register,
  logout,
  // TimeLogs
  getTimeLogs,
  getTimeLog,
  createTimeLog,
  updateTimeLog,
  deleteTimeLog,
  // Categories
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  // SavedContent
  getSavedContent,
  createSavedContent,
  updateSavedContent,
  deleteSavedContent,
};
