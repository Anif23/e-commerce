/**
 * Uploaded local media can be proxied through the current origin. Third-party
 * images (such as the seeded Unsplash catalogue photos) must keep their host.
 */
export const assetUrl = (url?: string | null, fallback = '/placeholder.svg'): string => {
  if (!url) return fallback;
  if (url.startsWith('/')) return url;

  try {
    const parsed = new URL(url);
    if (parsed.pathname.startsWith('/uploads/')) return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    return url;
  } catch {
    return url;
  }
};

export const PLACEHOLDER = '/placeholder.svg';
