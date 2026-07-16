import { createContext, useContext } from 'react'

/** Provides a handler to open the deal/opportunity slide-over panel from calendar hover cards. */
const OpportunityPanelContext = createContext(null)

export function OpportunityPanelProvider({ value, children }) {
  return <OpportunityPanelContext.Provider value={value}>{children}</OpportunityPanelContext.Provider>
}

export function useOpportunityPanel() {
  return useContext(OpportunityPanelContext)
}
