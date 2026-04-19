import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { useAuthStore } from "@/contexts/auth-store";
import "./index.css";

// Initialize auth state from localStorage before rendering
const token = localStorage.getItem("accessToken");
if (token) {
  // Decode JWT to get user info (simplified - in production, validate properly)
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    useAuthStore.getState().setUser({
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    });
  } catch {
    localStorage.removeItem("accessToken");
    useAuthStore.getState().setUser(null);
  }
} else {
  useAuthStore.getState().setUser(null);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
