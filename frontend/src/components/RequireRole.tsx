import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/contexts/auth-store";

export default function RequireRole({ role, children }: { role: string; children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (user?.role !== role) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
