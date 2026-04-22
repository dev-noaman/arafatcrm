export interface User {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "SALES";
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}
