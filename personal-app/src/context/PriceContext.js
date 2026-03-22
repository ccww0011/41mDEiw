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
  const [corporateActions, setCorporateActions] = useState({});
  const [loadingCorporateActions, setLoadingCorporateActions] = useState(true);
  const [priceTickerMap, setPriceTickerMap] = useState({});

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

  // Compute last corporate-action date across all items
  const lastCorporateActionDate = useMemo(() => {
    let latest = null;

    for (const actionMap of Object.values(corporateActions)) {
      for (const date of Object.keys(actionMap)) {
        if (latest === null || date > latest) {
          latest = date;
        }
      }
    }
    return latest;
  }, [corporateActions]);

  const value = useMemo(
    () => ({
      prices,
      setPrices,
      loadingPrices,
      setLoadingPrices,
      lastPriceDate,
      priceTickerMap,
      setPriceTickerMap,
      corporateActions,
      setCorporateActions,
      loadingCorporateActions,
      setLoadingCorporateActions,
      lastCorporateActionDate,
    }),
    [
      prices,
      loadingPrices,
      lastPriceDate,
      priceTickerMap,
      corporateActions,
      loadingCorporateActions,
      lastCorporateActionDate,
    ]
  );

  return <PriceContext.Provider value={value}>{children}</PriceContext.Provider>;
}
