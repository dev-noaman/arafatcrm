import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import App from "./App";
import { useAuthStore } from "@/contexts/auth-store";
import "./index.css";

// Initialize auth state from localStorage before rendering
const token = localStorage.getItem("accessToken");
if (token) {
  console.log("[main.tsx] Found token in localStorage, decoding...");
  // Decode JWT to get user info (simplified - in production, validate properly)
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    console.log("[main.tsx] JWT payload:", payload);
    const user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name || null,
      role: payload.role as "ADMIN" | "SALES",
    };
    console.log("[main.tsx] Setting user in auth store:", user);
    useAuthStore.getState().setUser(user);
  } catch (e) {
    console.error("[main.tsx] Failed to decode token:", e);
    localStorage.removeItem("accessToken");
    useAuthStore.getState().setUser(null);
  }
} else {
  console.log("[main.tsx] No token found, user is logged out");
  useAuthStore.getState().setUser(null);
}

console.log("[main.tsx] Creating QueryClient");
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

console.log("[main.tsx] QueryClient created, rendering App");
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
