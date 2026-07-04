import { get, patch } from '../../api/client';

// Global tasks: server/src/controllers/leadsController.js listAllTasks —
// params use `sort` + `sortDir` (NOT `order`), limit default 50 max 200.
export const tasksApi = {
  list: (params) => get('/tasks', params),
  update: (taskId, body) => patch(`/tasks/${taskId}`, body),
};
