import { useCallback, useMemo, useState } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  MiniMap,
  Panel,
  MarkerType,
  Handle,
  Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { X, ArrowRight, ArrowLeft } from '@/components/ui/icons'
import { cn } from '@/utils/cn'
import { NODES, EDGES, LANES, laneOf } from '@/features/systemWorkflow/systemWorkflowData'

const NODE_W = 190

function ModuleNode({ id, data }) {
  const lane = laneOf(data.lane)
  const dimmed = data.focusState === 'dimmed'
  const focused = data.focusState === 'focused'
  return (
    <button
      type="button"
      onClick={() => data.onSelect(id)}
      style={{
        borderLeftColor: lane.accent,
        backgroundColor: focused ? lane.tint : undefined,
      }}
      className={cn(
        'nodrag w-[190px] rounded-xl border border-surface-border border-l-[4px] bg-white px-3 py-2.5 text-left shadow-sm transition-all duration-150 dark:bg-ink/80',
        dimmed && 'opacity-25',
        focused && 'shadow-md ring-2 ring-offset-1',
        !dimmed && !focused && 'hover:shadow-md',
      )}
    >
      <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
      <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: lane.accent }}>
        {lane.label}
      </div>
      <div className="mt-0.5 text-[13px] font-semibold leading-snug text-ink">{data.label}</div>
      <div className="mt-1 line-clamp-2 text-[10.5px] leading-snug text-ink-muted">{data.description}</div>
      <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
    </button>
  )
}

const NODE_TYPES = { moduleNode: ModuleNode }

function edgeColor(edge) {
  if (edge.kind === 'flow') return laneOf(NODES.find((n) => n.id === edge.source)?.lane)?.accent || '#5B21B6'
  if (edge.kind === 'ref') return '#94A3B8'
  return '#CBD5E1'
}

