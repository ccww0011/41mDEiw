import {createContext, useContext, useState, useMemo, useEffect} from 'react';
import {getWalkthroughFxs} from "@/hooks/useWalkthroughFx";
import {getWalkthroughPrices} from "@/hooks/useWalkthroughPrice";

const WalkthroughContext = createContext(null);

export function useWalkthroughContext() {
  const context = useContext(WalkthroughContext);
  if (context === null) throw new Error("useDemoContext must be used within DemoProvider");
  return context;
}

const d0 = new Date();
d0.setDate(d0.getDate() - 1);
const yesterdayStr = d0.getFullYear().toString() + String(d0.getMonth() + 1).padStart(2, '0') + String(d0.getDate()).padStart(2, '0');
const yesterdayStrStart = yesterdayStr.slice(0,4) + "0101"

export function WalkthroughProvider({ children }) {

  /* Transaction Context */
  const transactions = [
    {
      "quantity": "1",
      "currencyPrimary": "GBP",
      "tradeDate": "20241021",
      "clientAccountID": "Test1",
      "ticker": "RR.L",
      "netCash": "-8.67",
      "underlyingSymbol": "RR.",
      "listingExchange": "LSE",
      "description": "ROLLS-ROYCE HOLDINGS PLC",
      "assetClass": "STK",
      "tradeID": "1"
    },
    {
      "quantity": "-40",
      "currencyPrimary": "GBP",
      "tradeDate": "20250623",
      "clientAccountID": "Test1",
      "ticker": "RR.L",
      "netCash": "353.44",
      "underlyingSymbol": "RR.",
      "listingExchange": "LSE",
      "description": "ROLLS-ROYCE HOLDINGS PLC",
      "assetClass": "STK",
      "tradeID": "10"
    },
    {
      "quantity": "10",
      "currencyPrimary": "USD",
      "tradeDate": "20250514",
      "clientAccountID": "Test1",
      "ticker": "BA",
      "netCash": "-2071.00035",
      "underlyingSymbol": "BA",
      "listingExchange": "NYSE",
      "description": "BOEING CO/THE",
      "assetClass": "STK",
      "tradeID": "5"
    },
    {
      "quantity": "880",
      "currencyPrimary": "GBP",
      "tradeDate": "20241021",
      "clientAccountID": "Test1",
      "ticker": "RR.L",
      "netCash": "-4993.12",
      "underlyingSymbol": "RR.",
      "listingExchange": "LSE",
      "description": "ROLLS-ROYCE HOLDINGS PLC",
      "assetClass": "STK",
      "tradeID": "2"
    },
    {
      "quantity": "0.2125",
      "currencyPrimary": "GBP",
      "tradeDate": "20241021",
      "clientAccountID": "Test1",
      "ticker": "RR.L",
      "netCash": "-1.205725",
      "underlyingSymbol": "RR.",
      "listingExchange": "LSE",
      "description": "ROLLS-ROYCE HOLDINGS PLC",
      "assetClass": "STK",
      "tradeID": "3"
    },
    {
      "quantity": "384",
      "currencyPrimary": "GBP",
      "tradeDate": "20250310",
      "clientAccountID": "Test1",
      "ticker": "RR.L",
      "netCash": "-3005.88",
      "underlyingSymbol": "RR.",
      "listingExchange": "LSE",
      "description": "ROLLS-ROYCE HOLDINGS PLC",
      "assetClass": "STK",
      "tradeID": "4"
    },
    {
      "quantity": "500",
      "currencyPrimary": "GBP",
      "tradeDate": "20250701",
      "clientAccountID": "Test1",
      "ticker": "RR.L",
      "netCash": "-4695",
      "underlyingSymbol": "RR.",
      "listingExchange": "LSE",
      "description": "ROLLS-ROYCE HOLDINGS PLC",
      "assetClass": "STK",
      "tradeID": "11"
    },
    {
      "quantity": "-265",
      "currencyPrimary": "GBP",
      "tradeDate": "20250602",
      "clientAccountID": "Test1",
      "ticker": "RR.L",
      "netCash": "2274.41",
      "underlyingSymbol": "RR.",
      "listingExchange": "LSE",
      "description": "ROLLS-ROYCE HOLDINGS PLC",
      "assetClass": "STK",
      "tradeID": "6"
    },
    {
      "quantity": "-0.2125",
      "currencyPrimary": "GBP",
      "tradeDate": "20250602",
      "clientAccountID": "Test1",
      "ticker": "RR.L",
      "netCash": "1.826225",
      "underlyingSymbol": "RR.",
      "listingExchange": "LSE",
      "description": "ROLLS-ROYCE HOLDINGS PLC",
      "assetClass": "STK",
      "tradeID": "7"
    },
    {
      "quantity": "-500",
      "currencyPrimary": "GBP",
      "tradeDate": "20250618",
      "clientAccountID": "Test1",
      "ticker": "RR.L",
      "netCash": "4497",
      "underlyingSymbol": "RR.",
      "listingExchange": "LSE",
      "description": "ROLLS-ROYCE HOLDINGS PLC",
      "assetClass": "STK",
      "tradeID": "8"
    },
    {
      "quantity": "-160",
      "currencyPrimary": "GBP",
      "tradeDate": "20250623",
      "clientAccountID": "Test1",
      "ticker": "RR.L",
      "netCash": "1410.76",
      "underlyingSymbol": "RR.",
      "listingExchange": "LSE",
      "description": "ROLLS-ROYCE HOLDINGS PLC",
      "assetClass": "STK",
      "tradeID": "9"
    }
  ]
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  let firstTransactionDate = null;
  for (const tx of transactions) {
    if (!firstTransactionDate || tx.tradeDate < firstTransactionDate) {
      firstTransactionDate = tx.tradeDate;
    }
  }

  const tickerSet = new Set();
  const tickerMap = {};
  for (const tx of transactions) {
    if (tx.ticker != null) {
      tickerSet.add(tx.ticker);
      tickerMap[tx.ticker] = tx.description ?? "";
    }
  }
  const tickers = Array.from(tickerSet).sort();

  const currencySet = new Set();
  const currencyMap = {};
  for (const tx of transactions) {
    if (tx.currencyPrimary != null) {
      currencySet.add(tx.currencyPrimary);
      currencyMap[tx.currencyPrimary] = tx.currencyPrimary;
    }
  }
  const currencies = Array.from(currencySet).sort();


  /* Price Context */
  const [prices, setPrices] = useState({});
  const [loadingPrices, setLoadingPrices] = useState(false);

  // Compute last price date across all items
  const lastPriceDate = useMemo(() => {
    let latest = null;

    for (const priceMap of Object.values(prices)) {
      for (const date of Object.keys(priceMap)) {
        if (latest === null || date > latest) {
          latest = date;
        }
      }
    }
    return latest;
  }, [prices]);

  // console.log(prices)
  // console.log(loadingPrices)


  /* Fx Context */
  const [fxs, setFxs] = useState({});
  const [loadingFxs, setLoadingFxs] = useState(false);

  const lastFxDate = useMemo(() => {
    let latest = null;
    for (const fxMap of Object.values(fxs)) {
      for (const date of Object.keys(fxMap)) {
        if (latest === null || date > latest) {
          latest = date;
        }
      }
    }
    return latest;
  }, [fxs]);

  // console.log(fxs)


  /* Valuation Context */
  const [basis, setBasis] = useState("Local");
  const [startDateDisplay, setStartDateDisplay] = useState(yesterdayStrStart);
  const [endDateDisplay, setEndDateDisplay] = useState(yesterdayStr);

  // Update start date based on first transaction and endDate
  useEffect(() => {
    if (!firstTransactionDate || !endDateDisplay) return;
    const yearStart = `${endDateDisplay.slice(0, 4)}0101`;
    if (startDateDisplay == null) setStartDateDisplay(firstTransactionDate < yearStart ? yearStart : firstTransactionDate);
  }, [firstTransactionDate, endDateDisplay]);

  // Update end date based on last available price or FX
  useEffect(() => {
    if (!lastPriceDate && !lastFxDate) return
    if (!lastPriceDate) {
      setEndDateDisplay(lastFxDate);
    } else if (!lastFxDate) {
      setEndDateDisplay(lastPriceDate);
    } else {
      setEndDateDisplay(lastPriceDate > lastFxDate ? lastPriceDate : lastFxDate);
    }
  }, [lastPriceDate, lastFxDate]);

  // Fetch missing FXs
  useEffect(() => {
    if (!transactions?.length || !basis || !firstTransactionDate || !endDateDisplay) return;

    const fetchFxs = async () => {
      const requests = new Map();
      transactions.forEach(tx => {
        if (tx.currencyPrimary === "USD") return;
        const year = tx.tradeDate.slice(0, 4);
        const prev = requests.get(tx.currencyPrimary);
        if (!prev || year < prev) requests.set(tx.currencyPrimary, year);
      });

      if (basis !== "Local") requests.set(basis, firstTransactionDate.slice(0, 4));

      const items = Array.from(requests.entries())
        .map(([currency, minYear]) => {
          const startDate = `${minYear}0101`;
          return startDate <= endDateDisplay ? { currency, startDate, endDate: endDateDisplay } : null;
        })
        .filter(Boolean);
      if (items.length) await getWalkthroughFxs(items, fxs, setFxs, setLoadingFxs);
    };

    fetchFxs();
  }, [transactions, basis, firstTransactionDate, endDateDisplay]);

  // Fetch missing Prices
  useEffect(() => {
    if (!transactions?.length || !startDateDisplay || !endDateDisplay) return;
    const fetchPrices = async () => {
      const requests = new Map();
      transactions.forEach(tx => {
        if (tx.assetClass !== "STK") return;
        const year = tx.tradeDate.slice(0, 4);
        const prev = requests.get(tx.ticker);
        if (!prev || year < prev) requests.set(tx.ticker, year);
      });
      const items = Array.from(requests.entries())
        .map(([ticker, minYear]) => {
          const startDate = `${minYear}0101`;
          if (startDate < startDateDisplay) {
            return { ticker, startDate: startDateDisplay, endDate: endDateDisplay };
          } else if (startDate <= endDateDisplay) {
            return { ticker, startDate, endDate: endDateDisplay };
          } else {
            return null;
          }
        })
        .filter(Boolean);
      if (items.length) await getWalkthroughPrices(items, prices, setPrices, setLoadingPrices);
    };

    fetchPrices();
  }, [transactions, startDateDisplay, endDateDisplay]);


  const value = useMemo(
    () => ({
      transactions,
      firstTransactionDate,
      tickers,
      tickerMap,
      currencies,
      currencyMap,
      loadingTransactions,
      setLoadingTransactions,
      prices,
      setPrices,
      loadingPrices,
      setLoadingPrices,
      lastPriceDate,
      fxs,
      setFxs,
      loadingFxs,
      setLoadingFxs,
      lastFxDate,
      basis,
      setBasis,
      startDateDisplay,
      setStartDateDisplay,
      endDateDisplay,
      setEndDateDisplay
    }),
    [transactions,
      firstTransactionDate,
      tickers,
      tickerMap,
      currencies,
      currencyMap,
      loadingTransactions,
      prices,
      loadingPrices,
      lastPriceDate,
      fxs,
      loadingFxs,
      lastFxDate,
      basis,
      setBasis,
      startDateDisplay,
      setStartDateDisplay,
      endDateDisplay,
      setEndDateDisplay]
  );

  return (
    <WalkthroughContext.Provider value={value}>
      {children}
    </WalkthroughContext.Provider>
  );
}