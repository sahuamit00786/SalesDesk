import { uniqueSlug } from './slug'

const H1_RE = /^#\s+(.*)$/
const H2_RE = /^##\s+(.*)$/
const QUESTION_RE = /^\*\*(.+?)\*\*$/

function stripMarkup(text) {
  return text.replace(/[*_`]/g, '').trim()
}

function looksLikeQuestion(text) {
  if (text.length < 4) return false
  return text.endsWith('?') || /^q[:.]?\s/i.test(text)
}

/**
 * Turns one KB markdown document into a doc-level intro plus a list of
 * collapsible "modules" (each a top-level `##` heading). Inside a module,
 * consecutive bold "question" lines become FAQ accordion items; everything
 * else stays as a plain markdown chunk in original order.
 */
export function parseKbModules(markdown) {
  const lines = markdown.split('\n')
  const seen = new Map()
  const modules = []
  let current = null
  let buffer = []
  let currentQuestion = null
  const introLines = []
  let sawH2 = false

  function flushMarkdown() {
    const text = buffer.join('\n').trim()
    buffer = []
    if (text && current) current.nodes.push({ type: 'markdown', text })
  }

  function flushQuestion() {
    const text = buffer.join('\n').trim()
    buffer = []
    if (currentQuestion && current) {
      current.nodes.push({ type: 'faq', question: currentQuestion, answer: text })
    }
    currentQuestion = null
  }

  for (const raw of lines) {
    if (!sawH2 && H1_RE.test(raw)) continue // drop the doc H1 — the page already shows a category title
    const h2 = raw.match(H2_RE)
    if (h2) {
      if (currentQuestion) flushQuestion()
      else flushMarkdown()
      sawH2 = true
      const title = stripMarkup(h2[1])
      const anchor = uniqueSlug(title, seen)
      current = { anchor, title, nodes: [] }
      modules.push(current)
      continue
    }
    if (!sawH2) {
      introLines.push(raw)
      continue
    }
    const qMatch = raw.trim().match(QUESTION_RE)
    const questionText = qMatch ? stripMarkup(qMatch[1]) : null
    if (questionText && looksLikeQuestion(questionText)) {
      if (currentQuestion) flushQuestion()
      else flushMarkdown()
      currentQuestion = questionText
      continue
    }
    buffer.push(raw)
  }
  if (currentQuestion) flushQuestion()
  else flushMarkdown()

  return { intro: introLines.join('\n').trim(), modules }
}
