import { apiRequest } from "./client";
import { Profile, UserRole } from "../types";

export async function register(data: {
  role: UserRole;
  full_name: string;
  email: string;
  password: string;
  phone?: string;
}) {
  return apiRequest<{ profile: Profile; message?: string }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
    public: true,
  });
}

export async function confirmAccount(email: string) {
  return apiRequest<{ message: string }>("/auth/confirm-account", {
    method: "POST",
    body: JSON.stringify({ email }),
    public: true,
  });
}

export async function resetPassword(email: string, newPassword: string) {
  return apiRequest<{ message: string }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ email, newPassword }),
    public: true,
  });
}

export async function createProfile(
  data: {
    role: UserRole;
    full_name: string;
    email: string;
    phone?: string;
  },
  accessToken?: string,
) {
  return apiRequest<{ profile: Profile }>("/auth/profile", {
    method: "POST",
    body: JSON.stringify(data),
    accessToken,
  });
}

export async function getMe(accessToken?: string) {
  return apiRequest<{ profile: Profile; roleData: Record<string, unknown> }>("/auth/me", {
    accessToken,
  });
}
