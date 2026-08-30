import { getAccessToken } from "../lib/supabase";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export type ApiRequestOptions = RequestInit & {
  /** Pass the session token from sign-in/sign-up to avoid a storage read race. */
  accessToken?: string;
  /** Public routes (register, reset password) that do not require auth. */
  public?: boolean;
};

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { accessToken, public: isPublic, ...fetchOptions } = options;
  const token = accessToken ?? (await getAccessToken());

  if (!token && !isPublic) {
    throw new ApiError(401, "Not authenticated. Please sign in again.");
  }

  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (!(fetchOptions.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
  }

  const res = await fetch(`${API_URL}${path}`, { ...fetchOptions, headers });

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data.error ?? "Request failed");
  }
  return data as T;
}

export { API_URL };
