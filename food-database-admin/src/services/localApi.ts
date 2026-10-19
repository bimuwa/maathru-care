const configuredUrl = import.meta.env.VITE_LOCAL_ADMIN_API_URL as string | undefined;
export const localAdminApiUrl = configuredUrl || '';
export function isLocalApiConfigured(): boolean {
  if (!configuredUrl) return false;
  try {
    const url = new URL(configuredUrl);
    return ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) && ['http:', 'https:'].includes(url.protocol);
  } catch { return false; }
}
