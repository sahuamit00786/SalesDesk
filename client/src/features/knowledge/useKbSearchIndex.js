import { useMemo } from 'react'
import { uniqueSlug } from './slug'

const HEADING_RE = /^(#{2,3})\s+(.*)$/
const QUESTION_RE = /^\*\*(.+?)\*\*$/

function stripMarkup(text) {
  return text.replace(/[*_`]/g, '').trim()
}

/** Builds a flat search index of headings + FAQ questions across all KB sections. */
export function buildSearchIndex(sections) {
  const index = []
  for (const section of sections) {
    const seen = new Map()
    let currentAnchor = null
    let currentHeading = ''
    const lines = section.content.split('\n')
    for (const raw of lines) {
      const line = raw.trim()
      const hMatch = line.match(HEADING_RE)
      if (hMatch) {
        const text = stripMarkup(hMatch[2])
        const slug = uniqueSlug(text, seen)
        currentAnchor = slug
        currentHeading = text
        index.push({
          sectionId: section.id,
          sectionLabel: section.label,
          anchor: slug,
          type: 'heading',
          text,
          heading: text,
        })
        continue
      }
      const qMatch = line.match(QUESTION_RE)
      if (qMatch && currentAnchor) {
        const text = stripMarkup(qMatch[1])
        if (text.length > 3) {
          index.push({
            sectionId: section.id,
            sectionLabel: section.label,
            anchor: currentAnchor,
            type: 'question',
            text,
            heading: currentHeading,
          })
        }
      }
    }
  }
  return index
}

export function useKbSearchIndex(sections) {
  return useMemo(() => buildSearchIndex(sections), [sections])
}

export function searchKbIndex(index, query, limit = 20) {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const scored = []
  for (const entry of index) {
    const haystack = `${entry.text} ${entry.heading}`.toLowerCase()
    const idx = haystack.indexOf(q)
    if (idx === -1) continue
    const score =
      (entry.type === 'question' ? 0 : 1) +
      (entry.text.toLowerCase().startsWith(q) ? 0 : 0.5) +
      idx * 0.001
    scored.push({ ...entry, score })
  }
  scored.sort((a, b) => a.score - b.score)
  return scored.slice(0, limit)
}
