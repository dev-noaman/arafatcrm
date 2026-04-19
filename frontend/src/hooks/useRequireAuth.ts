import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/contexts/auth-store";

export function useRequireAuth() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth/login", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  return { isAuthenticated, isLoading };
}
