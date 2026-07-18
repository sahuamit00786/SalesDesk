/* eslint-disable react-refresh/only-export-components -- hook co-located with thin provider */
import { createContext, useContext, useMemo } from 'react'

const WorkflowRunOverlayContext = createContext(null)

export function WorkflowRunOverlayProvider({ children, stepsByNodeId }) {
  const value = useMemo(() => ({ stepsByNodeId: stepsByNodeId || {} }), [stepsByNodeId])
  return <WorkflowRunOverlayContext.Provider value={value}>{children}</WorkflowRunOverlayContext.Provider>
}

export function useWorkflowRunStep(nodeId) {
  const ctx = useContext(WorkflowRunOverlayContext)
  if (!ctx || !nodeId) return null
  return ctx.stepsByNodeId[nodeId] ?? null
}
