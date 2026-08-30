import { apiRequest } from "./client";

export async function getPatientMe() {
  return apiRequest<{ patient: Record<string, unknown> }>("/patients/me");
}

export async function updatePatientMe(data: Record<string, unknown>) {
  return apiRequest<{ patient: Record<string, unknown> }>("/patients/me", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
