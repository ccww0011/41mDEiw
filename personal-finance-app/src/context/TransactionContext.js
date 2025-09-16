'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { getTransactions } from "@/hooks/useTransactionDatabase";

const TransactionContext = createContext();

export function useTransactions() {
  const context = useContext(TransactionContext);
  if (!context) throw new Error("useTransactions must be used within TransactionProvider");
  return context;
}

export function TransactionProvider({ children }) {
  const [transactions, setTransactions] = useState([]);
  const [tickers, setTickers] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  useEffect(() => {
    async function fetchData() {
      await getTransactions(setTransactions);
      setLoadingTransactions(false);
    }
    fetchData();
  }, []);

  useEffect(() => {
    let tickerSet = new Set();
    for (let transaction of transactions) {
      if (transaction.Ticker != null)
        tickerSet.add(transaction.Ticker);
    }
    setTickers(Array.from(tickerSet).sort());
  }, [transactions]);


  return (
    <TransactionContext.Provider value={{ transactions, setTransactions, tickers, loadingTransactions }}>
      {children}
    </TransactionContext.Provider>
  );
}

