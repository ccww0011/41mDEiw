'use client';

import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import { useTransactions } from "@/context/TransactionContext";
import { usePrices } from "@/context/PriceContext";
import { useFxs } from "@/context/FxContext";
import {getFxs} from "@/hooks/useFxDatabase";

const AggregateContext = createContext({
  holdingsArray: [],
  aggregates: {},
  missingFX: [],
  basis: "local",
  loadingAggregates: true,
});

export function useAggregates() {
  const context = useContext(AggregateContext);
  if (!context) throw new Error('useAggregates must be used within AggregateProvider');
  return context;
}

// ---------------------------------------------------------
// FX GETTER — WORKS FOR ALL CASES INCLUDING MISSING USD FX
// ---------------------------------------------------------
function getFxRate(fxs, currency, date, basis) {
  if (basis === "Local") return 1;
  if (currency === basis) return 1;
  if (currency === "USD") return fxs[basis]?.[date] ?? null;
  if (basis === "USD") {
    const rate = fxs[currency]?.[date];
    return rate ? 1 / rate : null;
  }
  const cRate = fxs[currency]?.[date];
  const bRate = fxs[basis]?.[date];
  if (!cRate || !bRate) return null;
  return bRate / cRate;
}

const today = new Date(), yesterday = new Date();
yesterday.setDate(today.getDate() - 1); // Subtract 1 day from today
// Format the dates as YYYYMMDD (same format as startDate and endDate)
const yesterdayStr = yesterday.toISOString().slice(0, 10).replace(/-/g, '');

