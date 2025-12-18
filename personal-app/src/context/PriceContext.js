'use client';

import {createContext, useContext, useEffect, useMemo, useState} from 'react';
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
  const [loadingPrices, setLoadingPrices] = useState(false);
  const {tickers} = useTransactions();

  useEffect(() => {
    const date = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const fetchData = async () => {
      setLoadingPrices(true);
      await getInitialPrices(tickers, date, setPrices);
      setLoadingPrices(false);
    }
    fetchData();
  }, [tickers]);

  const lastPriceDate = useMemo(() => {
    let lastDate = "00000000";
    const anyCurrencyFxMap = Object.values(prices)[0];
    if (anyCurrencyFxMap) {
      lastDate = Object.keys(anyCurrencyFxMap).reduce(
        (max, date) => (date > max ? date : max),
        "00000000"
      );
    }
    return lastDate;
  }, [prices]);

  // console.log(lastPriceDate)
  // console.log(prices)

  return (
    <PriceContext.Provider value={{ prices, setPrices, lastPriceDate, loadingPrices, setLoadingPrices }}>
      {children}
    </PriceContext.Provider>
  );
}
