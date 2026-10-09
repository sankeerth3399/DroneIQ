import LoginForm from "../components/LoginForm.jsx"
import { useNavigate } from "react-router-dom"

/**
 * Standalone Login Page for direct navigation to /login.
 * Composes LoginForm in a full-screen aerospace viewport.
 */
export const Login = () => {
  const navigate = useNavigate()

  return (
    <div className="gcs-auth-page min-h-[100dvh] w-full flex items-center justify-center p-3 sm:p-4 select-none font-sans">
      <LoginForm showCloseButton onCancel={() => navigate("/")} />
    </div>
  )
}

export default Login