function DetailPanel({ node, onClose }) {
  if (!node) return null
  const lane = laneOf(node.lane)
  const incoming = EDGES.filter((e) => e.target === node.id)
  const outgoing = EDGES.filter((e) => e.source === node.id)
  const labelOf = (id) => NODES.find((n) => n.id === id)?.label || id

  return (
    <Panel
      position="top-right"
      className="!m-3 flex max-h-[calc(100%-24px)] w-[320px] flex-col overflow-hidden rounded-2xl border border-surface-border bg-white/98 shadow-xl backdrop-blur-sm dark:bg-ink/95"
    >
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-surface-border/80 px-4 py-3">
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: lane.accent }}>
            {lane.label}
          </div>
          <div className="mt-0.5 text-sm font-bold text-ink">{node.label}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-1 text-ink-muted hover:bg-surface-muted hover:text-ink"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="scrollbar-subtle min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        <p className="text-[12.5px] leading-snug text-ink">{node.description}</p>

        {node.context ? (
          <div className="rounded-lg border border-dashed border-surface-border bg-surface-muted/50 px-2.5 py-2 text-[11px] leading-snug text-ink-muted">
            {node.context}
          </div>
        ) : null}

        {node.flow ? (
          <div>
            <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-muted">User flow</div>
            <ol className="space-y-1.5">
              {node.flow.map((f, i) => (
                <li key={i} className="flex gap-2 text-[12px] leading-snug">
                  <span
                    className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                    style={{ backgroundColor: lane.accent }}
                  >
                    {i + 1}
                  </span>
                  <span>
                    <span className="font-medium text-ink">{f.step}</span>
                    {f.note ? <span className="text-ink-muted"> — {f.note}</span> : null}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-1.5">
          {node.routes.map((r) => (
            <span key={r} className="rounded-md bg-surface-subtle px-1.5 py-0.5 font-mono text-[10px] text-brand-700 dark:text-violet-300">
              {r}
            </span>
          ))}
          {node.permission ? (
            <span className="rounded-md border border-surface-border px-1.5 py-0.5 font-mono text-[10px] text-ink-muted">
              {node.permission}
            </span>
          ) : null}
        </div>

        {incoming.length > 0 ? (
          <div>
            <div className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-ink-muted">
              <ArrowRight className="h-3 w-3" /> Data in
            </div>
            <ul className="space-y-1">
              {incoming.map((e) => (
                <li key={e.id} className="text-[11.5px] leading-snug text-ink">
                  <span className="font-medium">{labelOf(e.source)}</span>{' '}
                  <span className="text-ink-muted">— {e.label}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {outgoing.length > 0 ? (
          <div>
            <div className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-ink-muted">
              <ArrowLeft className="h-3 w-3 rotate-180" /> Data out
            </div>
            <ul className="space-y-1">
              {outgoing.map((e) => (
                <li key={e.id} className="text-[11.5px] leading-snug text-ink">
                  <span className="font-medium">{labelOf(e.target)}</span>{' '}
                  <span className="text-ink-muted">— {e.label}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Panel>
  )
}

function Legend() {
  return (
    <Panel
      position="bottom-left"
      className="!m-3 flex flex-col gap-2 rounded-2xl border border-surface-border bg-white/95 px-3 py-2.5 text-[10.5px] shadow-lg backdrop-blur-sm dark:bg-ink/90"
    >
      <div className="flex items-center gap-2">
        <span className="h-0.5 w-5 rounded-full bg-brand-600" />
        <span className="text-ink-muted">Creates / converts a record</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="h-0.5 w-5 rounded-full bg-slate-400" style={{ backgroundImage: 'repeating-linear-gradient(90deg,#94A3B8 0 4px,transparent 4px 7px)' }} />
        <span className="text-ink-muted">Logged against / triggers</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="h-0.5 w-5 rounded-full" style={{ backgroundImage: 'repeating-linear-gradient(90deg,#CBD5E1 0 2px,transparent 2px 5px)' }} />
        <span className="text-ink-muted">Read-only into Reports</span>
      </div>
      <div className="mt-0.5 border-t border-surface-border/80 pt-1.5 text-[10px] text-ink-muted">Click a node to trace its data</div>
    </Panel>
  )
}

function SystemWorkflowDiagramInner({ className }) {
  const [selectedId, setSelectedId] = useState(null)

  const neighborIds = useMemo(() => {
    if (!selectedId) return null
    const set = new Set([selectedId])
    EDGES.forEach((e) => {
      if (e.source === selectedId) set.add(e.target)
      if (e.target === selectedId) set.add(e.source)
    })
    return set
  }, [selectedId])

  const onSelect = useCallback((id) => {
    setSelectedId((cur) => (cur === id ? null : id))
  }, [])

  const nodes = useMemo(
    () =>
      NODES.map((n) => ({
        id: n.id,
        type: 'moduleNode',
        position: { x: n.x, y: n.y },
        data: {
          ...n,
          onSelect,
          focusState: !selectedId ? 'neutral' : neighborIds?.has(n.id) ? (n.id === selectedId ? 'focused' : 'neutral') : 'dimmed',
        },
        draggable: true,
        width: NODE_W,
      })),
    [selectedId, neighborIds, onSelect],
  )

  const edges = useMemo(
    () =>
      EDGES.map((e) => {
        const active = !selectedId || e.source === selectedId || e.target === selectedId
        const color = edgeColor(e)
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          type: 'smoothstep',
          animated: e.kind === 'flow' && active,
          style: {
            stroke: color,
            strokeWidth: e.kind === 'flow' ? 2 : e.kind === 'ref' ? 1.5 : 1.1,
            strokeDasharray: e.kind === 'flow' ? undefined : e.kind === 'ref' ? '6 4' : '1.5 4',
            opacity: active ? (e.kind === 'insight' ? 0.6 : 1) : 0.08,
          },
          markerEnd: e.kind === 'insight' ? undefined : { type: MarkerType.ArrowClosed, color, width: 14, height: 14 },
        }
      }),
    [selectedId],
  )

  const selectedNode = selectedId ? NODES.find((n) => n.id === selectedId) : null

  return (
    <div
      className={cn(
        'relative w-full rounded-2xl border border-surface-border bg-surface-muted/40 dark:bg-ink/20',
        className || 'h-[calc(100dvh-8rem)] min-h-[520px]',
      )}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        nodesConnectable={false}
        elementsSelectable
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.2}
        maxZoom={1.6}
        proOptions={{ hideAttribution: true }}
        panOnScroll
        onPaneClick={() => setSelectedId(null)}
        className="h-full w-full rounded-2xl"
      >
        <Background gap={16} size={1} className="!bg-transparent" />
        <MiniMap
          className="!m-3 !rounded-xl !border !border-surface-border !bg-white/90"
          maskColor="rgba(15, 23, 42, 0.12)"
          nodeColor={(n) => laneOf(n.data.lane)?.accent || '#94A3B8'}
          nodeStrokeWidth={2}
        />
        <Panel
          position="top-left"
          className="!m-3 flex flex-col gap-1 rounded-2xl border border-surface-border bg-white/95 px-3 py-2.5 text-[10.5px] shadow-lg backdrop-blur-sm dark:bg-ink/90"
        >
          {LANES.map((l) => (
            <div key={l.id} className="flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: l.accent }} />
              <span className="text-ink-muted">{l.label}</span>
            </div>
          ))}
        </Panel>
        <Legend />
        <DetailPanel node={selectedNode} onClose={() => setSelectedId(null)} />
      </ReactFlow>
    </div>
  )
}

export function SystemWorkflowDiagram({ className }) {
  return (
    <ReactFlowProvider>
      <SystemWorkflowDiagramInner className={className} />
    </ReactFlowProvider>
  )
}
