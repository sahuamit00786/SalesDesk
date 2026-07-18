/**
 * Read a single template id from the query string (last wins if duplicated).
 * Normalizes UUIDs to lowercase so URL, cache keys, and API payloads stay aligned.
 */
export function pickTemplateIdFromSearch(search, primaryKey, legacyKey = 'templateId') {
  const sp = new URLSearchParams(typeof search === 'string' ? search : '')
  const primary = sp.getAll(primaryKey).map((s) => String(s || '').trim()).filter(Boolean)
  if (primary.length) return normalizeTemplateId(primary[primary.length - 1])
  const legacy = sp.get(legacyKey)?.trim()
  return normalizeTemplateId(legacy || '')
}

export function normalizeTemplateId(id) {
  const t = String(id || '').trim()
  if (!t) return ''
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)) return t.toLowerCase()
  return t
}
