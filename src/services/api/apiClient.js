import { API_BASE_URL, buildApiUrl } from "@/config/env.js"

export const TOKEN_STORAGE_KEY = "aeronexus_jwt_token"
export const USER_STORAGE_KEY = "aeronexus_user"

/**
 * Centralized REST API Client
 * - Automatic Authorization: Bearer <token> injection
 * - Deduplicated endpoint URL resolution via buildApiUrl
 * - Differentiated 401 handling (login invalid credentials vs protected session expiration)
 * - Standardized error extraction matching DroneIQ Spring Boot contract
 */
export async function apiClient(endpoint, options = {}) {
  const url = buildApiUrl(endpoint)
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
  } catch {
    const error = new Error(`Network connection error: Unable to reach backend at ${API_BASE_URL}`)
    error.isNetworkError = true
    error.status = 0
    throw error
  }

  // Check if this request is the login endpoint
  const isAuthEndpoint =
    typeof endpoint === "string" &&
    (endpoint.includes("/auth/login") || endpoint.includes("/auth/register"))

  // Handle 401 Unauthorized (Expired or Invalid JWT on PROTECTED endpoints only)
  if (response.status === 401) {
    if (!isAuthEndpoint && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("aeronexus:toast", {
          detail: {
            message: "Session expired. Please sign in again.",
            type: "warning",
          },
        })
      )
      window.dispatchEvent(new CustomEvent("aeronexus:unauthorized"))
    }
  }

  // Handle 403 Forbidden (Access Denied)
  if (response.status === 403) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("aeronexus:toast", {
          detail: {
            message: "Access Denied: You do not have permission to perform this action.",
            type: "error",
          },
        })
      )
      window.dispatchEvent(new CustomEvent("aeronexus:forbidden"))
    }
  }

  let responseData
  const contentType = response.headers.get("content-type")
  try {
    if (contentType && contentType.includes("application/json")) {
      responseData = await response.json()
    } else {
      responseData = await response.text()
    }
  } catch {
    responseData = null
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

