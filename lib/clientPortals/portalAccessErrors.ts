function isUniqueViolation(error: { code?: string; message?: string }) {
  return error.code === "23505" || /duplicate key/i.test(error.message || "");
}

export function mapPortalUserError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Something went wrong. Please try again.";
  }

  const pgError = error as Error & { code?: string };

  if (isUniqueViolation(pgError)) {
    return "User already exists.";
  }

  if (pgError.message.includes("Portal already exists")) {
    return "Portal already exists.";
  }

  if (pgError.message.includes("Unable to reset password")) {
    return "Unable to reset password.";
  }

  if (pgError.message.includes("at least one user")) {
    return "This portal must always have at least one user.";
  }

  return pgError.message || "Something went wrong. Please try again.";
}
