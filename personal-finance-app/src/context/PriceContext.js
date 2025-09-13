'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { getPrices } from "@/hooks/usePriceDatabase";

const PriceContext = createContext();

export function usePrices() {
  const context = useContext(PriceContext);
  if (!context) throw new Error("usePrices must be used within PriceProvider");
  return context;
}

export function PriceProvider({ children }) {
  const [prices, setPrices] = useState([]);
  const [loadingPrices, setLoadingPrices] = useState(true);

  useEffect(() => {
    async function fetchData() {
      await getPrices(setPrices);
      setLoadingPrices(false);
    }
    fetchData();
  }, []);

  return (
    <PriceContext.Provider value={{ prices, setPrices, loadingPrices }}>
      {children}
    </PriceContext.Provider>
  );
}

