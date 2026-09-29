export function communityError(error: unknown): string {
  const message =
    error && typeof error === 'object' && 'message' in error
      ? String(error.message)
      : 'Connection failed. Please try again.';
  if (/schema cache|does not exist|permission denied/i.test(message))
    return 'Database setup is needed. Run supabase/schema.sql in your project’s SQL Editor, then press Refresh.';
  return message;
}
