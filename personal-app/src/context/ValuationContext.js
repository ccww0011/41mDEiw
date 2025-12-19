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
  const {firstTransactionDate} = useTransactions();

  const [basis, setBasis] = useState("Local");
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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
    if (!firstTransactionDate) {
      setStartDate('');
    } else {
      setStartDate(firstTransactionDate);
    }
  }, [firstTransactionDate]);

  //console.log(startDate, endDate)

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
