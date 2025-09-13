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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      await getPrices(setPrices);
      setLoading(false);
    }
    fetchData();
  }, []);

  return (
    <PriceContext.Provider value={{ prices, setPrices, loading }}>
      {children}
    </PriceContext.Provider>
  );
}

