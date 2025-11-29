import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { getTransactions } from "@/hooks/useTransactionDatabase";

const TransactionContext = createContext();

export function useTransactions() {
  const context = useContext(TransactionContext);
  if (!context) throw new Error("useTransactions must be used within TransactionProvider");
  return context;
}

export function TransactionProvider({ children }) {
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  useEffect(() => {
    async function fetchData() {
      await getTransactions(setTransactions);
      setLoadingTransactions(false);
    }
    setLoadingTransactions(true);
    fetchData();
    setLoadingTransactions(false);
  }, []);

  const { tickers, tickerMap } = useMemo(() => {
    const tickerSet = new Set();
    const tickerObj = {};
    for (let transaction of transactions) {
      if (transaction.Ticker != null) {
        tickerSet.add(transaction.Ticker);
        tickerObj[transaction.Ticker] = transaction.Description;
      }
    }
    return {
      tickers: Array.from(tickerSet).sort(),
      tickerMap: tickerObj
    };
  }, [transactions]);

  console.log(transactions)

  return (
    <TransactionContext.Provider value={{ transactions, setTransactions, tickers, tickerMap, loadingTransactions }}>
      {children}
    </TransactionContext.Provider>
  );
}
