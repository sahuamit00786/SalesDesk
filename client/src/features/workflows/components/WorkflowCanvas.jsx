import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  MiniMap,
  Panel,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
  ReactFlowProvider,
  reconnectEdge,
  ConnectionLineType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Redo2, Undo2, GitBranch, Plus, Unlink2 } from 'lucide-react'
import { defaultNodeData, WORKFLOW_NODE_PALETTE } from '@/features/workflows/workflowDefinition'
import { createWorkflowNodeTypes } from '@/features/workflows/components/WorkflowNodes'
import WorkflowDeletableEdge from '@/features/workflows/components/WorkflowDeletableEdge'
import { cn } from '@/utils/cn'

const SNAP = 16

function newNodeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return `n-${crypto.randomUUID()}`
  return `n-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function serialize(nodes, edges) {
  return JSON.stringify({ nodes, edges })
}

function ToolbarButton({ children, onClick, label, disabled }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-ink hover:border-surface-border hover:bg-surface-muted',
        disabled && 'pointer-events-none opacity-40',
      )}
    >
      {children}
    </button>
  )
}

function WorkflowCanvasInner({
  workflowId,
  bootDef,
  onDebouncedSave,
  onSaveStatus,
  teamUsers,
  templates,
  leadSetup,
  onViewportControlsReady,
}) {
  const rf = useReactFlow()
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  const seededRef = useRef(false)
  const undoStack = useRef([])
  const redoStack = useRef([])
  const skipFirstSave = useRef(true)
  const saveTimer = useRef(null)

  useEffect(() => {
    nodesRef.current = nodes
    edgesRef.current = edges
  }, [nodes, edges])

  useEffect(() => {
    seededRef.current = false
    undoStack.current = []
    redoStack.current = []
    skipFirstSave.current = true
  }, [workflowId])

  useEffect(() => {
    if (!bootDef || seededRef.current) return
    seededRef.current = true
    setNodes(Array.isArray(bootDef.nodes) ? bootDef.nodes : [])
    const rawEdges = Array.isArray(bootDef.edges) ? bootDef.edges : []
    setEdges(rawEdges.map((e) => ({ ...e, type: e.type || 'smoothstep' })))
  }, [bootDef])

  const pushUndoSnapshot = useCallback(() => {
    const snap = serialize(nodesRef.current, edgesRef.current)
    undoStack.current.push(snap)
    if (undoStack.current.length > 45) undoStack.current.shift()
    redoStack.current = []
  }, [])

  const updateNodeData = useCallback((nodeId, patch) => {
    setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n)))
  }, [])

  const nodeTypes = useMemo(
    () =>
      createWorkflowNodeTypes({
        updateNodeData,
        teamUsers: teamUsers || [],
        templates: templates || [],
        leadSetup: leadSetup || null,
      }),
    [updateNodeData, teamUsers, templates, leadSetup],
  )

  const edgeTypes = useMemo(() => ({ smoothstep: WorkflowDeletableEdge }), [])

  const onNodesChange = useCallback(
    (changes) => {
      if (changes.some((c) => c.type === 'remove')) pushUndoSnapshot()
      setNodes((nds) => applyNodeChanges(changes, nds))
    },
    [pushUndoSnapshot],
  )

  const onEdgesChange = useCallback(
    (changes) => {
      if (changes.some((c) => c.type === 'remove')) pushUndoSnapshot()
      setEdges((eds) => applyEdgeChanges(changes, eds))
    },
    [pushUndoSnapshot],
  )

  const onNodesDelete = useCallback((deleted) => {
    if (!deleted?.length) return
    const ids = new Set(deleted.map((n) => n.id))
    setEdges((eds) => eds.filter((e) => !ids.has(e.source) && !ids.has(e.target)))
  }, [])

  const onConnect = useCallback(
    (params) => {
      pushUndoSnapshot()
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'smoothstep',
            animated: true,
            style: { strokeWidth: 2 },
          },
          eds,
        ),
      )
    },
    [pushUndoSnapshot],
  )

  const onReconnect = useCallback(
    (oldEdge, newConnection) => {
      pushUndoSnapshot()
      setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds))
    },
    [pushUndoSnapshot],
  )

  const onReconnectEnd = useCallback(
    (_evt, edge, _handleType, connectionState) => {
      const droppedOnHandle =
        connectionState.isValid === true &&
        connectionState.toHandle != null &&
        connectionState.toNode != null
      if (droppedOnHandle) return
      pushUndoSnapshot()
      setEdges((eds) => eds.filter((e) => e.id !== edge.id))
    },
    [pushUndoSnapshot],
  )

  const detachSelectedEdges = useCallback(() => {
    if (!edgesRef.current.some((e) => e.selected)) return
    pushUndoSnapshot()
    setEdges((eds) => eds.filter((e) => !e.selected))
  }, [pushUndoSnapshot])

  const dragSnapshot = useRef(null)
  const onNodeDragStart = useCallback(() => {
    dragSnapshot.current = serialize(nodesRef.current, edgesRef.current)
  }, [])
  const onNodeDragStop = useCallback(() => {
    const before = dragSnapshot.current
    dragSnapshot.current = null
    if (!before) return
    const after = serialize(nodesRef.current, edgesRef.current)
    if (before !== after) pushUndoSnapshot()
  }, [pushUndoSnapshot])

  const undo = useCallback(() => {
    if (undoStack.current.length === 0) return
    const cur = serialize(nodesRef.current, edgesRef.current)
    redoStack.current.push(cur)
    const prev = undoStack.current.pop()
    try {
      const p = JSON.parse(prev)
      setNodes(p.nodes || [])
      setEdges((p.edges || []).map((e) => ({ ...e, type: e.type || 'smoothstep' })))
    } catch {
      /* ignore */
    }
  }, [])

  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return
    const cur = serialize(nodesRef.current, edgesRef.current)
    undoStack.current.push(cur)
    const next = redoStack.current.pop()
    try {
      const p = JSON.parse(next)
      setNodes(p.nodes || [])
      setEdges((p.edges || []).map((e) => ({ ...e, type: e.type || 'smoothstep' })))
    } catch {
      /* ignore */
    }
  }, [])

  const addPaletteNode = useCallback(
    (type) => {
      pushUndoSnapshot()
      const id = newNodeId()
      const p = rf.screenToFlowPosition({ x: window.innerWidth * 0.42, y: window.innerHeight * 0.38 })
      setNodes((nds) =>
        nds.concat({
          id,
          type,
          position: { x: Math.round(p.x / SNAP) * SNAP, y: Math.round(p.y / SNAP) * SNAP },
          data: { ...defaultNodeData(type) },
        }),
      )
    },
    [pushUndoSnapshot, rf],
  )

  const viewportReadyRef = useRef(onViewportControlsReady)
  viewportReadyRef.current = onViewportControlsReady

  useEffect(() => {
    const api = {
      zoomIn: () => rf.zoomIn({ duration: 200 }),
      zoomOut: () => rf.zoomOut({ duration: 200 }),
      fitView: () => rf.fitView({ padding: 0.2, duration: 250 }),
    }
    viewportReadyRef.current?.(api)
    return () => {
      viewportReadyRef.current?.(null)
    }
  }, [rf])

  useEffect(() => {
    const onKey = (e) => {
      const el = e.target
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) return
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  useEffect(() => {
    if (!seededRef.current) return
    if (skipFirstSave.current) {
      skipFirstSave.current = false
      return
    }
    if (saveTimer.current) clearTimeout(saveTimer.current)
    onSaveStatus?.('saving')
    saveTimer.current = setTimeout(() => {
      const def = { nodes: nodesRef.current, edges: edgesRef.current }
      Promise.resolve(onDebouncedSave(def))
        .then(() => onSaveStatus?.('saved'))
        .catch(() => onSaveStatus?.('error'))
    }, 650)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [nodes, edges, onDebouncedSave, onSaveStatus])

  return (
    <div className="relative h-[calc(100dvh-8rem)] min-h-[420px] w-full rounded-2xl border border-surface-border bg-surface-muted/40 dark:bg-ink/20">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodesDelete={onNodesDelete}
        onConnect={onConnect}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        snapToGrid
        snapGrid={[SNAP, SNAP]}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={1.8}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: { strokeWidth: 2 },
        }}
        connectionLineType={ConnectionLineType.SmoothStep}
        onReconnect={onReconnect}
        onReconnectEnd={onReconnectEnd}
        proOptions={{ hideAttribution: true }}
        deleteKeyCode={['Backspace', 'Delete']}
        selectionOnDrag
        panOnScroll
        className="h-full w-full rounded-2xl"
      >
        <Background gap={SNAP} size={1} className="!bg-transparent" />
        <MiniMap
          className="!m-3 !rounded-xl !border !border-surface-border !bg-white/90"
          maskColor="rgba(15, 23, 42, 0.12)"
          nodeStrokeWidth={2}
        />
        <Panel
          position="top-left"
          className="!left-3 !top-3 !bottom-3 !m-0 flex w-[240px] flex-col overflow-hidden rounded-2xl border border-surface-border bg-white/90 shadow-lg backdrop-blur-sm dark:bg-ink/90"
        >
          <div className="flex shrink-0 items-center gap-1.5 border-b border-surface-border/80 px-2 py-2 text-[11px] font-bold uppercase tracking-wide text-ink-muted">
            <GitBranch className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Add node
          </div>
          <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
            <div className="flex flex-col gap-3">
              {WORKFLOW_NODE_PALETTE.map((section) => (
                <div key={section.category}>
                  <div className="px-1 text-[10px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">
                    {section.category}
                  </div>
                  {section.description ? (
                    <p className="mt-0.5 px-1 text-[10px] leading-snug text-ink-muted">{section.description}</p>
                  ) : null}
                  <div className="mt-1.5 flex flex-col gap-1">
                    {section.items.map(({ type, label, hint }) => (
                      <button
                        key={type}
                        type="button"
                        title={hint || label}
                        onClick={() => addPaletteNode(type)}
                        className="flex w-full flex-col gap-0.5 rounded-xl border border-surface-border bg-white/90 px-2.5 py-2 text-left shadow-sm hover:border-violet-200 hover:bg-violet-50/60 dark:bg-ink/80 dark:hover:border-violet-500/40 dark:hover:bg-violet-950/20"
                      >
                        <span className="flex items-center gap-2 text-xs font-semibold text-ink">
                          <Plus className="h-3.5 w-3.5 shrink-0 text-violet-600" aria-hidden />
                          <span className="min-w-0 truncate">{label}</span>
                        </span>
                        {hint ? <span className="pl-7 text-[10px] leading-snug text-ink-muted">{hint}</span> : null}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Panel>
        <Panel position="top-center" className="!m-3 flex flex-wrap items-center gap-2 rounded-2xl border border-surface-border bg-white/95 px-2 py-1.5 shadow-lg backdrop-blur-sm dark:bg-ink/90">
          <ToolbarButton label="Undo" onClick={undo}>
            <Undo2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Redo" onClick={redo}>
            <Redo2 className="h-4 w-4" />
          </ToolbarButton>
          <div className="mx-0.5 h-6 w-px shrink-0 bg-surface-border" aria-hidden />
          <ToolbarButton
            label="Detach selected connections (or press Delete)"
            onClick={detachSelectedEdges}
            disabled={!edges.some((e) => e.selected)}
          >
            <Unlink2 className="h-4 w-4" />
          </ToolbarButton>
        </Panel>
      </ReactFlow>
    </div>
  )
}

export function WorkflowCanvas(props) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  )
}
