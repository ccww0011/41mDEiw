'use client';

import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import { useTransactions } from "@/context/TransactionContext";
import { usePrices } from "@/context/PriceContext";

const AggregateContext = createContext();

export function useAggregates() {
  const context = useContext(AggregateContext);
  if (!context) throw new Error('useAggregateContext must be used within AggregateProvider');
  return context;
}

export function AggregateProvider({ children }) {
  const { transactions, loadingTransactions } = useTransactions();
  const { prices } = usePrices();
  const [ loadingAggregates, setLoadingAggregates ] = useState(loadingTransactions);

  useEffect(() => {
    setLoadingAggregates(loadingTransactions);
  }, [loadingTransactions]);

  // Sort transactions by TradeDate
  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => parseInt(a["TradeDate"]) - parseInt(b["TradeDate"]));
  }, [transactions]);

  // Aggregate transactions by Ticker + Exchange
  const holdingsArray = useMemo(() => {
    const holdingsMap = {};

    sortedTransactions.forEach(tx => {
      if (tx["AssetClass"] !== "STK") return;

      const key = `${tx.Ticker}|${tx["ListingExchange"]}`;
      const quantity = parseFloat(tx["Quantity"]);
      const netCash = parseFloat(tx["NetCash"]);
      const currency = tx["CurrencyPrimary"];

      if (!holdingsMap[key]) {
        holdingsMap[key] = {
          ticker: tx.Ticker,
          description: tx["Description"],
          exchange: tx["ListingExchange"],
          totalQuantity: 0,
          totalProceeds: 0,
          realisedPL: 0,
          currency: currency,
        };
      }

      const totalProceeds = holdingsMap[key].totalProceeds;

      if ((totalProceeds >= 0 && netCash > 0) || (totalProceeds <= 0 && netCash < 0)) {
        holdingsMap[key].totalProceeds += netCash;
      } else {
        let avgCost = totalProceeds / holdingsMap[key].totalQuantity; // Negative for long
        let avgPrice = netCash / quantity;
        if (netCash > 0) avgPrice *= -1; // selling
        holdingsMap[key].realisedPL -= (avgPrice + avgCost) * quantity;
        holdingsMap[key].totalProceeds += avgCost * quantity;
      }

      holdingsMap[key].totalQuantity += quantity;
    });

    // Compute price, value, P/L, avg cost
    const today = new Date();
    const formatDate = (date) => {
      const y = date.getFullYear();
      const m = (date.getMonth() + 1).toString().padStart(2, '0');
      const d = date.getDate().toString().padStart(2, '0');
      return `${y}${m}${d}`;
    };
    const todayStr = formatDate(today);

    return Object.values(holdingsMap).map(h => {
      const tickerPrices = prices[h.ticker];

      if (!tickerPrices) {
        const avgCost = h.totalQuantity !== 0 ? h.totalProceeds / h.totalQuantity : null;
        return {
          ...h,
          price: null,
          value: null,
          avgCost,
          unrealisedPL: null,
          realisedPL: h.realisedPL,
          pl: null
        };
      }

      const availableDates = Object.keys(tickerPrices)
        .filter(date => date <= todayStr)
        .sort();

      const price = availableDates.length > 0 ? tickerPrices[availableDates[availableDates.length - 1]] : null;
      const value = price !== null ? price * h.totalQuantity : null;
      const avgCost = h.totalQuantity !== 0 ? h.totalProceeds / h.totalQuantity : null;
      const unrealisedPL = price !== null ? value + h.totalProceeds : null;

      return {
        ...h,
        price,
        value,
        avgCost,
        unrealisedPL,
        realisedPL: h.realisedPL,
        pl: unrealisedPL !== null ? h.realisedPL + unrealisedPL : null
      };
    });
  }, [sortedTransactions, prices]);

  const aggregates = useMemo(() => {
    const map = {};
    const missingPLCurrencies = new Set();

    holdingsArray.forEach(h => {
      const curr = h.currency || "N/A";
      if (!map[curr]) {
        map[curr] = {
          costBasis: 0,
          marketValue: 0,
          unrealisedPL: 0,
          realisedPL: 0,
          pl: 0
        };
      }

      if (h.totalProceeds !== null && !isNaN(h.totalProceeds)) map[curr].costBasis += h.totalProceeds;
      if (h.value !== null) map[curr].marketValue += h.value; else missingPLCurrencies.add(curr);
      if (h.unrealisedPL !== null) map[curr].unrealisedPL += h.unrealisedPL; else missingPLCurrencies.add(curr);
      if (h.realisedPL !== null) map[curr].realisedPL += h.realisedPL; else missingPLCurrencies.add(curr);
      if (h.pl !== null) map[curr].pl += h.pl; else missingPLCurrencies.add(curr);
    });

    return { map, missingPLCurrencies: Array.from(missingPLCurrencies) };
  }, [holdingsArray]);


  return (
    <AggregateContext.Provider value={{ holdingsArray, aggregates, loadingAggregates }}>
      {children}
    </AggregateContext.Provider>
  );
}