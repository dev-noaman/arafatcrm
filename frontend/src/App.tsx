import { Routes, Route, Navigate } from "react-router-dom";
import AuthLayout from "@/layouts/AuthLayout";
import DashboardLayout from "@/layouts/DashboardLayout";
import LoginPage from "@/pages/auth/LoginPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import ClientsPage from "@/pages/clients/ClientsPage";
import BrokersPage from "@/pages/brokers/BrokersPage";
import DealsPage from "@/pages/deals/DealsPage";
import PipelinePage from "@/pages/deals/PipelinePage";
import ReportsPage from "@/pages/reports/ReportsPage";
import UsersPage from "@/pages/users/UsersPage";
import ProfilePage from "@/pages/profile/ProfilePage";
import RequireRole from "@/components/RequireRole";
import OfficerndPage from "@/pages/officernd/OfficerndPage";

console.log("[App.tsx] Rendering App component");

function App() {
  console.log("[App.tsx] App function called");
  return (
    <Routes>
      <Route path="/auth" element={<AuthLayout />}>
        <Route path="login" element={<LoginPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
      </Route>

      <Route path="/" element={<DashboardLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="brokers" element={<BrokersPage />} />
        <Route path="deals" element={<DealsPage />} />
        <Route path="pipeline" element={<PipelinePage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="users" element={<RequireRole role="ADMIN"><UsersPage /></RequireRole>} />
        <Route path="officernd" element={<RequireRole role="ADMIN"><OfficerndPage /></RequireRole>} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
