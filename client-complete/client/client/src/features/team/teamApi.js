import { baseApi } from '@/features/api/baseApi'

export const teamApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    teamRoles: build.query({
      query: () => '/team/roles',
      providesTags: [{ type: 'Team', id: 'ROLES' }],
    }),
    teamUsers: build.query({
      query: () => '/team/users',
      providesTags: [{ type: 'Team', id: 'USERS' }],
    }),
    /**
     * Workspace-scoped, lightweight user list for assignee filters/dropdowns.
     * Works WITHOUT the settings.team menu (unlike teamUsers) and never leaks
     * users outside the caller's workspaces. Rank-3 users get just themselves.
     */
    assignableUsers: build.query({
      query: () => '/team/assignable-users',
      providesTags: [{ type: 'Team', id: 'ASSIGNABLE' }],
    }),
    getTeamUser: build.query({
      query: (id) => `/team/users/${id}`,
      providesTags: (_res, _err, id) => [
        { type: 'Team', id: `USER-${id}` },
        { type: 'Team', id: 'USERS' },
      ],
    }),
    teamInvitations: build.query({
      query: () => '/team/invitations',
      providesTags: [{ type: 'Team', id: 'INVITES' }],
    }),
    teamTeams: build.query({
      query: () => '/team/teams',
      providesTags: [{ type: 'Team', id: 'TEAMS' }],
    }),
    createInvitation: build.mutation({
      query: (body) => ({ url: '/team/invitations', method: 'POST', body }),
      invalidatesTags: [{ type: 'Team', id: 'INVITES' }],
    }),
    cancelInvitation: build.mutation({
      query: (id) => ({ url: `/team/invitations/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Team', id: 'INVITES' }],
    }),
    patchUserRole: build.mutation({
      query: ({ id, companyRoleId }) => ({
        url: `/team/users/${id}/role`,
        method: 'PATCH',
        body: { companyRoleId },
      }),
      invalidatesTags: [{ type: 'Team', id: 'USERS' }],
    }),
    patchUserProfile: build.mutation({
      query: ({ id, ...body }) => ({
        url: `/team/users/${id}/profile`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: [{ type: 'Team', id: 'USERS' }],
    }),
    teamMenus: build.query({
      query: () => '/team/menus',
      providesTags: [{ type: 'Team', id: 'MENUS' }],
    }),
    getUserMenuPermissions: build.query({
      query: (id) => `/team/users/${id}/menu-permissions`,
      providesTags: (_res, _err, id) => [{ type: 'Team', id: `USER-PERMS-${id}` }],
    }),
    putUserMenuPermissions: build.mutation({
      query: ({ id, menuPermissions }) => ({
        url: `/team/users/${id}/menu-permissions`,
        method: 'PUT',
        body: { menuPermissions },
      }),
      invalidatesTags: (_res, _err, { id }) => [{ type: 'Team', id: `USER-PERMS-${id}` }],
    }),
    createRole: build.mutation({
      query: (body) => ({ url: '/team/roles', method: 'POST', body }),
      invalidatesTags: [{ type: 'Team', id: 'ROLES' }],
    }),
    patchRole: build.mutation({
      query: ({ id, ...body }) => ({ url: `/team/roles/${id}`, method: 'PATCH', body }),
      invalidatesTags: [{ type: 'Team', id: 'ROLES' }],
    }),
    deleteRole: build.mutation({
      query: ({ id, fallbackCompanyRoleId = null }) => ({
        url: `/team/roles/${id}`,
        method: 'DELETE',
        body: { fallbackCompanyRoleId },
      }),
      invalidatesTags: [{ type: 'Team', id: 'ROLES' }],
    }),
    replaceUserWorkspaces: build.mutation({
      query: ({ id, workspaceIds }) => ({
        url: `/team/users/${id}/workspaces`,
        method: 'PUT',
        body: { workspaceIds },
      }),
      invalidatesTags: [{ type: 'Team', id: 'USERS' }],
    }),
    deactivateUser: build.mutation({
      query: ({ id, reassignOwnerUserId = null }) => ({
        url: `/team/users/${id}/deactivate`,
        method: 'POST',
        body: { reassignOwnerUserId },
      }),
      invalidatesTags: [{ type: 'Team', id: 'USERS' }],
    }),
    reactivateUser: build.mutation({
      query: ({ id }) => ({
        url: `/team/users/${id}/reactivate`,
        method: 'POST',
        body: {},
      }),
      invalidatesTags: (_res, _err, { id }) => [
        { type: 'Team', id: 'USERS' },
        { type: 'Team', id: `USER-${id}` },
      ],
    }),
    createTeam: build.mutation({
      query: (body) => ({ url: '/team/teams', method: 'POST', body }),
      invalidatesTags: [{ type: 'Team', id: 'TEAMS' }],
    }),
    patchTeam: build.mutation({
      query: ({ id, ...body }) => ({ url: `/team/teams/${id}`, method: 'PATCH', body }),
      invalidatesTags: [{ type: 'Team', id: 'TEAMS' }],
    }),
    deleteTeam: build.mutation({
      query: (id) => ({ url: `/team/teams/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Team', id: 'TEAMS' }],
    }),
    addTeamMember: build.mutation({
      query: ({ teamId, userId }) => ({
        url: `/team/teams/${teamId}/members`,
        method: 'POST',
        body: { userId },
      }),
      invalidatesTags: [{ type: 'Team', id: 'TEAMS' }],
    }),
    removeTeamMember: build.mutation({
      query: ({ teamId, userId }) => ({
        url: `/team/teams/${teamId}/members/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Team', id: 'TEAMS' }],
    }),
  }),
})

export const {
  useTeamRolesQuery,
  useTeamUsersQuery,
  useAssignableUsersQuery,
  useGetTeamUserQuery,
  useTeamInvitationsQuery,
  useTeamTeamsQuery,
  useCreateInvitationMutation,
  useCancelInvitationMutation,
  usePatchUserRoleMutation,
  usePatchUserProfileMutation,
  useTeamMenusQuery,
  useGetUserMenuPermissionsQuery,
  usePutUserMenuPermissionsMutation,
  useCreateRoleMutation,
  usePatchRoleMutation,
  useDeleteRoleMutation,
  useReplaceUserWorkspacesMutation,
  useDeactivateUserMutation,
  useReactivateUserMutation,
  useCreateTeamMutation,
  usePatchTeamMutation,
  useDeleteTeamMutation,
  useAddTeamMemberMutation,
  useRemoveTeamMemberMutation,
} = teamApi
