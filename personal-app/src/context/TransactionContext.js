import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { getTransactions, putTransactions, deleteTransactions } from "@/utils_protected/transactionApi";

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

  const putTransactionsWrapped = async (body) => {
    setLoadingTransactions(true);
    try {
      return await putTransactions(body, setTransactions);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const deleteTransactionsWrapped = async (body) => {
    setLoadingTransactions(true);
    try {
      return await deleteTransactions(body, setTransactions);
    } finally {
      setLoadingTransactions(false);
    }
  };

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

  const { transactionTickerMap } = useMemo(() => {
    const tickerSet = new Set();
    const tickerObj = {};

    for (const tx of transactions) {
      if (tx.ticker != null) {
        tickerSet.add(tx.ticker);
        if (!tickerObj[tx.ticker]) {
          tickerObj[tx.ticker] = {
            description: "",
            exchange: "",
            tradingCurrency: ""
          };
        }
        if (tx.description && !tickerObj[tx.ticker].description) {
          tickerObj[tx.ticker].description = tx.description;
        }
        if (tx.listingExchange && !tickerObj[tx.ticker].exchange) {
          tickerObj[tx.ticker].exchange = tx.listingExchange;
        }
        if (tx.currencyPrimary && !tickerObj[tx.ticker].tradingCurrency) {
          tickerObj[tx.ticker].tradingCurrency = tx.currencyPrimary;
        }
      }
    }

    return {
      transactionTickerMap: tickerObj
    };
  }, [transactions]);

  const { transactionCurrencySet } = useMemo(() => {
    const currencySet = new Set();

    for (const tx of transactions) {
      if (tx.currencyPrimary != null) {
        currencySet.add(tx.currencyPrimary);
      }
    }

    return {
      transactionCurrencySet: Array.from(currencySet).sort(),
    };
  }, [transactions]);

  const value = useMemo(
    () => ({
      transactions,
      setTransactions,
      firstTransactionDate,
      transactionTickerMap,
      transactionCurrencySet,
      loadingTransactions,
      setLoadingTransactions,
      putTransactions: putTransactionsWrapped,
      deleteTransactions: deleteTransactionsWrapped,
    }),
    [transactions, firstTransactionDate, transactionTickerMap, transactionCurrencySet, loadingTransactions]
  );

  // console.log(transactions);

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
}

