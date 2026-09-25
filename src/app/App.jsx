import Routing from "@/app/Router.jsx"
import { AuthProvider } from "@/context/AuthContext.jsx"
import { TelemetryProvider } from "@/context/TelemetryContext.jsx"
import { MissionProvider } from "@/context/MissionContext.jsx"
import { FlyActionConfirmProvider } from "@/context/FlyActionConfirmContext.jsx"

function App() {
  return (
    <AuthProvider>
      <TelemetryProvider>
        <MissionProvider>
          <FlyActionConfirmProvider>
            <Routing />
          </FlyActionConfirmProvider>
        </MissionProvider>
      </TelemetryProvider>
    </AuthProvider>
  )
}

export default App

