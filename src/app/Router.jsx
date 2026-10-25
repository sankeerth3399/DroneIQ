import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "@/layout/mainlayout.jsx";

import Dashboard from "@/features/dashboard/pages/CommandCenterOperational.jsx";
import FlyPage from "@/features/fly/pages/FlyPage.jsx";
import MissionPlanningPage from "@/features/mession/pages/MissionPlanningPage.jsx";
import MissionsPage from "@/features/mession/pages/MissionsPage.jsx";
import GeofencePage from "@/features/mession/pages/GeofencePage.jsx";
import MissionDetailsPage from "@/features/mession/pages/MissionDetailsPage.jsx";
import WaypointPlanningPage from "@/features/mession/pages/WaypointPlanningPage.jsx";
import CreateGeofencePage from "@/features/mession/pages/CreateGeofencePage.jsx";
import Logs from "@/features/logs/pages/Logs.jsx";
import SettingsPage from "@/features/settings/pages/SettingsPage.jsx";
import UsersPage from "@/features/users/pages/UsersPage.jsx";
import AdministrationPage from "@/features/admin/pages/AdministrationPage.jsx";
import AnalyticsPage from "@/features/analytics/pages/AnalyticsPage.jsx";
import ReportsPage from "@/features/reports/pages/ReportsPage.jsx";
import IncidentsPage from "@/features/incidents/pages/IncidentsPage.jsx";
import Landing from "@/features/landing/pages/landingPage.jsx";
import Login from "@/features/auth/pages/Login.jsx";

import ProtectedRoute from "@/components/auth/ProtectedRoute.jsx";
import { Permissions } from "@/auth/permissions.js";
import { Roles } from "@/auth/roleConfig.js";

import LiveOperationsPage from "@/features/operations/pages/LiveOperationsPage.jsx";
import RemotePilotPage from "@/features/operations/pages/RemotePilotPage.jsx";
import SwarmControlPage from "@/features/operations/pages/SwarmControlPage.jsx";
import DroneFleetPage from "@/features/operations/pages/DroneFleetPage.jsx";
import PayloadsSensorsPage from "@/features/operations/pages/PayloadsSensorsPage.jsx";
import GeofencingAirspacePage from "@/features/mession/pages/GeofencingAirspacePage.jsx";

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

        {/* Mission Planning Workflow Routes */}
        <Route path="/mission-planning" element={<MissionPlanningPage />} />
        <Route path="/missions/planning" element={<MissionPlanningPage />} />
        <Route path="/plan" element={<Navigate to="/mission-planning" replace />} />

        {/* Dedicated Missions Management Route */}
        <Route path="/missions" element={<MissionsPage />} />
        <Route path="/mission" element={<Navigate to="/missions" replace />} />
        <Route path="/missions/details" element={<MissionDetailsPage />} />

        {/* Dedicated Geofence Routes -> Redirects into Mission Planning Safety (Subsection 1) */}
        <Route path="/geofence" element={<Navigate to="/mission-planning" state={{ step: 4, subSection: "geofence" }} replace />} />
        <Route path="/missions/geofence" element={<Navigate to="/mission-planning" state={{ step: 4, subSection: "geofence" }} replace />} />

        {/* Dedicated Waypoint Planning Routes -> Redirects into Mission Planning Safety (Subsection 2) */}
        <Route path="/waypoint-planning" element={<Navigate to="/mission-planning" state={{ step: 4, subSection: "waypoints" }} replace />} />
        <Route path="/missions/waypoints" element={<Navigate to="/mission-planning" state={{ step: 4, subSection: "waypoints" }} replace />} />
        <Route path="/waypts" element={<Navigate to="/mission-planning" state={{ step: 4, subSection: "waypoints" }} replace />} />
        <Route path="/waypoints" element={<Navigate to="/mission-planning" state={{ step: 4, subSection: "waypoints" }} replace />} />

        {/* Live Operations & Cockpit */}
        <Route path="/live-operations" element={<LiveOperationsPage />} />
        <Route path="/live" element={<Navigate to="/live-operations" replace />} />

        {/* Remote Pilot Cockpit */}
        <Route path="/remote-pilot" element={<RemotePilotPage />} />

        {/* Swarm Control Workspace */}
        <Route path="/swarm-control" element={<SwarmControlPage />} />
        <Route path="/swarm" element={<Navigate to="/swarm-control" replace />} />

        {/* Drone Fleet Asset Management */}
        <Route path="/drone-fleet" element={<DroneFleetPage />} />
        <Route path="/fleet" element={<Navigate to="/drone-fleet" replace />} />

        {/* Payloads & Sensors Management */}
        <Route path="/payloads-sensors" element={<PayloadsSensorsPage />} />
        <Route path="/payloads" element={<Navigate to="/payloads-sensors" replace />} />
        <Route path="/sensors" element={<Navigate to="/payloads-sensors" replace />} />

        {/* Dedicated Geofencing & Airspace Route */}
        <Route path="/geofencing-airspace" element={<GeofencingAirspacePage />} />
        <Route path="/airspace" element={<Navigate to="/geofencing-airspace" replace />} />

        {/* Logs Route (Protected by VIEW_LOGS) */}
        <Route
          path="/logs"
          element={
            <ProtectedRoute requiredPermission={Permissions.VIEW_LOGS}>
              <Logs />
            </ProtectedRoute>
          }
        />

        {/* Administration Central Control Route */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdministrationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/administration"
          element={<Navigate to="/admin" replace />}
        />

        {/* Settings & System Config -> Administration Integrations tab */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <AdministrationPage initialTab="integrations" />
            </ProtectedRoute>
          }
        />

        {/* Operational Analytics & Telemetry Intelligence */}
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <AnalyticsPage />
            </ProtectedRoute>
          }
        />

        {/* Mission, Fleet & Compliance Reports */}
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <ReportsPage />
            </ProtectedRoute>
          }
        />

        {/* Incidents & Alerts Route */}
        <Route
          path="/incidents"
          element={
            <ProtectedRoute requiredPermission={Permissions.VIEW_INCIDENTS}>
              <IncidentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/alerts"
          element={<Navigate to="/incidents" replace />}
        />

        {/* User Management Route -> Administration Users & Roles tab */}
        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <AdministrationPage initialTab="users" />
            </ProtectedRoute>
          }
        />
        {/* Redirect legacy /user-management to canonical /admin */}
        <Route
          path="/user-management"
          element={<Navigate to="/admin?tab=users" replace />}
        />
      </Route>
    </Routes>
  );
};

export default Routing;
