import { Outlet, Navigate } from "react-router-dom";
import { useAuthStore } from "@/contexts/auth-store";

export default function DashboardLayout() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar placeholder */}
      <aside className="w-64 border-r bg-white p-4">
        <div className="mb-8 text-xl font-bold">ArafatCRM</div>
        <nav className="space-y-2">
          <a href="/dashboard" className="block rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-100">
            Dashboard
          </a>
          <a href="/clients" className="block rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-100">
            Clients
          </a>
          <a href="/brokers" className="block rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-100">
            Brokers
          </a>
          <a href="/deals" className="block rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-100">
            Deals
          </a>
          <a href="/reports" className="block rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-100">
            Reports
          </a>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b bg-white px-6 py-4">
          <h1 className="text-lg font-semibold">Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">User</span>
            <button
              onClick={() => {
                localStorage.removeItem("accessToken");
                window.location.href = "/auth/login";
              }}
              className="text-sm text-red-600 hover:underline"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
