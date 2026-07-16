/**
 * Phase 0.4 — crash reporting init.
 *
 * Safe by default: if Sentry isn't installed / no DSN is set, this is a no-op,
 * so you can drop it in now and wire the real service when ready. Uncomment the
 * import in App.jsx once you `npm i @sentry/react-native` and set SENTRY_DSN
 * in your .env (@env).
 *
 * Why Sentry over Crashlytics here: you asked for NO Firebase in this build —
 * Crashlytics pulls in firebase-core. Sentry RN is standalone and also captures
 * JS errors (not just native crashes), which is what you actually need to see
 * why a screen white-screens in the field.
 */

let initialized = false;

export function initCrashReporting() {
  if (initialized) return;
  initialized = true;

  try {
    // eslint-disable-next-line global-require
    const { SENTRY_DSN, APP_ENV } = require('@env');
    if (!SENTRY_DSN) return; // no DSN yet → stay a no-op, never touch the Sentry package

    // Lazy require so the app runs fine before the package is installed.
    // eslint-disable-next-line global-require
    const Sentry = require('@sentry/react-native');

    Sentry.init({
      dsn: SENTRY_DSN,
      environment: APP_ENV || 'production',
      // Don't ship PII: scrub request bodies/headers if you add breadcrumbs later.
      tracesSampleRate: 0.1,
      enableAutoSessionTracking: true,
    });
  } catch {
    // package not installed / init failed → silently no-op, never crash on boot
  }
}

/** Attach the signed-in user to crash reports (call after login). */
export function setCrashUser(user) {
  try {
    // eslint-disable-next-line global-require
    const Sentry = require('@sentry/react-native');
    Sentry.setUser(user ? { id: String(user.id), username: user.name } : null);
  } catch {
    /* no-op */
  }
}

/** Manually report a handled error with context. */
export function captureHandled(error, context) {
  try {
    // eslint-disable-next-line global-require
    const Sentry = require('@sentry/react-native');
    Sentry.captureException(error, context ? { extra: context } : undefined);
  } catch {
    /* no-op */
  }
}