export function AggregateProvider({ children }) {
  const { transactions, loadingTransactions } = useTransactions();
  const { prices, loadingPrices } = usePrices();
  const { fxs, setFxs, loadingFxs } = useFxs();

  const [loadingAggregates, setLoadingAggregates] = useState(new Map());
  const [basis, setBasis] = useState("Local");
  const [holdingsArray, setHoldingsArray] = useState([]);

  useEffect(() => {
    loadingAggregates.set("Loading Transactions", loadingTransactions);
    loadingAggregates.set("Loading Prices", loadingPrices);
    loadingAggregates.set("Loading Exchange Rates", loadingFxs);
    setLoadingAggregates(loadingAggregates);
  }, [loadingTransactions, loadingPrices, loadingFxs])

  const requests = useMemo(() => {
    const newRequests = new Map();
    transactions.forEach((tx) => {
      if (tx.currencyPrimary === "USD") return;
      const year = tx.tradeDate.substring(0, 4);
      if (newRequests.has(year)) {
        newRequests.get(year).add(tx.currencyPrimary);
      } else {
        newRequests.set(year, new Set([tx.currencyPrimary]));
      }
    });
    newRequests.forEach((currencies) => {
      if (basis !== 'Local') currencies.add(basis);
    });
    return newRequests;
  }, [basis]);

  useEffect(() => {
    requests.forEach((currencies, year) => {
      let startDate = year + "0101", endDate = year + "1231";
      if (startDate > yesterdayStr) return;
      if (endDate > yesterdayStr) endDate = yesterdayStr;
      for (let currency of currencies) {
        (async () => {
          await getFxs(currency, startDate, endDate, fxs, setFxs);
        })();
      }
    });
  }, [requests]);

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => parseInt(a.tradeDate) - parseInt(b.tradeDate));
  }, [transactions]);

  const translatedTransactions = useMemo(() => {
    return sortedTransactions.map(tx => {
      const fxRate = getFxRate(fxs, tx.currencyPrimary, tx.tradeDate, basis);
      const netCashTranslated = (fxRate == null ? null : parseFloat(tx.netCash) * fxRate);
      return {...tx, netCashTranslated, fxRate};
    });
  }, [sortedTransactions, fxs, prices, basis]);
  console.log(translatedTransactions)
  /*
  {
    "quantity": "1",
    "currencyPrimary": "GBP",
    "tradeDate": "20241021",
    "clientAccountID": "U12345678",
    "ticker": "AZN.L",
    "netCash": "-122.52",
    "underlyingSymbol": "AZN",
    "listingExchange": "LSE",
    "description": "ASTRAZENECA PLC",
    "assetClass": "STK",
    "tradeID": "123456789",
    "netCashTranslated": -239.08769609060425,
    "fxRate": 1.9514176958096985
  }
   */
  // ---------------------------------------------------------
  // Compute holdings and track missing FX
  // ---------------------------------------------------------
  useEffect(() => {
    const holdingsMap = {};
    translatedTransactions.forEach(tx => {
      if (tx.assetClass !== "STK") return;
      const key = `${tx.ticker}|${tx.listingExchange}`;
      const quantity = parseFloat(tx.quantity);
      const netCash = parseFloat(tx.netCashTranslated);
      if (!holdingsMap[key]) {
        holdingsMap[key] = {
          ticker: tx.ticker,
          description: tx.description,
          exchange: tx.listingExchange,
          tradingCurrency: tx.currencyPrimary,
          totalQuantity: 0,
          costBasis: 0,
          realisedPL: 0
        };
      }
      const item = holdingsMap[key];
      const prevQty = item.totalQuantity;
      item.totalQuantity = prevQty + quantity;
      if ((prevQty > 0 && quantity < 0) || (prevQty < 0 && quantity > 0)) {
        const avgCost = prevQty !== 0 ? item.costBasis / prevQty : 0;
        item.realisedPL += netCash - avgCost * quantity;
        item.costBasis += avgCost * quantity;
      } else {
        item.costBasis += netCash;
      }
    });

    const holdings = Object.values(holdingsMap).map(h => {
      const tickerPrices = prices[h.ticker];
      const latestDate = tickerPrices ? Object.keys(tickerPrices).sort().pop() : null;
      const priceLocal = latestDate ? tickerPrices[latestDate] : null;
      const fxPrice = latestDate ? getFxRate(fxs, h.tradingCurrency, latestDate, basis) ?? 1 : 1;
      const price = priceLocal !== null ? priceLocal * fxPrice : null;
      const value = price !== null ? price * h.totalQuantity : null;
      const avgCost = h.totalQuantity !== 0 ? h.costBasis / h.totalQuantity : null;
      const unrealisedPL = value !== null && h.costBasis !== null ? value + h.costBasis : null;
      return {
        ...h,
        price,
        value,
        avgCost,
        unrealisedPL,
        pl: unrealisedPL !== null && h.realisedPL !== null ? unrealisedPL + h.realisedPL : null
      };
    });
    setHoldingsArray(holdings);
  }, [sortedTransactions, fxs, prices, basis]);

  // ---------------------------------------------------------
  // Aggregates
  // ---------------------------------------------------------
  const aggregates = useMemo(() => {
    const map = {};
    const missingPLCurrencies = new Set();
    holdingsArray.forEach(h => {
      const curr = basis === "Local" ? h.tradingCurrency : basis;
      if (!map[curr]) {
        map[curr] = {
          costBasis: 0,
          marketValue: 0,
          unrealisedPL: 0,
          realisedPL: 0,
          pl: 0
        };
      }

      if (h.costBasis !== null && !Number.isNaN(h.costBasis)) map[curr].costBasis += h.costBasis;
      else missingPLCurrencies.add(curr);

      if (h.value !== null && !Number.isNaN(h.value)) map[curr].marketValue += h.value;
      else missingPLCurrencies.add(curr);

      if (h.unrealisedPL !== null && !Number.isNaN(h.unrealisedPL)) map[curr].unrealisedPL += h.unrealisedPL;
      else missingPLCurrencies.add(curr);

      if (h.realisedPL !== null && !Number.isNaN(h.realisedPL)) map[curr].realisedPL += h.realisedPL;
      else missingPLCurrencies.add(curr);

      if (h.pl !== null && !Number.isNaN(h.pl)) map[curr].pl += h.pl;
      else missingPLCurrencies.add(curr);
    });
    return {
      map,
      missingPLCurrencies: Array.from(missingPLCurrencies)
    };
  }, [holdingsArray]);

  return (
    <AggregateContext.Provider
      value={{
        holdingsArray,
        aggregates,
        basis,
        setBasis,
        loadingAggregates
      }}
    >
      {children}
    </AggregateContext.Provider>
  );
}
