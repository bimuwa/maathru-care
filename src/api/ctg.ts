import { apiRequest } from "./client";
import { CtgReport, ManualCtgValues, DoctorRequest } from "../types";

export const ctgApi = {
  createReport(source: "IMAGE" | "MANUAL") {
    return apiRequest<{ report: CtgReport }>("/ctg-reports", {
      method: "POST",
      body: JSON.stringify({ source }),
    });
  },

  getHistory() {
    return apiRequest<{ reports: CtgReport[] }>("/ctg-reports");
  },

  getReport(id: string) {
    return apiRequest<{ report: CtgReport; feedback: unknown[] }>(`/ctg-reports/${id}`);
  },

  uploadImage(reportId: string, uri: string, fileName: string) {
    const form = new FormData();
    form.append("image", {
      uri,
      name: fileName,
      type: "image/jpeg",
    } as unknown as Blob);

    return apiRequest<{ image: { image_url: string } }>(`/ctg-reports/${reportId}/image`, {
      method: "POST",
      body: form,
    });
  },

  saveManualValues(reportId: string, values: ManualCtgValues) {
    return apiRequest<{ manualValues: ManualCtgValues }>(`/ctg-reports/${reportId}/manual-values`, {
      method: "POST",
      body: JSON.stringify(values),
    });
  },

  analyze(reportId: string) {
    return apiRequest<{ analysis: Record<string, unknown>; disclaimer: string }>(
      `/ctg-reports/${reportId}/analyze`,
      { method: "POST" },
    );
  },

  getAnalysis(reportId: string) {
    return apiRequest<{ analysis: Record<string, unknown>; disclaimer: string }>(
      `/ctg-reports/${reportId}/analysis`,
    );
  },

  shareReport(reportId: string, doctorId: string) {
    return apiRequest<{ share: unknown }>(`/ctg-reports/${reportId}/share`, {
      method: "POST",
      body: JSON.stringify({ doctorId }),
    });
  },
};

export async function getDoctorRequests() {
  return apiRequest<{ requests: DoctorRequest[] }>("/doctor-requests");
}

export async function sendDoctorRequest(doctorId: string) {
  return apiRequest<{ request: unknown }>("/doctor-requests", {
    method: "POST",
    body: JSON.stringify({ doctor_id: doctorId }),
  });
}

export async function updateDoctorRequest(id: string, status: string) {
  return apiRequest<{ request: unknown }>(`/doctor-requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
