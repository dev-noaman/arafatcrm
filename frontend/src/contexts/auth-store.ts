import { create } from "zustand";
import type { User } from "@/types/auth";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => {
    console.log("[auth-store] setUser called with:", user);
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    });
    console.log("[auth-store] State after setUser:", { user, isAuthenticated: !!user });
  },
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => {
    console.log("[auth-store] logout called");
    localStorage.removeItem("accessToken");
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },
}));
