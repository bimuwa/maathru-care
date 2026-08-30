import { apiRequest } from "./client";

export const analysisApi = {
  getAnalysis(analysisId: string) {
    return apiRequest<{ analysis: Record<string, unknown> }>(`/analyses/${analysisId}/analysis`);
  },

  getFeedback(analysisId: string) {
    return apiRequest<{ feedback: Record<string, unknown>[] }>(`/analyses/${analysisId}/feedback`);
  },
};

export const feedbackApi = {
  createFeedback(analysisId: string, feedback: string) {
    return apiRequest<{ feedback: Record<string, unknown> }>(`/analyses/${analysisId}/feedback`, {
      method: "POST",
      body: JSON.stringify({ feedback }),
    });
  },
};
