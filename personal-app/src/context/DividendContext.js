import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { getDividends } from "@/hooks_protected/useDividendDatabase";

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

  const value = useMemo(
    () => ({
      dividends,
      setDividends,
      loadingDividends,
      setLoadingDividends,
    }),
    [dividends, loadingDividends]
  );

  console.log(dividends);

  return (
    <DividendContext.Provider value={value}>
      {children}
    </DividendContext.Provider>
  );
}
