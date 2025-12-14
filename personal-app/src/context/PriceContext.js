'use client';

import {createContext, useContext, useEffect, useState} from 'react';
import {getInitialPrices} from "@/hooks/usePriceDatabase";
import {useTransactions} from "@/context/TransactionContext";

const PriceContext = createContext(
  {loadingPrices: true}
);

export function usePrices() {
  const context = useContext(PriceContext);
  if (!context) throw new Error("usePrices must be used within PriceProvider");
  return context;
}

export function PriceProvider({ children }) {
  const [prices, setPrices] = useState({});
  const [loadingPrices, setLoadingPrices] = useState(true);
  const {tickers} = useTransactions();

  useEffect(() => {
    const date = new Date(Date.now() - 24 * 60 * 60 * 1000);
    async function fetchData() {
      setLoadingPrices(true);
      await getInitialPrices(tickers, date, setPrices);
      setLoadingPrices(false);
    }
    fetchData();
  }, [tickers]);

  // console.log(tickers)
  // console.log(prices)

  return (
    <PriceContext.Provider value={{ prices, setPrices, loadingPrices, setLoadingPrices }}>
      {children}
    </PriceContext.Provider>
  );
}
