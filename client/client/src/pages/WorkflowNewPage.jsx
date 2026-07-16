import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

/** Legacy route — opens create modal on the workflows list. */
export function WorkflowNewPage() {
  const navigate = useNavigate()

  useEffect(() => {
    navigate('/automation?new=1', { replace: true })
  }, [navigate])

  return null
}
