import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { getTransactions } from "@/hooks/useTransactionDatabase";

const TransactionContext = createContext(null);

export function useTransactions() {
  const context = useContext(TransactionContext);
  if (context === null) throw new Error("useTransactions must be used within TransactionProvider");
  return context;
}

export function TransactionProvider({ children }) {
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoadingTransactions(true);
      await getTransactions(setTransactions);
      setLoadingTransactions(false);
    };
    fetchData();
  }, []);

  const firstTransactionDate = useMemo(() => {
    if (transactions.length === 0) return null;

    let earliest = null;
    for (const tx of transactions) {
      if (!earliest || tx.tradeDate < earliest) {
        earliest = tx.tradeDate;
      }
    }
    return earliest;
  }, [transactions]);

  const { tickers, tickerMap } = useMemo(() => {
    const tickerSet = new Set();
    const tickerObj = {};

    for (const tx of transactions) {
      if (tx.ticker != null) {
        tickerSet.add(tx.ticker);
        tickerObj[tx.ticker] = tx.description ?? "";
      }
    }

    return {
      tickers: Array.from(tickerSet).sort(),
      tickerMap: tickerObj
    };
  }, [transactions]);

  const { currencies, currencyMap } = useMemo(() => {
    const currencySet = new Set();
    const currencyObj = {};

    for (const tx of transactions) {
      if (tx.currencyPrimary != null) {
        currencySet.add(tx.currencyPrimary);
        currencyObj[tx.currencyPrimary] = tx.currencyPrimary;
      }
    }

    return {
      currencies: Array.from(currencySet).sort(),
      currencyMap: currencyObj
    };
  }, [transactions]);

  const value = useMemo(
    () => ({
      transactions,
      setTransactions,
      firstTransactionDate,
      tickers,
      tickerMap,
      currencies,
      currencyMap,
      loadingTransactions,
      setLoadingTransactions,
    }),
    [transactions, firstTransactionDate, tickers, tickerMap, currencies, currencyMap, loadingTransactions]
  );

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
}

