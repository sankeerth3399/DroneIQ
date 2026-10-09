import { useContext } from "react"
import { BackendInfoContext } from "@/context/backendInfoContextCore.js"

export const useBackendInfo = () => {
  const context = useContext(BackendInfoContext)
  if (!context) {
    throw new Error("useBackendInfo must be used within a BackendInfoProvider")
  }
  return context
}

export default useBackendInfo
