export type ClientPortalSession = {
  userId: string;
  slug: string;
  fullName: string;
  username: string;
  role: string;
  accessLevel: "company" | "stores";
  storeIds: number[];
};

const SESSION_PREFIX = "client_portal_session:";

function sessionKey(slug: string) {
  return `${SESSION_PREFIX}${slug.trim().toLowerCase()}`;
}

export function readClientPortalSession(
  slug: string
): ClientPortalSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(sessionKey(slug));

    if (!raw) return null;

    const parsed = JSON.parse(raw) as ClientPortalSession & { email?: string };

    if (parsed.slug?.trim().toLowerCase() !== slug.trim().toLowerCase()) {
      return null;
    }

    const username = parsed.username || parsed.email;

    if (!parsed.userId || !username) {
      return null;
    }

    return {
      userId: parsed.userId,
      slug: parsed.slug,
      fullName: parsed.fullName,
      username,
      role: parsed.role,
      accessLevel: parsed.accessLevel,
      storeIds: parsed.storeIds || [],
    };
  } catch {
    return null;
  }
}

export function writeClientPortalSession(session: ClientPortalSession) {
  if (typeof window === "undefined") return;

  window.sessionStorage.setItem(
    sessionKey(session.slug),
    JSON.stringify(session)
  );
}

export function clearClientPortalSession(slug: string) {
  if (typeof window === "undefined") return;

  window.sessionStorage.removeItem(sessionKey(slug));
}

export function getClientAuthHeaders(
  session: ClientPortalSession | null
): Record<string, string> {
  if (!session?.userId) return {};

  return {
    "X-Client-User-Id": session.userId,
  };
}

export function buildClientCreatedBy(
  companyName: string,
  fullName: string,
  username: string
) {
  return `Client Portal - ${companyName} (${fullName}, ${username})`;
}
