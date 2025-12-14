'use client';

import {createContext, useContext, useEffect, useState} from 'react';
import {useTransactions} from "@/context/TransactionContext";
import {getInitialFxs} from "@/hooks/useFxDatabase";

const FxContext = createContext(
  {loadingFxs: true}
);

export function useFxs() {
  const context = useContext(FxContext);
  if (!context) throw new Error("useFxs must be used within FxProvider");
  return context;
}

export function FxProvider({ children }) {
  const [fxs, setFxs] = useState({});
  const [loadingFxs, setLoadingFxs] = useState(true);
  const {currencies} = useTransactions();

  useEffect(() => {
    const date = new Date(Date.now() - 24 * 60 * 60 * 1000);
    async function fetchData() {
      setLoadingFxs(true);
      await getInitialFxs(currencies, date, setFxs);
      setLoadingFxs(false);
    }
    fetchData();
  }, [currencies]);

  // console.log(currencies)
  // console.log(fxs)

  return (
    <FxContext.Provider value={{ fxs, setFxs, loadingFxs, setLoadingFxs }}>
      {children}
    </FxContext.Provider>
  );
}