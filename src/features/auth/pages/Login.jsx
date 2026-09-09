import LoginForm from "../components/LoginForm.jsx"

/**
 * Standalone Login Page for direct navigation to /login.
 * Composes LoginForm in a full-screen aerospace viewport.
 */
export const Login = () => {
  return (
    <div className="min-h-screen w-full bg-[#080B12] flex items-center justify-center p-4 sm:p-6 select-none font-sans">
      <LoginForm />
    </div>
  )
}

export default Login
