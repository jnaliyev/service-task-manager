export function getAppBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    const origin = window.location.origin?.trim();

    if (origin && !/^https?:\/\/localhost(?::\d+)?$/i.test(origin)) {
      return origin.replace(/\/$/, "");
    }
  }

  return "http://localhost:3000";
}

export function buildPortalUrl(slug: string): string {
  const normalizedSlug = slug.trim().toLowerCase();
  return `${getAppBaseUrl()}/client/${normalizedSlug}`;
}
