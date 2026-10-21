import { GDMV4RiskRequest, GDMV4RiskResponse } from '../types/gdmV4';

const GDM_V4_API_URL =
  process.env.EXPO_PUBLIC_GDM_V4_API_URL ||
  'https://food-detector-api.onrender.com/research/gdm/v4/predict';

// Render services may need extra time for a cold start. Keep this configurable
// so deployments can choose a tighter limit without changing application code.
const configuredTimeout = Number(process.env.EXPO_PUBLIC_GDM_V4_TIMEOUT_MS);
const GDM_V4_TIMEOUT_MS =
  Number.isFinite(configuredTimeout) && configuredTimeout > 0
    ? configuredTimeout
    : 180_000;

export class GDMV4ResearchError extends Error {
  public statusCode?: number;
  public isAuthError: boolean;
  public isFeatureDisabled: boolean;
  public isModelUnavailable: boolean;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'GDMV4ResearchError';
    this.statusCode = statusCode;
    this.isAuthError = statusCode === 401;
    this.isFeatureDisabled = statusCode === 403;
    this.isModelUnavailable = statusCode === 503;
  }
}

export const gdmV4ResearchService = {
  /**
   * Submit validated 5-feature vector to GDM V4 Research Screening API.
   *
   * @param request The 5 exact features (Age, No of Pregnancy, Family History, Unexplained Prenatal Loss, Sedentary Lifestyle)
   */
  async predictScreening(
    request: GDMV4RiskRequest
  ): Promise<GDMV4RiskResponse> {
    // 1. Strict client-side validation
    if (!Number.isFinite(request.age) || request.age < 10 || request.age > 70) {
      throw new GDMV4ResearchError('Please enter a valid maternal age between 10 and 70.');
    }
    if (!Number.isInteger(request.no_of_pregnancy) || request.no_of_pregnancy < 0 || request.no_of_pregnancy > 25) {
      throw new GDMV4ResearchError('Please enter a valid pregnancy count (0 to 25).');
    }
    if (request.family_history !== 0 && request.family_history !== 1) {
      throw new GDMV4ResearchError('Family history must be explicitly specified (Yes or No).');
    }
    if (request.unexplained_prenatal_loss !== 0 && request.unexplained_prenatal_loss !== 1) {
      throw new GDMV4ResearchError('Unexplained prenatal loss history must be explicitly specified (Yes or No).');
    }
    if (request.sedentary_lifestyle !== 0 && request.sedentary_lifestyle !== 1) {
      throw new GDMV4ResearchError('Sedentary lifestyle must be explicitly specified (Yes or No).');
    }

    // 2. Network request with a cold-start-tolerant timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GDM_V4_TIMEOUT_MS);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      const response = await fetch(GDM_V4_API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const detail = typeof errorData.detail === 'string'
          ? errorData.detail : `Server returned HTTP ${response.status}`;

        if (response.status === 403) {
          throw new GDMV4ResearchError(
            'Research screening is disabled. Please contact your study administrator.',
            403
          );
        }
        if (response.status === 401) {
          throw new GDMV4ResearchError(
            'The research service rejected this request. Please contact your administrator.',
            401
          );
        }
        if (response.status === 404) {
          throw new GDMV4ResearchError('Research screening has not been deployed at the configured API address.', 404);
        }
        if (response.status === 422) {
          throw new GDMV4ResearchError('Please review the five input values and confirm all history answers.', 422);
        }
        if (response.status === 503) {
          throw new GDMV4ResearchError(
            'The GDM V4 research model is temporarily unavailable on the server.',
            503
          );
        }
        if (response.status >= 500) {
          throw new GDMV4ResearchError('Research screening could not complete. Please try again later.', response.status);
        }
        throw new GDMV4ResearchError(detail, response.status);
      }

      const result = (await response.json()) as GDMV4RiskResponse;

      if (result.success !== true || result.research_only !== true ||
          result.model_version !== 'gdm-v4-conservative-rf' ||
          !Number.isFinite(result.model_score) || result.model_score < 0 || result.model_score > 1 ||
          !Number.isFinite(result.threshold) || result.threshold <= 0 || result.threshold >= 1 ||
          typeof result.screen_positive !== 'boolean' ||
          result.screen_positive !== (result.model_score >= result.threshold) ||
          typeof result.disclaimer !== 'string' || !result.disclaimer.trim()) {
        throw new GDMV4ResearchError('Malformed response received from GDM V4 Research API.');
      }

      return result;
    } catch (err: any) {
      if (err instanceof GDMV4ResearchError) {
        throw err;
      }

      if (err.name === 'AbortError') {
        throw new GDMV4ResearchError(
          `Request timed out after ${Math.round(GDM_V4_TIMEOUT_MS / 1000)} seconds. The research inference service may be unavailable or still starting. Please try again.`
        );
      }

      throw new GDMV4ResearchError(
        err.message || 'Unable to connect to the GDM V4 research service. Please check your network connection.'
      );
    } finally {
      clearTimeout(timeoutId);
    }
  },
};
