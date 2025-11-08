'use client';

import { createContext, useContext, useState } from 'react';

const PriceContext = createContext();

export function usePrices() {
  const context = useContext(PriceContext);
  if (!context) throw new Error("usePrices must be used within PriceProvider");
  return context;
}

export function PriceProvider({ children }) {
  // const prices = {
  //   "AAPL": {
  //     "20250101": 192.55,
  //     "20250102": 194.22
  //   }
  // };
  const [prices, setPrices] = useState({});

  return (
    <PriceContext.Provider value={{ prices, setPrices }}>
      {children}
    </PriceContext.Provider>
  );
}

