import { apiRequest } from "./client";

export async function getDoctorMe() {
  return apiRequest<{ doctor: Record<string, unknown> }>("/doctors/me");
}

export async function searchDoctors(search?: string) {
  const q = search ? `?search=${encodeURIComponent(search)}` : "";
  return apiRequest<{ doctors: Record<string, unknown>[] }>(`/doctors${q}`);
}

export async function getDoctorPatients() {
  return apiRequest<{ patients: Record<string, unknown>[] }>("/doctor/patients");
}

export async function getDoctorSharedReports() {
  return apiRequest<{ reports: Record<string, unknown>[] }>("/doctor/ctg-reports");
}
