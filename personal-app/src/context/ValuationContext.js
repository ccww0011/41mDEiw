'use client';

import React, {createContext, useContext, useEffect, useState} from 'react';
import { useTransactions } from "@/context/TransactionContext";
import {useFxs} from "@/context/FxContext";
import {usePrices} from "@/context/PriceContext";

const ValuationContext = createContext({});

export function useValuationContext() {
  const context = useContext(ValuationContext);
  if (!context) throw new Error('useValuationContext must be used within ContextProvider');
  return context;
}

export function ValuationProvider({ children }) {
  const {lastPriceDate} = usePrices();
  const {lastFxDate} = useFxs();
  const {transactions} = useTransactions();

  const [basis, setBasis] = useState("Local");

  const [endDate, setEndDate] = useState('');
  const [startDate, setStartDate] = useState('');

  useEffect(() => {
    if (!lastPriceDate && !lastFxDate) {
      setEndDate('');
    } else if (!lastPriceDate) {
      setEndDate(lastFxDate);
    } else if (!lastFxDate) {
      setEndDate(lastPriceDate);
    } else {
      setEndDate(lastPriceDate > lastFxDate ? lastPriceDate : lastFxDate);
    }
  }, [lastPriceDate, lastFxDate]);

  useEffect(() => {
    if (transactions.length === 0) return;
    let minDate = '99999999';
    transactions.forEach(tx => {
      if (tx.tradeDate < minDate) minDate = tx.tradeDate;
    });
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
