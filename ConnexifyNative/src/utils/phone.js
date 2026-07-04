// Digit-only comparison — server stores phone as raw typed string (no normalization),
// so matching device call numbers to leads has to happen client-side on digits.
export function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

/** Last N digits, used so "+1 415-555-0100" matches a lead stored as "415-555-0100". */
export function phoneKey(value, tailLength = 10) {
  const digits = digitsOnly(value);
  if (!digits) return '';
  return digits.slice(-tailLength);
}
