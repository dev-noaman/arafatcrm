import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/api/auth";
import { calendarApi } from "@/api/calendar";
import { useAuthStore } from "@/contexts/auth-store";
import { Button, Card } from "@/components/ui";
import {
  User,
  Mail,
  Lock,
  Save,
  Calendar,
  AlertCircle,
  CheckCircle,
  Unlink,
  Copy,
} from "lucide-react";

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => authApi.getProfile(),
    initialData: user,
  });

  const [name, setName] = useState(profile?.name || "");
  const [email, setEmail] = useState(profile?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [calendarMsg, setCalendarMsg] = useState("");

  const { data: calendarStatus } = useQuery({
    queryKey: ["calendar-status"],
    queryFn: () => calendarApi.getStatus(),
  });

  const { data: bookingTypes } = useQuery({
    queryKey: ["booking-types"],
    queryFn: () => calendarApi.getBookingTypes(),
    enabled: calendarStatus?.connected,
  });

  const [selectedBookingType, setSelectedBookingType] = useState("");

  useEffect(() => {
    if (bookingTypes && bookingTypes.length > 0) {
      setSelectedBookingType(bookingTypes[0].id);
    }
  }, [bookingTypes]);

  // Check for calendar OAuth callback result from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cal = params.get("calendar");
    if (cal === "connected") {
      setCalendarMsg("TidyCal connected successfully!");
      queryClient.invalidateQueries({ queryKey: ["calendar-status"] });
      queryClient.invalidateQueries({ queryKey: ["booking-types"] });
      window.history.replaceState({}, "", "/profile");
    } else if (cal === "error") {
      setCalendarMsg("Failed to connect TidyCal. Please try again.");
      window.history.replaceState({}, "", "/profile");
    }
  }, [queryClient]);

  const handleConnectCalendar = async () => {
    try {
      const { url } = await calendarApi.getConnectUrl();
      window.location.href = url;
    } catch {
      setCalendarMsg("Failed to start TidyCal connection.");
    }
  };

  const disconnectMutation = useMutation({
    mutationFn: () => calendarApi.disconnect(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-status"] });
      setCalendarMsg("TidyCal disconnected.");
    },
    onError: () => {
      setCalendarMsg("Failed to disconnect TidyCal.");
    },
  });

  const setDefaultTypeMutation = useMutation({
    mutationFn: (id: string) => calendarApi.setDefaultBookingType(id),
    onSuccess: () => {
      setCalendarMsg("Default booking type updated.");
    },
    onError: () => {
      setCalendarMsg("Failed to update default booking type.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => authApi.updateProfile(data),
    onSuccess: (updated) => {
      setUser(updated);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError("");
      setSuccess("Profile updated successfully");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setTimeout(() => setSuccess(""), 3000);
    },
    onError: (e: any) => {
      setError(e.response?.data?.message || "Failed to update profile");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword && newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    updateMutation.mutate({
      name: name || undefined,
      email: email || undefined,
      currentPassword: currentPassword || undefined,
      newPassword: newPassword || undefined,
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Edit Profile</h1>

      <Card>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
            <div className="w-16 h-16 rounded-full bg-[#465FFF] flex items-center justify-center text-white text-xl font-bold">
              {(name || email).charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{name || "Unnamed"}</p>
              <p className="text-sm text-gray-500">{email}</p>
              <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                {profile?.role}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Personal Information
            </h3>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                <User className="h-4 w-4 text-gray-400" /> Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                <Mail className="h-4 w-4 text-gray-400" /> Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              <Lock className="h-4 w-4 inline mr-1 text-gray-400" />
              Change Password
            </h3>
            <p className="text-xs text-gray-500">Leave blank to keep your current password.</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                minLength={6}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-emerald-600">{success}</p>}

          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              <Calendar className="h-4 w-4 inline mr-1 text-gray-400" />
              TidyCal
            </h3>
            <p className="text-xs text-gray-500">
              Connect your TidyCal account to create bookings and generate shareable scheduling links.
            </p>
            {calendarMsg && (
              <p
                className={`text-sm flex items-center gap-1 ${
                  calendarMsg.includes("success") || calendarMsg.includes("updated") || calendarMsg.includes("disconnected")
                    ? "text-emerald-600"
                    : "text-red-600"
                }`}
              >
                {calendarMsg.includes("success") || calendarMsg.includes("updated") || calendarMsg.includes("disconnected") ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                {calendarMsg}
              </p>
            )}
            {calendarStatus?.connected ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
                  <CheckCircle className="h-4 w-4" />
                  TidyCal is connected
                </div>

                {bookingTypes && bookingTypes.length > 0 ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Default Booking Type
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={selectedBookingType}
                        onChange={(e) => setSelectedBookingType(e.target.value)}
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {bookingTypes.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setDefaultTypeMutation.mutate(selectedBookingType)}
                        isLoading={setDefaultTypeMutation.isPending}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    No booking types found in your TidyCal account. Please create one at tidycal.com.
                  </div>
                )}

                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => disconnectMutation.mutate()}
                  isLoading={disconnectMutation.isPending}
                >
                  <Unlink className="h-4 w-4 mr-2" />
                  Disconnect TidyCal
                </Button>
              </div>
            ) : (
              <Button type="button" variant="secondary" onClick={handleConnectCalendar}>
                <Calendar className="h-4 w-4 mr-2" />
                Connect TidyCal
              </Button>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" isLoading={updateMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
