import Routing from "@/app/Router.jsx"
import { AuthProvider } from "@/context/AuthContext.jsx"
import { TelemetryProvider } from "@/context/TelemetryContext.jsx"

function App() {
  return (
    <AuthProvider>
      <TelemetryProvider>
        <Routing />
      </TelemetryProvider>
    </AuthProvider>
  )
}

export default App

