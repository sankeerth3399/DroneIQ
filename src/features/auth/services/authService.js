/**
 * Re-export centralized Authentication Service for AeroNexus Ground Control Station (GCS)
 */
import { authService } from "@/services/api/authService.js"

export const loginOperator = async ({ email, username, password, role, rememberDevice }) => {
  const loginUser = username || email

  const { user, token } = await authService.login({
    username: loginUser,
    password,
  })

  if (rememberDevice) {
    localStorage.setItem("aeronexus_remembered_email", loginUser)
  } else {
    localStorage.removeItem("aeronexus_remembered_email")
  }

  return {
    ...user,
    token,
    isAuthenticated: "true",
  }
}

export const loginWithSSO = async () => {
  await new Promise((resolve) => setTimeout(resolve, 600))
  return { provider: "SAML_OIDC", status: "pending_idp_redirect" }
}

export default authService
