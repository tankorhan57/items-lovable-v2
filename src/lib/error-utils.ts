/**
 * Maps raw API/database errors to safe, user-friendly messages.
 * Prevents leaking internal details (table names, constraints, SQL errors).
 */
export function mapErrorToUserMessage(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "Something went wrong. Please try again.";
  }

  const err = error as Record<string, unknown>;
  const code = typeof err.code === "string" ? err.code : "";
  const message = typeof err.message === "string" ? err.message : "";

  // Rate limit errors — safe to surface
  if (message.toLowerCase().includes("rate limit")) {
    return "You're doing that too fast. Please wait a moment.";
  }

  // Postgres: unique constraint violation
  if (code === "23505") return "This already exists.";

  // Postgres: permission denied
  if (code === "42501") return "Permission denied.";

  // Postgres: foreign key violation
  if (code === "23503") return "Referenced item not found.";

  // Postgres: not null violation
  if (code === "23502") return "A required field is missing.";

  // Supabase auth errors — keep them readable
  if (message.includes("Invalid login credentials")) {
    return "Invalid email or password.";
  }
  if (message.includes("User already registered")) {
    return "An account with this email already exists.";
  }
  if (message.includes("Email not confirmed")) {
    return "Please confirm your email before signing in.";
  }
  if (message.includes("Password should be")) {
    return message; // Safe — just password requirements
  }

  // Storage errors
  if (message.includes("Payload too large")) {
    return "File is too large. Please try a smaller file.";
  }

  // Generic fallback — never expose raw message
  return "Something went wrong. Please try again.";
}

