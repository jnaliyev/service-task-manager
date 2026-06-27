import { createHash } from "node:crypto";
import type { ClientAccessLevel } from "@/lib/clientPortals/clientUserAccess";
import {
  CENOMI_INDITEX_STORE_MANAGERS,
  isCenomiInditexStoreName,
  matchesCenomiStoreManagerPattern,
} from "@/lib/clientPortals/cenomiStoreManagers";

export type DemoClientUserDefinition = {
  username: string;
  password: string;
  fullName: string;
  email: string;
  role: string;
  accessLevel: ClientAccessLevel;
  portalSlug: string;
  storeScope:
    | { type: "company" }
    | { type: "brand"; matchMode: "exact" | "prefix"; storePattern: string }
    | { type: "non_inditex_fashion" };
};

const STORE_MANAGER_USERS: DemoClientUserDefinition[] =
  CENOMI_INDITEX_STORE_MANAGERS.map((manager) => ({
    portalSlug: "cenomi",
    username: manager.username,
    password: "123456",
    fullName: manager.fullName,
    email: manager.email,
    role: "manager",
    accessLevel: "stores" as const,
    storeScope: {
      type: "brand" as const,
      matchMode: manager.matchMode,
      storePattern: manager.storePattern,
    },
  }));

export const DEMO_CLIENT_USERS: DemoClientUserDefinition[] = [
  {
    portalSlug: "cenomi",
    username: "cenomi_admin",
    password: "123456",
    fullName: "Cenomi Head Office",
    email: "cenomi_admin@local",
    role: "manager",
    accessLevel: "company",
    storeScope: { type: "company" },
  },
  ...STORE_MANAGER_USERS,
  {
    portalSlug: "cenomi",
    username: "fashion_manager",
    password: "123456",
    fullName: "Fashion Stores Manager",
    email: "fashion_manager@local",
    role: "manager",
    accessLevel: "stores",
    storeScope: { type: "non_inditex_fashion" },
  },
];

export function getDemoClientUserId(username: string) {
  const hash = createHash("sha256")
    .update(`cenomi-demo-user:${username.trim().toLowerCase()}`)
    .digest("hex");

  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    hash.slice(12, 16),
    hash.slice(16, 20),
    hash.slice(20, 32),
  ].join("-");
}

export function findDemoClientUser(
  portalSlug: string,
  username: string,
  password: string
) {
  const normalizedSlug = portalSlug.trim().toLowerCase();
  const normalizedUsername = username.trim().toLowerCase();
  const normalizedPassword = password.trim();

  return (
    DEMO_CLIENT_USERS.find(
      (user) =>
        user.portalSlug === normalizedSlug &&
        user.username.toLowerCase() === normalizedUsername &&
        user.password === normalizedPassword
    ) || null
  );
}

export function findDemoClientUserById(portalSlug: string, userId: string) {
  const normalizedSlug = portalSlug.trim().toLowerCase();

  return (
    DEMO_CLIENT_USERS.find(
      (user) =>
        user.portalSlug === normalizedSlug &&
        getDemoClientUserId(user.username) === userId
    ) || null
  );
}

export function listDemoClientUsernames(portalSlug = "cenomi") {
  const normalizedSlug = portalSlug.trim().toLowerCase();

  return DEMO_CLIENT_USERS.filter((user) => user.portalSlug === normalizedSlug).map(
    (user) => user.username
  );
}

export function filterDemoStoreIds(
  storeName: string,
  storeScope: DemoClientUserDefinition["storeScope"]
) {
  if (storeScope.type === "company") {
    return false;
  }

  if (storeScope.type === "non_inditex_fashion") {
    return !isCenomiInditexStoreName(storeName);
  }

  return matchesCenomiStoreManagerPattern(
    storeName,
    storeScope.matchMode,
    storeScope.storePattern
  );
}
