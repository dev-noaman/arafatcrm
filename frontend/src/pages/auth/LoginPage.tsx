import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { authApi } from "@/api/auth";
import { useAuthStore } from "@/contexts/auth-store";

interface LoginFormData {
  email: string;
  password: string;
}

export default function LoginPage() {
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    setError("");
    setIsLoading(true);

    try {
      const response = await authApi.login(data);
      localStorage.setItem("accessToken", response.accessToken);
      setUser(response.user);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const quickLogin = async (email: string, password: string) => {
    await onSubmit({ email, password });
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">ArafatCRM</h1>
        <p className="mb-6 text-gray-600">Sign in to your account</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              {...register("email", { required: "Email is required" })}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              {...register("password", { required: "Password is required" })}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
          </div>

          {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-blue-300"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Quick Login Buttons */}
        <div className="mt-6 border-t border-gray-200 pt-5">
          <p className="mb-3 text-center text-xs font-medium uppercase tracking-wide text-gray-400">Quick Demo Login</p>
          <div className="flex gap-3">
            <button
              onClick={() => quickLogin("admin@arafatcrm.com", "password123")}
              disabled={isLoading}
              className="flex-1 rounded-lg border-2 border-purple-200 bg-purple-50 px-4 py-2.5 text-sm font-semibold text-purple-700 hover:bg-purple-100 hover:border-purple-300 transition-colors disabled:opacity-50"
            >
              Admin
            </button>
            <button
              onClick={() => quickLogin("sales1@arafatcrm.com", "password123")}
              disabled={isLoading}
              className="flex-1 rounded-lg border-2 border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-colors disabled:opacity-50"
            >
              Sales
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
