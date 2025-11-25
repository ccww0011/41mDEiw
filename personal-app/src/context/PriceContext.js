'use client';

import { createContext, useContext, useState } from 'react';

const PriceContext = createContext();

export function usePrices() {
  const context = useContext(PriceContext);
  if (!context) throw new Error("usePrices must be used within PriceProvider");
  return context;
}

export function PriceProvider({ children }) {
  const [prices, setPrices] = useState({});
  const [loadingPrices, setLoadingPrices] = useState(false);

  return (
    <PriceContext.Provider value={{ prices, setPrices, loadingPrices }}>
      {children}
    </PriceContext.Provider>
  );
}
