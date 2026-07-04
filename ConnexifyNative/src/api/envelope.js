// Server envelope: { success, data, meta } — errors { success:false, error:{ code, message, details } }.
// GET /notifications puts counts under `pagination` (server/src/controllers/notificationController.js).

export class ApiError extends Error {
  constructor({ code, message, status, details }) {
    super(message || 'Something went wrong');
    this.name = 'ApiError';
    this.code = code || 'UNKNOWN';
    this.status = status ?? 0;
    this.details = details || null;
  }

  get isNetwork() {
    return this.status === 0;
  }
}

/** Axios response → { data, meta } (meta merged with `pagination` variant). */
export function unwrap(response) {
  const body = response?.data;
  if (body && typeof body === 'object' && 'success' in body) {
    const meta = { ...(body.meta || {}), ...(body.pagination || {}) };
    return { data: body.data, meta };
  }
  return { data: body, meta: {} };
}

/** Axios error → ApiError with server code/message when present. */
export function toApiError(error) {
  if (error instanceof ApiError) return error;
  const res = error?.response;
  if (res) {
    const e = res.data?.error || {};
    return new ApiError({
      code: e.code || 'HTTP_ERROR',
      message: e.message || `Request failed (${res.status})`,
      status: res.status,
      details: e.details,
    });
  }
  if (error?.request) {
    return new ApiError({
      code: 'NETWORK',
      message: 'No connection — check your network and try again',
      status: 0,
    });
  }
  return new ApiError({ code: 'CLIENT', message: error?.message || 'Unexpected error', status: -1 });
}

/** Friendly copy for auth error codes (web parity). */
export function authErrorMessage(err) {
  switch (err?.code) {
    case 'INVALID_CREDENTIALS':
      return 'Incorrect email or password';
    case 'EMAIL_NOT_VERIFIED':
      return 'Please verify your email before signing in';
    case 'ACCOUNT_DISABLED':
      return 'Your account has been deactivated — contact your admin';
    case 'RATE_LIMIT':
      return 'Too many attempts — wait a minute and try again';
    case 'NETWORK':
      return 'No connection — check your network and try again';
    default:
      return err?.message || 'Something went wrong';
  }
}
