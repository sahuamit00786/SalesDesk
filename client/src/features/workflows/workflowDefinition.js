/** Default graph when creating a workflow (React Flow shape). */
export function defaultWorkflowDefinition() {
  return {
    nodes: [
      {
        id: 'trigger-1',
        type: 'triggerLeadCreated',
        position: { x: 120, y: 160 },
        data: {},
      },
    ],
    edges: [],
  }
}

export { LEAD_TASK_TYPE_OPTIONS as WORKFLOW_TASK_TYPE_OPTIONS } from '@/features/leads/components/LeadTaskDrawer'
export { LEAD_TASK_PRIORITY_OPTIONS as WORKFLOW_TASK_PRIORITY_OPTIONS } from '@/features/leads/components/LeadTaskDrawer'

/** Schedule follow-up on the lead for the current assignee (after Assign owner, that user). */
export const WORKFLOW_FOLLOWUP_DELAY_PRESETS = [
  { value: '5m', label: '5 minutes later' },
  { value: '10m', label: '10 minutes later' },
  { value: '15m', label: '15 minutes later' },
  { value: '1h', label: '1 hour later' },
  { value: '2h', label: '2 hours later' },
  { value: '4h', label: '4 hours later' },
  { value: '8h', label: '8 hours later' },
  { value: '24h', label: '24 hours later' },
]

/** Flat map type → short label (nodes, minimap, saves). */
export const WORKFLOW_NODE_TYPES = {
  triggerLeadCreated: 'Lead created',
  triggerLeadUpdated: 'Lead updated',
  conditionField: 'Condition',
  delayWait: 'Delay',
  actionAssignOwner: 'Assign owner',
  actionCreateTask: 'Create task',
  actionCreateFollowup: 'Create follow-up',
  actionSendEmailTemplate: 'Send email (template)',
}

/**
 * Palette sections for the editor (order = display order).
 * @type {Array<{ category: string, description?: string, items: Array<{ type: string, label: string, hint?: string }> }>}
 */
export const WORKFLOW_NODE_PALETTE = [
  {
    category: 'Triggers',
    description: 'Start the flow when something happens to a lead.',
    items: [
      { type: 'triggerLeadCreated', label: 'Lead created', hint: 'Fires once when a new lead is saved.' },
      { type: 'triggerLeadUpdated', label: 'Lead updated', hint: 'Fires after any lead field change (use conditions to narrow).' },
    ],
  },
  {
    category: 'Control',
    description: 'Branch or wait before actions.',
    items: [
      { type: 'conditionField', label: 'Condition', hint: 'Compare a lead field (lifecycle, source, pipeline, etc.).' },
      { type: 'delayWait', label: 'Delay', hint: 'Pause until a duration elapses (server checks ~30s).' },
    ],
  },
  {
    category: 'Actions',
    description: 'Side effects on the lead or workspace.',
    items: [
      { type: 'actionAssignOwner', label: 'Assign owner', hint: 'Set assignee to one teammate, or several — leads rotate fairly (round robin).' },
      { type: 'actionCreateTask', label: 'Create task', hint: 'Add a lead task with optional subtasks (same shape as the task drawer).' },
      {
        type: 'actionCreateFollowup',
        label: 'Create follow-up',
        hint: 'Schedule a lead follow-up for the assignee after a short delay (e.g. 5–15 min or hours).',
      },
      { type: 'actionSendEmailTemplate', label: 'Send email (template)', hint: 'Queue or send using an email template.' },
    ],
  },
]

export function defaultConditionValueForField(field) {
  switch (field) {
    case 'status':
      return 'new'
    case 'source':
      return 'web_form'
    case 'sourceId':
      return ''
    case 'opportunityStage':
      return ''
    case 'isOpportunity':
      return 'true'
    default:
      return ''
  }
}

export function defaultNodeData(type) {
  switch (type) {
    case 'actionAssignOwner':
      return { userIds: [], userId: '' }
    case 'actionCreateTask':
      return {
        title: 'Follow up',
        description: '',
        taskType: 'follow_up',
        priority: 'medium',
        assigneeMode: 'from_lead',
        assignedToUserId: '',
        dueMode: 'relative_days',
        dueInDays: 3,
        dueAtIso: '',
        subtasks: [],
      }
    case 'actionCreateFollowup':
      return { delayPreset: '15m', remark: '' }
    case 'actionSendEmailTemplate':
      return { templateId: '' }
    case 'conditionField':
      return { field: 'status', operator: 'equals', value: defaultConditionValueForField('status') }
    case 'delayWait':
      return { minutes: 5 }
    default:
      return {}
  }
}
