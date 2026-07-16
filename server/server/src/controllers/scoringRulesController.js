import { Op } from 'sequelize'
import { ScoringRule, Lead } from '../models/index.js'
import { recalculateLeadScore } from '../services/leadScoringService.js'

/**
 * GET /scoring-rules
 * List all scoring rules for the company.
 */
export async function getScoringRules(req, res) {
  try {
    const { companyId } = req.user
    const workspaceId = req.headers['x-workspace-id']

    const where = { companyId }
    if (workspaceId) {
      where[Op.or] = [{ workspaceId }, { workspaceId: null }]
    }

    const rules = await ScoringRule.findAll({
      where,
      order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
    })

    return res.json({ success: true, data: rules })
  } catch (err) {
    console.error('[scoringRules] getScoringRules:', err.message)
    return res.status(500).json({ success: false, error: { message: 'Failed to fetch scoring rules.' } })
  }
}

/**
 * POST /scoring-rules
 * Create a new scoring rule.
 */
export async function createScoringRule(req, res) {
  try {
    const { companyId } = req.user
    const workspaceId = req.headers['x-workspace-id']
    const { name, ruleType, fieldName, operator, value, points, sortOrder, isActive } = req.body

    if (!name) {
      return res.status(400).json({ success: false, error: { message: 'name is required.' } })
    }
    if (!ruleType) {
      return res.status(400).json({ success: false, error: { message: 'ruleType is required.' } })
    }
    if (!operator) {
      return res.status(400).json({ success: false, error: { message: 'operator is required.' } })
    }
    if (points === undefined || points === null) {
      return res.status(400).json({ success: false, error: { message: 'points is required.' } })
    }

    const rule = await ScoringRule.create({
      companyId,
      workspaceId: workspaceId || null,
      name,
      ruleType,
      fieldName: fieldName || null,
      operator,
      value: value !== undefined ? String(value) : null,
      points: Number(points),
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    })

    return res.status(201).json({ success: true, data: rule })
  } catch (err) {
    console.error('[scoringRules] createScoringRule:', err.message)
    return res.status(500).json({ success: false, error: { message: 'Failed to create scoring rule.' } })
  }
}

/**
 * PUT /scoring-rules/:id
 * Update a scoring rule.
 */
export async function updateScoringRule(req, res) {
  try {
    const { companyId } = req.user
    const rule = await ScoringRule.findOne({ where: { id: req.params.id, companyId } })

    if (!rule) {
      return res.status(404).json({ success: false, error: { message: 'Scoring rule not found.' } })
    }

    const { name, ruleType, fieldName, operator, value, points, sortOrder, isActive } = req.body

    await rule.update({
      ...(name !== undefined && { name }),
      ...(ruleType !== undefined && { ruleType }),
      ...(fieldName !== undefined && { fieldName }),
      ...(operator !== undefined && { operator }),
      ...(value !== undefined && { value: value !== null ? String(value) : null }),
      ...(points !== undefined && { points: Number(points) }),
      ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
      ...(isActive !== undefined && { isActive: Boolean(isActive) }),
    })

    return res.json({ success: true, data: rule })
  } catch (err) {
    console.error('[scoringRules] updateScoringRule:', err.message)
    return res.status(500).json({ success: false, error: { message: 'Failed to update scoring rule.' } })
  }
}

/**
 * DELETE /scoring-rules/:id
 * Delete a scoring rule.
 */
export async function deleteScoringRule(req, res) {
  try {
    const { companyId } = req.user
    const rule = await ScoringRule.findOne({ where: { id: req.params.id, companyId } })

    if (!rule) {
      return res.status(404).json({ success: false, error: { message: 'Scoring rule not found.' } })
    }

    await rule.destroy()
    return res.json({ success: true, data: { message: 'Scoring rule deleted.' } })
  } catch (err) {
    console.error('[scoringRules] deleteScoringRule:', err.message)
    return res.status(500).json({ success: false, error: { message: 'Failed to delete scoring rule.' } })
  }
}

/**
 * POST /scoring-rules/reorder
 * Bulk update sort_order. Body: { orderedIds: [...] }
 */
export async function reorderScoringRules(req, res) {
  try {
    const { companyId } = req.user
    const { orderedIds } = req.body

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({ success: false, error: { message: 'orderedIds array is required.' } })
    }

    // Update each rule's sortOrder in parallel
    await Promise.all(
      orderedIds.map((id, idx) =>
        ScoringRule.update(
          { sortOrder: idx },
          { where: { id, companyId } }
        )
      )
    )

    return res.json({ success: true, data: { message: 'Scoring rules reordered.' } })
  } catch (err) {
    console.error('[scoringRules] reorderScoringRules:', err.message)
    return res.status(500).json({ success: false, error: { message: 'Failed to reorder scoring rules.' } })
  }
}

/**
 * POST /scoring-rules/recalculate
 * Trigger batch recalculation for all leads in the company.
 * Processes in batches of 100 to avoid memory exhaustion.
 */
export async function recalculateAllLeadScores(req, res) {
  try {
    const { companyId } = req.user

    // Respond immediately then process in background
    res.json({
      success: true,
      data: { message: 'Lead score recalculation started in background.' },
    })

    // Background batch processing
    ;(async () => {
      const BATCH_SIZE = 100
      let offset = 0
      let processed = 0
      let errors = 0

      try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const leads = await Lead.findAll({
            where: { companyId, isDeleted: false },
            attributes: ['id', 'email', 'phone', 'value', 'closingDate', 'status', 'source', 'score'],
            limit: BATCH_SIZE,
            offset,
          })

          if (leads.length === 0) break

          for (const lead of leads) {
            try {
              await recalculateLeadScore(lead, companyId)
              processed++
            } catch (e) {
              errors++
            }
          }

          offset += leads.length
          if (leads.length < BATCH_SIZE) break
        }
        console.log(`[scoringRules] recalculateAll complete — processed: ${processed}, errors: ${errors}`)
      } catch (e) {
        console.error('[scoringRules] recalculateAll background error:', e.message)
      }
    })()
  } catch (err) {
    console.error('[scoringRules] recalculateAllLeadScores:', err.message)
    return res.status(500).json({ success: false, error: { message: 'Failed to trigger recalculation.' } })
  }
}
