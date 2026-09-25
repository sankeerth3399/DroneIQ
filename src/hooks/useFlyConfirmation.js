import { useContext } from "react";
import { FlyActionConfirmContext } from "@/context/flyActionConfirmContextCore.js";

export const useFlyConfirmation = () => {
  const ctx = useContext(FlyActionConfirmContext);
  if (!ctx) {
    throw new Error("useFlyConfirmation must be used within a FlyActionConfirmProvider");
  }
  return ctx;
};

export default useFlyConfirmation;
