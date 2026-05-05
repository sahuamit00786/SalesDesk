import { configureStore } from '@reduxjs/toolkit'
import '@/features/api/registerApis'
import { baseApi } from '@/features/api/baseApi'
import authReducer from '@/features/auth/authSlice'
import workspaceReducer from '@/features/workspace/workspaceSlice'
import leadsReducer from '@/features/leads/leadsSlice'
import meetingsReducer from '@/features/meetings/meetingsSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    workspace: workspaceReducer,
    leads: leadsReducer,
    meetings: meetingsReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware),
})
