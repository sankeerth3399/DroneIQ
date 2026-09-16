import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "@/layout/mainlayout.jsx";

import Dashboard from "@/features/dashboard/pages/dashboard.jsx";
import FlyPage from "@/features/fly/pages/FlyPage.jsx";
import MissionDetailsPage from "@/features/mession/pages/MissionDetailsPage.jsx";
import WaypointPlanningPage from "@/features/mession/pages/WaypointPlanningPage.jsx";
import CreateGeofencePage from "@/features/mession/pages/CreateGeofencePage.jsx";
import Logs from "@/features/logs/pages/Logs.jsx";
import Landing from "@/features/landing/pages/landingPage.jsx";
import Login from "@/features/auth/pages/Login.jsx";

const Routing = () => {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/landing" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route element={<MainLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/fly" element={<FlyPage />} />
        
        {/* Mission Management Workflow Routes */}
        <Route path="/missions" element={<Navigate to="/missions/details" replace />} />
        <Route path="/missions/details" element={<MissionDetailsPage />} />
        <Route path="/missions/waypoints" element={<WaypointPlanningPage />} />
        <Route path="/missions/geofence" element={<CreateGeofencePage />} />
        <Route path="/mission" element={<Navigate to="/missions/details" replace />} />

        {/* Redirect any legacy standalone URLs to Missions workflow */}
        <Route path="/plan" element={<Navigate to="/missions/details" replace />} />
        <Route path="/waypts" element={<Navigate to="/missions/waypoints" replace />} />
        <Route path="/waypoints" element={<Navigate to="/missions/waypoints" replace />} />

        <Route path="/logs" element={<Logs />} />
      </Route>
    </Routes>
  );
};

export default Routing;
