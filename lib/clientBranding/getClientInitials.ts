const IGNORED_SUFFIX_WORDS = new Set([
  "llc",
  "l.l.c",
  "inc",
  "ltd",
  "limited",
  "co",
  "company",
]);

export function getClientInitials(name: string): string {
  const cleaned = name.trim();

  if (!cleaned) {
    return "?";
  }

  const words = cleaned
    .split(/\s+/)
    .map((word) => word.replace(/[^a-zA-Z0-9]/g, ""))
    .filter((word) => word.length > 0 && !IGNORED_SUFFIX_WORDS.has(word.toLowerCase()));

  if (words.length >= 2) {
    return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
  }

  const primary = words[0] || cleaned.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2);

  return primary.slice(0, 2).toUpperCase() || "?";
}

export function normalizeLogoUrl(value?: string | null): string | null {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}
