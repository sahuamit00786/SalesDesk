# Workflows (Phase 1) — internal handoff

## Definition JSON (schema v1)

Workflows are stored in `workflows.definition_json` (camelCase `definitionJson` in the API) as a single object. Optional **`runtime_state_json`** (camelCase `runtimeStateJson`) holds server-managed state such as assign-owner round-robin cursors; the editor does not need to send it (patching `definitionJson` leaves it unchanged).

| Field | Type | Description |
|-------|------|----------------|
| `nodes` | array | React Flow–compatible nodes (`id`, `type`, `position`, `data`). |
| `edges` | array | React Flow edges (`id`, `source`, `target`, optional `sourceHandle`). |

### Node `type` values (engine)

| `type` | Role | Notes |
|--------|------|--------|
| `triggerLeadCreated` | Trigger | Entry when a lead is created. |
| `triggerLeadUpdated` | Trigger | Entry when a lead is updated. |
| `conditionField` | Control | `data`: `field` (lead attribute: `status`, `source`, `sourceId`, `opportunityStage`, `isOpportunity`, contact fields, …), `operator` (`equals` \| `contains` \| `changed`), `value`. Lifecycle uses CRM keys from app constants (`new`, `contacted`, …). `source` uses system channel enums; `sourceId` / `opportunityStage` use names/ids from **Lead configuration** (`/lead-configuration`). `changed` ignores `value`. Branches: edge `sourceHandle` `true` / `false`. |
| `delayWait` | Control | `data`: `minutes` (0–10080). Run may go to `waiting` until `waitUntil` (see runner). |
| `actionAssignOwner` | Action | `data`: `userIds` (non-empty string[] of team user UUIDs, order = round-robin order). Legacy single `userId` is still read if `userIds` is empty. With **two or more** ids, the engine assigns the next lead using **round robin** and persists a per–workflow-node cursor in `workflows.runtime_state_json.assignOwnerRoundRobin[nodeId]` (requires migration). One id behaves as a fixed assignee. |
| `actionCreateTask` | Action | `data`: `title`, `taskType`, `dueInDays`, optional `description`, optional `assignedToUserId`. |
| `actionSendEmailTemplate` | Action | `data`: `templateId`. Uses BullMQ when `REDIS_URL` is set, otherwise inline send helper. |

Unknown node types are skipped by the runner (logged) but still allow edges for editor-only nodes later.

## Adding a new node type

1. **Server** — `server/src/services/workflowRunner.js`: branch in `executeNode` for your `type`, return `{ nextNodeId }`, `{ waiting: true }`, or `{ halt: true }` as appropriate. Reuse `pickNextNodeId` / `finishStep` patterns.
2. **Triggers** — If it is a trigger, extend `TRIGGER_TYPES` / `emitLeadWorkflowTriggers` (or equivalent emitter) and index workflows by trigger key if you add many triggers (performance note in plan).
3. **Client** — `client/src/features/workflows/workflowDefinition.js`: label in `WORKFLOW_NODE_TYPES`, defaults in `defaultNodeData`.
4. **Client** — `WorkflowNodes.jsx`: React component + register in `createWorkflowNodeTypes`.
5. **Migrations** — Only if you need new persisted fields on `workflows` / runs; graph shape stays in JSON.

## Operational limits

- **Redis**: Optional. Email template sends use `enqueueTemplateSendJob` when the queue exists; otherwise `runTemplateSendJobInline` runs in-process.
- **Delay nodes**: Runs in `waiting` state resume via `processWorkflowWakeups` (interval in `server/index.js`, ~30s). Do not rely on sub-minute precision without tightening the sweeper.
- **Permissions**: v1 REST uses existing `leads` view/edit permission checks (same as lead CRM access).

## Related files

- API: `server/src/controllers/workflowsController.js`, routes in `server/src/routes/v1/index.js`.
- Runner + wakeups: `server/src/services/workflowRunner.js`, `server/index.js`.
- Client editor: `client/src/features/workflows/components/WorkflowCanvas.jsx`, `WorkflowNodes.jsx`, pages under `client/src/pages/Workflow*.jsx`.
