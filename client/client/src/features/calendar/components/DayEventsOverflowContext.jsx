import { createContext, useContext } from 'react'

const DayEventsOverflowContext = createContext(null)

export function DayEventsOverflowProvider({ value, children }) {
  return (
    <DayEventsOverflowContext.Provider value={value}>
      {children}
    </DayEventsOverflowContext.Provider>
  )
}

export function useDayEventsOverflow() {
  return useContext(DayEventsOverflowContext)
}
