import { supabase } from '@/lib/supabase';

const apiBaseUrl = process.env.EXPO_PUBLIC_NUTRITION_API_URL
  || 'https://maathru-care-business-api-tharindu.onrender.com/api/v1';

export class NutritionApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'NutritionApiError';
    this.status = status;
    this.code = code;
  }
}

export const nutritionApi = {
  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) throw new Error('Sign in to use food search and My Foods.');

    let response: Response;
    try {
      response = await fetch(`${apiBaseUrl}${path}`, {
        ...options,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          ...options.headers,
        },
      });
    } catch {
      throw new Error(`Nutrition service is unavailable. Start the backend at ${apiBaseUrl} and try again.`);
    }

    if (!response.ok) {
      let body: { detail?: string | { code?: string; message?: string } } = {};
      try { body = await response.json(); } catch { /* keep generic message */ }
      const detail = body.detail;
      const message = typeof detail === 'string' ? detail : detail?.message || `Nutrition service request failed (${response.status}).`;
      const code = typeof detail === 'object' ? detail.code : undefined;
      if (code === 'CUSTOM_FOODS_NOT_CONFIGURED') {
        throw new NutritionApiError('Custom foods are not set up yet. The reviewed database migration must be applied first.', response.status, code);
      }
      throw new NutritionApiError(message, response.status, code);
    }
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  },
};

