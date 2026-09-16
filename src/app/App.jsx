import Routing from "@/app/Router.jsx"
import { AuthProvider } from "@/context/AuthContext.jsx"
import { TelemetryProvider } from "@/context/TelemetryContext.jsx"
import { MissionProvider } from "@/context/MissionContext.jsx"

function App() {
  return (
    <AuthProvider>
      <TelemetryProvider>
        <MissionProvider>
          <Routing />
        </MissionProvider>
      </TelemetryProvider>
    </AuthProvider>
  )
}

export default App

