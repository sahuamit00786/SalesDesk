import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  activeSessionId: null,
}

const copilotSlice = createSlice({
  name: 'copilot',
  initialState,
  reducers: {
    setActiveCopilotSession: (state, action) => {
      state.activeSessionId = action.payload
    },
  },
})

export const { setActiveCopilotSession } = copilotSlice.actions
export default copilotSlice.reducer
