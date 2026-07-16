import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { keys } from '../../api/queryKeys';
import { useWorkspaceId } from '../../hooks/useListQuery';
import { teamApi } from './api';
import { showApiError } from '../../utils/errorMessage';

export function useTeamUsers() {
  const ws = useWorkspaceId();
  return useQuery({
    queryKey: keys.team.users(ws, 'all'),
    queryFn: () => teamApi.users(),
    enabled: Boolean(ws),
    select: (r) => (Array.isArray(r.data) ? r.data : []),
  });
}

export function useTeamUser(id) {
  const ws = useWorkspaceId();
  return useQuery({
    queryKey: keys.team.user(ws, id),
    queryFn: () => teamApi.user(id),
    enabled: Boolean(ws && id),
    select: (r) => r.data,
  });
}

export function useTeamRoles() {
  const ws = useWorkspaceId();
  return useQuery({
    queryKey: keys.team.roles(ws),
    queryFn: () => teamApi.roles(),
    enabled: Boolean(ws),
    select: (r) => (Array.isArray(r.data) ? r.data : []),
    staleTime: 5 * 60_000,
  });
}

export function useInvitations() {
  const ws = useWorkspaceId();
  return useQuery({
    queryKey: keys.team.invitations(ws),
    queryFn: () => teamApi.invitations(),
    enabled: Boolean(ws),
    select: (r) => (Array.isArray(r.data) ? r.data : []),
  });
}

export function useTeamMutations() {
  const qc = useQueryClient();
  const ws = useWorkspaceId();
  const invalidate = () => qc.invalidateQueries({ queryKey: keys.team.all(ws) });

  return {
    invite: useMutation({ mutationFn: (body) => teamApi.invite(body), onSuccess: invalidate, onError: (err) => showApiError(err, 'Could not send invitation') }),
    revokeInvitation: useMutation({ mutationFn: (id) => teamApi.revokeInvitation(id), onSuccess: invalidate, onError: (err) => showApiError(err, 'Could not revoke invitation') }),
    setRole: useMutation({ mutationFn: ({ id, companyRoleId }) => teamApi.setRole(id, companyRoleId), onSuccess: invalidate, onError: (err) => showApiError(err, 'Could not update role') }),
    patchProfile: useMutation({ mutationFn: ({ id, body }) => teamApi.patchProfile(id, body), onSuccess: invalidate, onError: (err) => showApiError(err, 'Could not update profile') }),
    deactivate: useMutation({ mutationFn: ({ id, body }) => teamApi.deactivate(id, body), onSuccess: invalidate, onError: (err) => showApiError(err, 'Could not deactivate user') }),
    reactivate: useMutation({ mutationFn: (id) => teamApi.reactivate(id), onSuccess: invalidate, onError: (err) => showApiError(err, 'Could not reactivate user') }),
  };
}
