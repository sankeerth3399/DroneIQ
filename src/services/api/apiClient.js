import { API_BASE_URL } from "@/config/env.js"

export const TOKEN_STORAGE_KEY = "aeronexus_jwt_token"
export const USER_STORAGE_KEY = "aeronexus_user"

/**
 * Centralized REST API Client
 * - Automatic Authorization: Bearer <token> injection
 * - Centralized 401 handling & session expiration broadcast
 * - Standardized error extraction
 */
export async function apiClient(endpoint, options = {}) {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_STORAGE_KEY) : null

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  }

  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const config = {
    ...options,
    headers,
  }

  let response
  try {
    response = await fetch(url, config)
  } catch (netErr) {
    const error = new Error(`Network connection error: Unable to reach backend at ${API_BASE_URL}`)
    error.isNetworkError = true
    error.status = 0
    throw error
  }

  // Handle 401 Unauthorized (Expired or Invalid JWT)
  if (response.status === 401) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("aeronexus:unauthorized"))
    }
  }

  let responseData = null
  const contentType = response.headers.get("content-type")
  if (contentType && contentType.includes("application/json")) {
    try {
      responseData = await response.json()
    } catch {
      responseData = null
    }
  } else {
    try {
      responseData = await response.text()
    } catch {
      responseData = null
    }
  }

  if (!response.ok) {
    const errorMessage =
      (responseData && typeof responseData === "object" && (responseData.message || responseData.error)) ||
      `Request failed with status ${response.status} (${response.statusText})`
    const error = new Error(errorMessage)
    error.status = response.status
    error.data = responseData
    throw error
  }

  return responseData
}

export default apiClient
