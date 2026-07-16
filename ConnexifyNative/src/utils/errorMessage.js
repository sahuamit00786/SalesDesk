import Toast from 'react-native-toast-message';

/**
 * One place that turns an ApiError (api/envelope.js) into a sentence a
 * salesperson understands. Pairs with the new server errorHandler: the server
 * now sends precise codes + field details; this maps the transport-level and
 * generic cases the server can't know about (offline, timeout), and renders
 * field-level validation details when present.
 */

const CODE_MESSAGES = {
  UNAUTHORIZED: 'Your session has ended. Please sign in again.',
  TOKEN_EXPIRED: 'Your session has ended. Please sign in again.',
  FORBIDDEN: "You don't have permission for this action.",
  NOT_FOUND: 'This record no longer exists. It may have been deleted.',
  DUPLICATE: null, // server message is already specific ("Email X is already in use")
  VALIDATION_ERROR: null, // server message names the field — show as-is
  INVALID_REFERENCE: 'A linked record was deleted. Pull to refresh and try again.',
  STALE_WRITE: 'Someone else updated this record. Refresh to see the latest, then retry.',
  PAYLOAD_TOO_LARGE: 'The file or data is too large to upload.',
  BATCH_TOO_LARGE: 'Too many items at once — try a smaller selection.',
  RATE_LIMITED: 'Too many requests — wait a few seconds and try again.',
  DB_UNAVAILABLE: 'The server is temporarily unavailable. Try again in a moment.',
  DB_TIMEOUT: 'That took too long. Try again, or narrow your filters.',
  INTERNAL: null, // server includes the quotable error id in its message
};

export function errorMessage(err) {
  if (!err) return 'Something went wrong.';
  if (err.isNetwork) return "You're offline or the server is unreachable. Check your connection.";
  if (err.status === 429) return CODE_MESSAGES.RATE_LIMITED;

  const mapped = CODE_MESSAGES[err.code];
  if (mapped) return mapped;
  if (err.message) return err.message; // server messages are now human-grade
  return 'Something went wrong. Please try again.';
}

/** First field-level detail, e.g. "Email: must be a valid email" — or null. */
export function firstFieldError(err) {
  const d = Array.isArray(err?.details) ? err.details[0] : null;
  return d ? `${d.field ? d.field + ': ' : ''}${d.message}` : null;
}

/** Standard error toast — use in every mutation onError. */
export function showApiError(err, fallbackTitle = 'Action failed') {
  Toast.show({
    type: 'error',
    text1: fallbackTitle,
    text2: firstFieldError(err) || errorMessage(err),
    visibilityTime: 5000,
  });
}
