import { baseApi } from '@/features/api/baseApi'
import { updateSessionUser } from '@/features/auth/authSlice'

function mapItemsToAuthWorkspaces(items) {
  return items.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    archived: Boolean(row.archived),
    themeColor: row.themeColor ?? null,
    sidebarTextColor: row.sidebarTextColor ?? null,
  }))
}

function mergeWorkspacesIntoUser(user, items) {
  if (!user?.company) return user
  return {
    ...user,
    company: {
      ...user.company,
      workspaces: mapItemsToAuthWorkspaces(items),
    },
  }
}

async function syncAuthWorkspaces(dispatch, getState, items) {
  if (!Array.isArray(items)) return
  const user = getState().auth.user
  if (!user) return
  dispatch(updateSessionUser(mergeWorkspacesIntoUser(user, items)))
}

export const workspaceApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    workspaces: build.query({
      query: () => '/workspaces',
      providesTags: [{ type: 'Workspace', id: 'LIST' }],
    }),
    createWorkspace: build.mutation({
      query: (body) => ({ url: '/workspaces', method: 'POST', body }),
      invalidatesTags: [{ type: 'Workspace', id: 'LIST' }],
      async onQueryStarted(_arg, { dispatch, queryFulfilled, getState }) {
        try {
          const { data } = await queryFulfilled
          await syncAuthWorkspaces(dispatch, getState, data?.data?.items)
        } catch {
          /* handled by caller */
        }
      },
    }),
    patchWorkspace: build.mutation({
      query: ({ id, ...body }) => ({
        url: `/workspaces/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: [{ type: 'Workspace', id: 'LIST' }],
      async onQueryStarted(_arg, { dispatch, queryFulfilled, getState }) {
        try {
          const { data } = await queryFulfilled
          await syncAuthWorkspaces(dispatch, getState, data?.data?.items)
        } catch {
          /* handled by caller */
        }
      },
    }),
    deleteWorkspace: build.mutation({
      query: (id) => ({ url: `/workspaces/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Workspace', id: 'LIST' }],
      async onQueryStarted(_arg, { dispatch, queryFulfilled, getState }) {
        try {
          const { data } = await queryFulfilled
          await syncAuthWorkspaces(dispatch, getState, data?.data?.items)
        } catch {
          /* handled by caller */
        }
      },
    }),
  }),
})

export const {
  useWorkspacesQuery,
  useCreateWorkspaceMutation,
  usePatchWorkspaceMutation,
  useDeleteWorkspaceMutation,
} = workspaceApi
