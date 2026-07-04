import { get, post, patch, put, del } from '../../api/client';

export const teamApi = {
  users: (params) => get('/team/users', params),
  user: (id) => get(`/team/users/${id}`),
  roles: () => get('/team/roles'),
  invitations: () => get('/team/invitations'),
  // { email, companyRoleId, workspaceIds: [..] (min 1), name? }
  invite: (body) => post('/team/invitations', body),
  revokeInvitation: (id) => del(`/team/invitations/${id}`),
  setRole: (id, companyRoleId) => patch(`/team/users/${id}/role`, { companyRoleId }),
  patchProfile: (id, body) => patch(`/team/users/${id}/profile`, body),
  setWorkspaces: (id, workspaceIds) => put(`/team/users/${id}/workspaces`, { workspaceIds }),
  deactivate: (id, body) => post(`/team/users/${id}/deactivate`, body || {}),
  reactivate: (id) => post(`/team/users/${id}/reactivate`),
};
