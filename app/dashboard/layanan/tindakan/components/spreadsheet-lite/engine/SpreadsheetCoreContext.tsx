"use client";

import { createContext, useContext, useState } from "react";

export const SpreadsheetCoreContext = createContext<any>(null);

export function SpreadsheetCoreProvider({ children }: any) {
  const [state, setState] = useState({});

  return (
    <SpreadsheetCoreContext.Provider value={{ state, setState }}>
      {children}
    </SpreadsheetCoreContext.Provider>
  );
}

export function useSpreadsheetCore() {
  return useContext(SpreadsheetCoreContext);
}
