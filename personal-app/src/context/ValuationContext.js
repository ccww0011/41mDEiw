'use client';

import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import { useTransactions } from "@/context/TransactionContext";

const ValuationContext = createContext({});

export function useValuationContext() {
  const context = useContext(ValuationContext);
  if (!context) throw new Error('useValuationContext must be used within ContextProvider');
  return context;
}

const today = new Date(), yesterday = new Date();
yesterday.setDate(today.getDate() - 1); // Subtract 1 day from today
// Format the dates as YYYYMMDD (same format as startDate and endDate)
const yesterdayStr = yesterday.toISOString().slice(0, 10).replace(/-/g, '');

export function ValuationProvider({ children }) {
  const [basis, setBasis] = useState("Local");
  const [startDate, setStartDate] = useState(yesterdayStr);
  const [endDate, setEndDate] = useState(yesterdayStr);

  const {transactions} = useTransactions();

  useEffect(() => {
    let minDate = "99999999"
    transactions.forEach((tx) =>
      minDate = (minDate < tx.tradeDate) ? minDate : tx.tradeDate);
    setStartDate(minDate);
  }, [transactions]);

  return (
    <ValuationContext.Provider
      value={{
        basis,
        setBasis,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
      }}
    >
      {children}
    </ValuationContext.Provider>
  );
}
