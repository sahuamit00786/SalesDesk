import { useEffect } from 'react'

/** Sets document.title + meta description for the duration of a page, restoring on unmount. */
export function useDocumentMeta(title, description) {
  useEffect(() => {
    const prevTitle = document.title
    document.title = title

    let meta = document.querySelector('meta[name="description"]')
    let created = false
    const prevDesc = meta ? meta.getAttribute('content') : null
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'description')
      document.head.appendChild(meta)
      created = true
    }
    if (description) meta.setAttribute('content', description)

    return () => {
      document.title = prevTitle
      if (created) meta.remove()
      else if (prevDesc != null) meta.setAttribute('content', prevDesc)
      else meta.removeAttribute('content')
    }
  }, [title, description])
}
