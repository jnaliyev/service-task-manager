import type { Store } from "@/app/client/types/store";
import { resolveEffectiveStoreIds } from "@/lib/clientPortals/clientUserStores";

export const CLIENT_ACCESS_LEVELS = ["company", "stores"] as const;

export type ClientAccessLevel = (typeof CLIENT_ACCESS_LEVELS)[number];

export type ClientUserRecord = {
  id: string;
  client_portal_id: string;
  client_id?: string | null;
  full_name: string;
  username: string;
  email: string;
  role: string;
  access_level: ClientAccessLevel;
  store_ids: number[] | string[] | null;
  active: boolean;
  created_at: string;
};

export type ClientPortalAccessContext = {
  id: string;
  company_name: string;
  client_id?: string | null;
};

export type ClientTaskAccessTarget = {
  company_name?: string | null;
  store_id?: number | string | null;
  store?: string | null;
};

export type ClientUserAccess = {
  userId: string;
  portalId: string;
  companyName: string;
  clientId: string | null;
  portalStoreIds: number[];
  assignedStoreIds: number[];
  accessLevel: ClientAccessLevel;
  role: string;
  storeIds: number[];
  allowedStoreNames: string[];
  canAccessTask: (task: ClientTaskAccessTarget) => boolean;
};

export function normalizeClientAccessLevel(
  value: unknown
): ClientAccessLevel {
  if (typeof value !== "string") return "company";

  const normalized = value.trim().toLowerCase();

  if (normalized === "stores") return "stores";

  return "company";
}

export function normalizeClientUserStoreIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item > 0);
}

function normalizeCompanyName(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function normalizeStoreLabel(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function buildAllowedStoreNames(
  storeIds: number[],
  stores: Store[]
): string[] {
  if (storeIds.length === 0 || stores.length === 0) return [];

  const allowedIds = new Set(storeIds);

  return stores
    .filter((store) => allowedIds.has(store.id))
    .map((store) => normalizeStoreLabel(store.store_name))
    .filter(Boolean);
}

function taskMatchesStoreName(
  taskStore: string,
  allowedStoreNames: string[]
) {
  if (!taskStore || allowedStoreNames.length === 0) return false;

  return allowedStoreNames.some(
    (storeName) =>
      taskStore === storeName ||
      taskStore.includes(storeName) ||
      storeName.includes(taskStore)
  );
}

export function getClientUserAccess(
  user: ClientUserRecord,
  portal: ClientPortalAccessContext,
  stores: Store[] = [],
  assignedStoreIds: number[] = []
): ClientUserAccess {
  const accessLevel = normalizeClientAccessLevel(user.access_level);
  const legacyStoreIds = normalizeClientUserStoreIds(user.store_ids);
  const effectiveStoreIds = resolveEffectiveStoreIds(
    assignedStoreIds,
    accessLevel,
    legacyStoreIds
  );
  const allowedStoreNames = buildAllowedStoreNames(effectiveStoreIds, stores);
  const companyName = portal.company_name.trim();
  const clientId = portal.client_id ? String(portal.client_id) : null;
  const portalStoreIds = stores
    .map((store) => Number(store.id))
    .filter((id) => Number.isFinite(id) && id > 0);

  function canAccessTask(task: ClientTaskAccessTarget) {
    if (!user.active) return false;

    const taskStoreId = Number(task.store_id);
    const inPortalStores =
      portalStoreIds.length > 0 &&
      Number.isFinite(taskStoreId) &&
      portalStoreIds.includes(taskStoreId);

    const companyMatch =
      normalizeCompanyName(task.company_name) ===
      normalizeCompanyName(companyName);

    if (!inPortalStores && !companyMatch) {
      return false;
    }

    if (effectiveStoreIds.length === 0) {
      return true;
    }

    if (Number.isFinite(taskStoreId) && taskStoreId > 0) {
      return effectiveStoreIds.includes(taskStoreId);
    }

    const taskStore = normalizeStoreLabel(task.store);

    return taskMatchesStoreName(taskStore, allowedStoreNames);
  }

  return {
    userId: user.id,
    portalId: portal.id,
    companyName,
    clientId,
    portalStoreIds,
    assignedStoreIds: effectiveStoreIds,
    accessLevel,
    role: user.role,
    storeIds: effectiveStoreIds,
    allowedStoreNames,
    canAccessTask,
  };
}

export function filterStoresForAccess<T extends { id: number }>(
  stores: T[],
  access: ClientUserAccess
): T[] {
  if (access.assignedStoreIds.length > 0) {
    const allowedIds = new Set(access.assignedStoreIds);
    return stores.filter((store) => allowedIds.has(store.id));
  }

  if (access.accessLevel === "company") {
    return stores;
  }

  if (access.storeIds.length === 0) {
    return [];
  }

  const allowedIds = new Set(access.storeIds);

  return stores.filter((store) => allowedIds.has(store.id));
}

export function filterTasksForAccess<
  T extends {
    company_name?: string | null;
    store_id?: number | string | null;
    store?: string | null;
  },
>(tasks: T[], access: ClientUserAccess): T[] {
  return tasks.filter((task) => access.canAccessTask(task));
}
