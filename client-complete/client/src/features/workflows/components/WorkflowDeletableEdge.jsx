import { memo, useCallback, useState } from 'react'
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, useReactFlow } from '@xyflow/react'
import { X } from '@/components/ui/icons'

function WorkflowDeletableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  markerStart,
  interactionWidth,
  pathOptions,
  selected,
}) {
  const rf = useReactFlow()
  const [hovered, setHovered] = useState(false)
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    ...(pathOptions && typeof pathOptions === 'object' ? pathOptions : {}),
  })

  const onDelete = useCallback(
    (e) => {
      e.stopPropagation()
      if (id) void rf.deleteElements({ edges: [{ id }] })
    },
    [id, rf],
  )

  const showBtn = hovered || selected

  return (
    <>
      <g
        className="react-flow__edge-path-group"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <BaseEdge
          path={edgePath}
          markerEnd={markerEnd}
          markerStart={markerStart}
          interactionWidth={interactionWidth ?? 28}
          style={{
            ...style,
            strokeWidth: selected ? 2.5 : style?.strokeWidth ?? 2,
          }}
        />
      </g>
      {showBtn ? (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <button
              type="button"
              title="Remove connection"
              aria-label="Remove connection"
              onClick={onDelete}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-rose-200 bg-white text-rose-600 shadow-md transition-colors hover:border-rose-300 hover:bg-rose-50 dark:border-rose-500/40 dark:bg-ink dark:text-rose-300 dark:hover:bg-rose-950/40"
            >
              <X className="h-4 w-4 shrink-0" strokeWidth={2.5} />
            </button>
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  )
}

export default memo(WorkflowDeletableEdge)
