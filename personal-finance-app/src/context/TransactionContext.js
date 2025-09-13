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
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  useEffect(() => {
    async function fetchData() {
      await getTransactions(setTransactions);
      setLoadingTransactions(false);
    }
    fetchData();
  }, []);

  return (
    <TransactionContext.Provider value={{ transactions, setTransactions, loadingTransactions }}>
      {children}
    </TransactionContext.Provider>
  );
}

