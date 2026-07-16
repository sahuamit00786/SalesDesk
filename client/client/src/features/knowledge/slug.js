/** Slugify a heading string for use as an anchor id. */
export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

/**
 * Slug that's unique within a given `seen` Map (heading text -> count).
 * Must be called in document order by both the search-index builder and the
 * markdown heading renderer so the two stay in sync for a given section.
 */
export function uniqueSlug(text, seen) {
  const base = slugify(text) || 'section'
  const count = seen.get(base) || 0
  seen.set(base, count + 1)
  return count === 0 ? base : `${base}-${count}`
}
