import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "@/layout/mainlayout.jsx";

import Dashboard from "@/features/dashboard/pages/dashboard.jsx";
import FlyPage from "@/features/fly/pages/FlyPage.jsx";
import MissionDetailsPage from "@/features/mession/pages/MissionDetailsPage.jsx";
import WaypointPlanningPage from "@/features/mession/pages/WaypointPlanningPage.jsx";
import CreateGeofencePage from "@/features/mession/pages/CreateGeofencePage.jsx";
import Logs from "@/features/logs/pages/Logs.jsx";
import SettingsPage from "@/features/settings/pages/SettingsPage.jsx";
import UsersPage from "@/features/users/pages/UsersPage.jsx";
import Landing from "@/features/landing/pages/landingPage.jsx";
import Login from "@/features/auth/pages/Login.jsx";

import ProtectedRoute from "@/components/auth/ProtectedRoute.jsx";
import { Permissions } from "@/auth/permissions.js";
import { Roles } from "@/auth/roleConfig.js";

const Routing = () => {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/landing" element={<Landing />} />
      <Route path="/login" element={<Login />} />

      {/* Authenticated GCS Application Layout */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
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

        {/* Logs Route (Protected by VIEW_LOGS) */}
        <Route
          path="/logs"
          element={
            <ProtectedRoute requiredPermission={Permissions.VIEW_LOGS}>
              <Logs />
            </ProtectedRoute>
          }
        />

        {/* Settings Route (Protected by SYSTEM_CONFIG: Super Admin only) */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute requiredPermission={Permissions.SYSTEM_CONFIG}>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={<Navigate to="/settings" replace />}
        />

        {/* User Management Route (Protected: Super Admin + Fleet Manager) */}
        <Route
          path="/users"
          element={
            <ProtectedRoute allowedRoles={[Roles.SUPER_ADMIN, Roles.FLEET_MANAGER]}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        {/* Redirect legacy /user-management to canonical /users */}
        <Route
          path="/user-management"
          element={<Navigate to="/users" replace />}
        />
      </Route>
    </Routes>
  );
};

export default Routing;
