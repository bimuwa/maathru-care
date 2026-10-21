import { isLocalApiConfigured, localAdminApiUrl } from './localApi';
import type { AdminState, ApiResult } from '../types';

export async function adminCall<T>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  if (!isLocalApiConfigured()) throw new Error('Local admin service is not configured. Set VITE_LOCAL_ADMIN_API_URL to a localhost endpoint.');
  let response: Response;
  try {
    response = await fetch(localAdminApiUrl, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...params }),
    });
  } catch { throw new Error('Could not reach the local admin service. Start its localhost server and retry.'); }
  const body = await response.json().catch(() => null) as (ApiResult<T> & { error?: string }) | null;
  if (!response.ok) throw new Error(body?.error || `Local admin service returned ${response.status}.`);
  if (!body) throw new Error('Local admin service returned an unreadable response.');
  return body.data ?? body as T;
}

export async function checkAdmin(): Promise<AdminState> {
  try { return await adminCall<AdminState>('status'); }
  catch (e) { return { authorized: false, writesEnabled: false, reason: e instanceof Error ? e.message : 'Local admin service is unavailable.' }; }
}
