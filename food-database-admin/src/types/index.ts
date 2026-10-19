export type Section = 'Dashboard' | 'Meal Items' | 'Maternal Foods' | 'Missing References' | 'Data Quality' | 'Settings';
export type Food = { id?: string | number; food_id?: string | null; display_name?: string | null; english_name?: string | null; item_name?: string | null; category?: string | null; image_uri?: string | null; [key: string]: unknown };
export type ApiResult<T> = { data: T; meta?: Record<string, unknown> };
export type AdminState = { authorized: boolean; writesEnabled: boolean; reason?: string; capabilities?: string[] };
