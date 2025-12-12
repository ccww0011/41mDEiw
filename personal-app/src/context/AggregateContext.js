'use client';

import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import { useTransactions } from "@/context/TransactionContext";
import { usePrices } from "@/context/PriceContext";
import { useFxs } from "@/context/FxContext";
import {getFxs} from "@/hooks/useFxDatabase";

const AggregateContext = createContext();

export function useAggregates() {
  const context = useContext(AggregateContext);
  if (!context) throw new Error('useAggregates must be used within AggregateProvider');
  return context;
}

// ---------------------------------------------------------
// FX GETTER — WORKS FOR ALL CASES INCLUDING MISSING USD FX
// ---------------------------------------------------------
function getFxRate(fxs, currency, date, basis) {
  if (basis === "Local") return 1; // Local = no conversion
  if (currency === "USD" && basis === "USD") return 1;
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

export function AggregateProvider({ children }) {
  const { transactions, loadingTransactions } = useTransactions();
  const { prices } = usePrices();
  const { fxs, setFxs } = useFxs();  // <-- must have setter
  const [basis, setBasis] = useState("Local");
  const [holdingsArray, setHoldingsArray] = useState([]);
  const [missingFX, setMissingFX] = useState([]);

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => parseInt(a.TradeDate) - parseInt(b.TradeDate));
  }, [transactions]);

  // ---------------------------------------------------------
  // Compute holdings and track missing FX
  // ---------------------------------------------------------
  useEffect(() => {
    let missing = [];
    const holdingsMap = {};

    sortedTransactions.forEach(tx => {
      if (tx.AssetClass !== "STK") return;

      const key = `${tx.Ticker}|${tx.ListingExchange}`;
      const quantity = parseFloat(tx.Quantity);
      const netCash = parseFloat(tx.NetCash);
      const currency = tx.CurrencyPrimary;
      const tradeDate = tx.TradeDate;

      if (!holdingsMap[key]) {
        holdingsMap[key] = {
          ticker: tx.Ticker,
          description: tx.Description,
          exchange: tx.ListingExchange,
          currency,
          totalQuantity: 0,
          costBasis: 0,
          realisedPL: 0
        };
      }

      const item = holdingsMap[key];
      const fxRate = getFxRate(fxs, currency, tradeDate, basis);

      if (fxRate === null) {
        missing.push({ ticker: tx.Ticker, currency, tradeDate });
        return;
      }

      const netCashBasis = netCash * fxRate;
      const prevQty = item.totalQuantity;
      const newQty = prevQty + quantity;
      const avgCost = prevQty !== 0 ? item.costBasis / prevQty : 0;

      if ((prevQty > 0 && quantity < 0) || (prevQty < 0 && quantity > 0)) {
        item.realisedPL += netCashBasis - avgCost * quantity;
        item.costBasis += avgCost * quantity;
      } else {
        item.costBasis += netCashBasis;
      }

      item.totalQuantity = newQty;
    });

    // If we have missing FX, fetch them
    if (missing.length > 0) {
      (async () => {
        const stillMissing = [];
        for (const m of missing) {
          // Try to fetch FX for the transaction currency
          await getFxs(m.currency, m.tradeDate, m.tradeDate, fxs, setFxs);

          // Check if it really exists now
          const txFx = fxs[m.currency]?.[m.tradeDate];
          if (!txFx) stillMissing.push({ currency: m.currency, tradeDate: m.tradeDate });

          // Fetch FX for basis if needed
          if (basis !== "Local" && basis !== m.currency) {
            await getFxs(basis, m.tradeDate, m.tradeDate, fxs, setFxs);
            const basisFx = fxs[basis]?.[m.tradeDate];
            if (!basisFx) stillMissing.push({ currency: basis, tradeDate: m.tradeDate });
          }
        }
        setMissingFX(stillMissing); // only really missing FX
      })();
    }

    const holdings = Object.values(holdingsMap).map(h => {
      const tickerPrices = prices[h.ticker];
      const latestDate = tickerPrices ? Object.keys(tickerPrices).sort().pop() : null;
      const priceLocal = latestDate ? tickerPrices[latestDate] : null;
      const fxPrice = latestDate ? getFxRate(fxs, h.currency, latestDate, basis) ?? 1 : 1;
      const price = priceLocal !== null ? priceLocal * fxPrice : null;
      const value = price !== null ? price * h.totalQuantity : null;
      const avgCost = h.totalQuantity !== 0 ? h.costBasis / h.totalQuantity : null;
      const unrealisedPL = value !== null && h.costBasis !== null ? value + h.costBasis : null;

      return {
        ...h,
        totalProceeds: h.costBasis,
        price,
        value,
        avgCost,
        unrealisedPL,
        realisedPL: h.realisedPL,
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
      const curr = basis === "Local" ? h.currency : basis;

      if (!map[curr]) {
        map[curr] = {
          costBasis: 0,
          marketValue: 0,
          unrealisedPL: 0,
          realisedPL: 0,
          pl: 0
        };
      }

      if (h.totalProceeds !== null) map[curr].costBasis += h.totalProceeds;
      else missingPLCurrencies.add(curr);

      if (h.value !== null) map[curr].marketValue += h.value;
      else missingPLCurrencies.add(curr);

      if (h.unrealisedPL !== null) map[curr].unrealisedPL += h.unrealisedPL;
      else missingPLCurrencies.add(curr);

      if (h.realisedPL !== null) map[curr].realisedPL += h.realisedPL;
      else missingPLCurrencies.add(curr);

      if (h.pl !== null) map[curr].pl += h.pl;
      else missingPLCurrencies.add(curr);
    });

    return {
      map,
      missingPLCurrencies: Array.from(missingPLCurrencies)
    };
  }, [holdingsArray, basis]);

  return (
    <AggregateContext.Provider
      value={{
        holdingsArray,
        aggregates,
        missingFX,
        basis,
        setBasis,
        loadingAggregates: loadingTransactions
      }}
    >
      {children}
    </AggregateContext.Provider>
  );
}
