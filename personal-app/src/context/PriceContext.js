'use client';

import { createContext, useContext, useMemo, useState } from 'react';

const PriceContext = createContext(null);

export function usePrices() {
  const context = useContext(PriceContext);
  if (context === null) throw new Error('usePrices must be used within PriceProvider');
  return context;
}

export function PriceProvider({ children }) {
  const [prices, setPrices] = useState({});
  const [loadingPrices, setLoadingPrices] = useState(true);

  // Compute last price date across all items
  const lastPriceDate = useMemo(() => {
    let latest = null;

    for (const priceMap of Object.values(prices)) {
      for (const date of Object.keys(priceMap)) {
        if (latest === null || date > latest) {
          latest = date;
        }
      }
    }
    return latest;
  }, [prices]);

  // console.log(prices)

  const value = useMemo(
    () => ({
      prices,
      setPrices,
      loadingPrices,
      setLoadingPrices,
      lastPriceDate,
    }),
    [prices, loadingPrices, lastPriceDate]
  );

  return <PriceContext.Provider value={value}>{children}</PriceContext.Provider>;
}
