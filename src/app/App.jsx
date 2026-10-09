import Routing from "@/app/Router.jsx"
import { AuthProvider } from "@/context/AuthContext.jsx"
import { NotificationProvider } from "@/context/NotificationContext.jsx"
import { TelemetryProvider } from "@/context/TelemetryContext.jsx"
import { MissionProvider } from "@/context/MissionContext.jsx"
import { FlyActionConfirmProvider } from "@/context/FlyActionConfirmContext.jsx"
import { BackendInfoProvider } from "@/context/BackendInfoContext.jsx"
import GlobalAlertContainer from "@/components/notification/GlobalAlertContainer.jsx"

function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <TelemetryProvider>
          <MissionProvider>
            <FlyActionConfirmProvider>
              <BackendInfoProvider>
                <GlobalAlertContainer />
                <Routing />
              </BackendInfoProvider>
            </FlyActionConfirmProvider>
          </MissionProvider>
        </TelemetryProvider>
      </AuthProvider>
    </NotificationProvider>
  )
}

export default App

