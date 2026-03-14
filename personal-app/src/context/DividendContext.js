import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { getDividends, putDividends, deleteDividends } from "@/utils_protected/dividendApi";

const DividendContext = createContext(null);

export function useDividends() {
  const context = useContext(DividendContext);
  if (context === null) throw new Error("useDividends must be used within DividendProvider");
  return context;
}

export function DividendProvider({ children }) {
  const [dividends, setDividends] = useState([]);
  const [loadingDividends, setLoadingDividends] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoadingDividends(true);
      await getDividends(setDividends);
      setLoadingDividends(false);
    };
    fetchData();
  }, []);

  const putDividendsWrapped = async (body) => {
    setLoadingDividends(true);
    try {
      return await putDividends(body, setDividends);
    } finally {
      setLoadingDividends(false);
    }
  };

  const deleteDividendsWrapped = async (body) => {
    setLoadingDividends(true);
    try {
      return await deleteDividends(body, setDividends);
    } finally {
      setLoadingDividends(false);
    }
  };

  const value = useMemo(
    () => ({
      dividends,
      setDividends,
      loadingDividends,
      setLoadingDividends,
      putDividends: putDividendsWrapped,
      deleteDividends: deleteDividendsWrapped,
    }),
    [dividends, loadingDividends]
  );

  // console.log(dividends);

  return (
    <DividendContext.Provider value={value}>
      {children}
    </DividendContext.Provider>
  );
}
