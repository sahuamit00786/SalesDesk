const CURRENCY_LOCALE = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  AUD: 'en-AU',
  CAD: 'en-CA',
  AED: 'en-AE',
  SGD: 'en-SG',
};

export function formatMoney(value, currency = 'USD', { compact = false, decimals } = {}) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  const code = String(currency || 'USD').toUpperCase();
  const locale = CURRENCY_LOCALE[code] || 'en-US';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      notation: compact && Math.abs(num) >= 10000 ? 'compact' : 'standard',
      maximumFractionDigits: decimals ?? (Number.isInteger(num) ? 0 : 2),
    }).format(num);
  } catch {
    return `${code} ${num.toLocaleString()}`;
  }
}

export function formatNumber(value, { compact = false } = {}) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  return new Intl.NumberFormat('en-US', {
    notation: compact && Math.abs(num) >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(num);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(input, { withYear = true } = {}) {
  const d = input instanceof Date ? input : new Date(input);
  if (!input || Number.isNaN(d.getTime())) return '—';
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return withYear ? `${base} ${d.getFullYear()}` : base;
}

export function formatTime(input) {
  const d = input instanceof Date ? input : new Date(input);
  if (!input || Number.isNaN(d.getTime())) return '—';
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

export function formatDateTime(input) {
  const d = input instanceof Date ? input : new Date(input);
  if (!input || Number.isNaN(d.getTime())) return '—';
  return `${formatDate(d)}, ${formatTime(d)}`;
}

export function relativeTime(input) {
  const d = input instanceof Date ? input : new Date(input);
  if (!input || Number.isNaN(d.getTime())) return '—';
  const diff = Date.now() - d.getTime();
  const abs = Math.abs(diff);
  const suffix = diff >= 0 ? 'ago' : 'from now';
  const min = Math.round(abs / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ${suffix}`;
  const hrs = Math.round(min / 60);
  if (hrs < 24) return `${hrs}h ${suffix}`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ${suffix}`;
  if (days < 30) return `${Math.round(days / 7)}w ${suffix}`;
  return formatDate(d, { withYear: d.getFullYear() !== new Date().getFullYear() });
}

export function formatDuration(seconds) {
  const s = Number(seconds);
  if (!Number.isFinite(s) || s < 0) return '—';
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${Math.round(s % 60)}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

/** Always-granular hh:mm:ss style breakdown (e.g. "1h 05m 32s") — for call log detail, not chat-style "5m ago" copy. */
export function formatDurationExact(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`;
  if (m > 0) return `${m}m ${String(sec).padStart(2, '0')}s`;
  return `${sec}s`;
}

export function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/** ISO date (yyyy-mm-dd) in local time — for API date params. */
export function toISODate(input) {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
