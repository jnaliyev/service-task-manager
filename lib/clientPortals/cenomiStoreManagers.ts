export const CENOMI_INDITEX_STORE_NAMES = [
  "Zara",
  "Zara Home",
  "Zara Online",
  "Bershka",
  "OYSHO",
  "Stradivarius",
  "Pull and Bear",
  "Massimo Dutti",
] as const;

export type StoreMatchMode = "exact" | "prefix";

export type CenomiStoreManagerSeed = {
  username: string;
  fullName: string;
  email: string;
  matchMode: StoreMatchMode;
  storePattern: string;
};

export const CENOMI_INDITEX_STORE_MANAGERS: CenomiStoreManagerSeed[] = [
  {
    username: "zara_manager",
    fullName: "Zara Manager",
    email: "zara_manager@local",
    matchMode: "prefix",
    storePattern: "Zara",
  },
  {
    username: "bershka_manager",
    fullName: "Bershka Manager",
    email: "bershka_manager@local",
    matchMode: "exact",
    storePattern: "Bershka",
  },
  {
    username: "oysho_manager",
    fullName: "Oysho Manager",
    email: "oysho_manager@local",
    matchMode: "exact",
    storePattern: "OYSHO",
  },
  {
    username: "stradivarius_manager",
    fullName: "Stradivarius Manager",
    email: "stradivarius_manager@local",
    matchMode: "exact",
    storePattern: "Stradivarius",
  },
  {
    username: "pullbear_manager",
    fullName: "Pull&Bear Manager",
    email: "pullbear_manager@local",
    matchMode: "exact",
    storePattern: "Pull and Bear",
  },
  {
    username: "massimo_manager",
    fullName: "Massimo Dutti Manager",
    email: "massimo_manager@local",
    matchMode: "exact",
    storePattern: "Massimo Dutti",
  },
];

export function normalizeStoreLabel(value: string) {
  return value.trim().toLowerCase();
}

export function isCenomiInditexStoreName(storeName: string) {
  const normalized = normalizeStoreLabel(storeName);

  return CENOMI_INDITEX_STORE_NAMES.some(
    (name) => normalizeStoreLabel(name) === normalized
  );
}

export function matchesCenomiStoreManagerPattern(
  storeName: string,
  matchMode: StoreMatchMode,
  storePattern: string
) {
  const normalizedStore = normalizeStoreLabel(storeName);
  const normalizedPattern = normalizeStoreLabel(storePattern);

  if (matchMode === "prefix") {
    return normalizedStore.startsWith(normalizedPattern);
  }

  return normalizedStore === normalizedPattern;
}
