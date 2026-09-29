/**
 * Backend serialisers return absolute URLs for uploaded media
 * (e.g. http://localhost:5000/uploads/shirt.svg) because `APP_URL` is baked in
 * at upload time. Drop the origin so images load through the dev-server proxy
 * and keep working when the API moves to another host.
 */
export const assetUrl = (url?: string | null, fallback = '/placeholder.svg'): string => {
  if (!url) return fallback;

  if (url.startsWith('/')) return url;

  try {
    const parsed = new URL(url);
    return parsed.pathname + parsed.search;
  } catch {
    return url;
  }
};

export const PLACEHOLDER = '/placeholder.svg';
