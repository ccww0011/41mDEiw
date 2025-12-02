'use client';

import {createContext, useContext, useEffect, useState} from 'react';
import {getInitialPrices} from "@/hooks/usePriceDatabase";
import {useTransactions} from "@/context/TransactionContext";

const PriceContext = createContext();

export function usePrices() {
  const context = useContext(PriceContext);
  if (!context) throw new Error("usePrices must be used within PriceProvider");
  return context;
}

export function PriceProvider({ children }) {
  const [prices, setPrices] = useState({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  const {tickers} = useTransactions();

  useEffect(() => {
    const date = new Date();
    async function fetchData() {
      await getInitialPrices(tickers, date, setPrices);
    }
    setLoadingPrices(true);
    fetchData();
    setLoadingPrices(false);
  }, [tickers]);

  // console.log(prices)

  return (
    <PriceContext.Provider value={{ prices, setPrices, loadingPrices }}>
      {children}
    </PriceContext.Provider>
  );
}
