'use client';

import { createContext, useContext, useMemo, useState } from 'react';

const FxContext = createContext(null);

export function useFxs() {
  const context = useContext(FxContext);
  if (context === null) throw new Error('useFxs must be used within FxProvider');
  return context;
}

export function FxProvider({ children }) {
  const [fxs, setFxs] = useState({});
  const [loadingFxs, setLoadingFxs] = useState(true);

  const lastFxDate = useMemo(() => {
    let latest = null;
    for (const fxMap of Object.values(fxs)) {
      for (const date of Object.keys(fxMap)) {
        if (latest === null || date > latest) {
          latest = date;
        }
      }
    }
    return latest;
  }, [fxs]);

  // console.log(fxs)

  const value = useMemo(
    () => ({
      fxs,
      setFxs,
      loadingFxs,
      setLoadingFxs,
      lastFxDate,
    }),
    [fxs, loadingFxs, lastFxDate]
  );

  return <FxContext.Provider value={value}>{children}</FxContext.Provider>;
}
