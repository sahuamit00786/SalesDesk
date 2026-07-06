import { useMemo } from 'react'
import { parseKbModules } from './parseKbModules'

/** Builds a flat search index of module headings + FAQ questions across all KB sections. */
export function buildSearchIndex(sections) {
  const index = []
  for (const section of sections) {
    const { modules } = parseKbModules(section.content)
    for (const mod of modules) {
      index.push({
        sectionId: section.id,
        sectionLabel: section.label,
        moduleAnchor: mod.anchor,
        itemId: null,
        type: 'heading',
        text: mod.title,
        heading: mod.title,
      })
      mod.nodes.forEach((node, i) => {
        if (node.type !== 'faq') return
        index.push({
          sectionId: section.id,
          sectionLabel: section.label,
          moduleAnchor: mod.anchor,
          itemId: `${mod.anchor}--faq-${i}`,
          type: 'question',
          text: node.question,
          heading: mod.title,
        })
      })
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
