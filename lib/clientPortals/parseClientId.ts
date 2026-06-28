export function parseNumericClientId(rawValue: unknown): number | string | null {
  if (rawValue == null) return null;

  if (typeof rawValue === "number") {
    if (!Number.isFinite(rawValue) || !Number.isInteger(rawValue) || rawValue <= 0) {
      return null;
    }

    return rawValue;
  }

  if (typeof rawValue === "bigint") {
    if (rawValue <= BigInt(0)) return null;
    return rawValue <= BigInt(Number.MAX_SAFE_INTEGER)
      ? Number(rawValue)
      : rawValue.toString();
  }

  if (typeof rawValue === "string") {
    const trimmed = rawValue.trim();

    if (!/^\d+$/.test(trimmed)) {
      return null;
    }

    const asNumber = Number(trimmed);

    if (
      Number.isSafeInteger(asNumber) &&
      asNumber > 0 &&
      String(asNumber) === trimmed
    ) {
      return asNumber;
    }

    return trimmed;
  }

  return null;
}

export function extractRawClientId(payload: {
  clientId?: unknown;
  id?: unknown;
  client_id?: unknown;
}): unknown {
  if (payload.clientId != null) return payload.clientId;
  if (payload.id != null) return payload.id;
  if (payload.client_id != null) return payload.client_id;
  return null;
}
