'use client';

import {createContext, useContext, useEffect, useMemo, useState} from 'react';
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
  const [loadingFxs, setLoadingFxs] = useState(false);
  const {currencies} = useTransactions();

  useEffect(() => {
    const date = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const fetchData = async () => {
      setLoadingFxs(true);
      await getInitialFxs(currencies, date, setFxs);
      setLoadingFxs(false);
    }
    fetchData();
  }, [currencies]);

  const lastFxDate = useMemo(() => {
    let lastDate = "00000000";
    const anyCurrencyFxMap = Object.values(fxs)[0];
    if (anyCurrencyFxMap) {
      lastDate = Object.keys(anyCurrencyFxMap).reduce(
        (max, date) => (date > max ? date : max),
        "00000000"
      );
    }
    return lastDate;
  }, [fxs]);

  // console.log(lastFxDate)
  // console.log(fxs)

  return (
    <FxContext.Provider value={{ fxs, setFxs, lastFxDate, loadingFxs, setLoadingFxs }}>
      {children}
    </FxContext.Provider>
  );
}