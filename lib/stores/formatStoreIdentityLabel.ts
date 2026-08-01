export type StoreIdentityClient = {
  client_name?: string | null;
};

export type StoreIdentityInput = {
  id?: number | string | null;
  store_name?: string | null;
  location?: string | null;
  company_name?: string | null;
  clients?: StoreIdentityClient | StoreIdentityClient[] | null;
  /** Denormalized fallback label (e.g. tasks.store) */
  store?: string | null;
};

export type TaskStoreIdentityInput = {
  store?: string | null;
  company_name?: string | null;
  location?: string | null;
  stores?: StoreIdentityInput | null;
};

function normalizeJoinedClient(
  clients: StoreIdentityInput["clients"]
): StoreIdentityClient | null {
  if (!clients) return null;
  return Array.isArray(clients) ? clients[0] ?? null : clients;
}

function getCompanyName(store: StoreIdentityInput): string {
  const clientName = normalizeJoinedClient(store.clients)?.client_name?.trim();
  if (clientName) return clientName;
  return store.company_name?.trim() || "";
}

/**
 * Single-line store identity: Company / Store / Location
 * Skips empty parts and case-insensitive duplicates.
 */
export function formatStoreIdentityLabel(store: StoreIdentityInput): string {
  const company = getCompanyName(store);
  const storeName = store.store_name?.trim() || "";
  const location = store.location?.trim() || "";

  const parts: string[] = [];

  for (const part of [company, storeName, location]) {
    if (!part) continue;

    const alreadyPresent = parts.some(
      (existing) => existing.toLowerCase() === part.toLowerCase()
    );
    if (alreadyPresent) continue;

    parts.push(part);
  }

  if (parts.length > 0) {
    return parts.join(" / ");
  }

  const denormalized = store.store?.trim() || "";
  if (denormalized) return denormalized;

  if (store.id !== null && store.id !== undefined && store.id !== "") {
    return `Store #${store.id}`;
  }

  return "";
}

/**
 * Task-facing identity label. Prefers joined store fields so mobile/desktop
 * never fall back to bare store_name when company/location are available.
 */
export function formatTaskStoreIdentityLabel(
  task: TaskStoreIdentityInput
): string {
  const joined = task.stores;

  if (joined) {
    const label = formatStoreIdentityLabel({
      id: joined.id,
      store_name: joined.store_name,
      location: joined.location || task.location,
      company_name: joined.company_name || task.company_name,
      clients: joined.clients,
      store: task.store,
    });

    if (label) return label;
  }

  const fromTaskFields = formatStoreIdentityLabel({
    store_name: null,
    location: task.location,
    company_name: task.company_name,
    store: task.store,
  });

  if (fromTaskFields && task.store?.trim()) {
    // Prefer denormalized tasks.store when join is missing store_name
    // (it usually already contains Company / Store / Location).
    return task.store.trim();
  }

  return fromTaskFields || task.store?.trim() || "";
}
