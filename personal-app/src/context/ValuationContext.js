'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react';
import { useTransactions } from "@/context/TransactionContext";
import { useFxs } from "@/context/FxContext";
import { usePrices } from "@/context/PriceContext";
import { getFxs } from "@/utils_protected/fxApi";
import { getPrices } from "@/utils_protected/priceApi";
import {useDividends} from "@/context/DividendContext";
import { useUserSettings } from "@/context/UserSettingsContext";
import { useValuation as useProtectedValuation, usePL as useProtectedPL } from "@/hooks_protected/useValuation";

const d0 = new Date();
d0.setDate(d0.getDate() - 1);
const yesterdayStr = d0.getFullYear().toString() + String(d0.getMonth() + 1).padStart(2, '0') + String(d0.getDate()).padStart(2, '0');
const yesterdayStrStart = yesterdayStr.slice(0,4) + "0101"

const ValuationContext = createContext(null);

export function useValuationContext() {
  const context = useContext(ValuationContext);
  if (context === null) throw new Error('useValuationContext must be used within ValuationProvider');
  return context;
}

export function ValuationProvider({ children }) {
  const {
    prices,
    lastPriceDate,
    setPrices,
    setLoadingPrices,
    setPriceTickerMap,
    priceTickerMap,
    corporateActions,
    setCorporateActions,
    setLoadingCorporateActions,
  } = usePrices();
  const { fxs, lastFxDate, setFxs, setLoadingFxs } = useFxs();
  const { transactions, firstTransactionDate, transactionTickerMap } = useTransactions();
  const { dividends } = useDividends();
  const { basis, userCorporateActionsMask } = useUserSettings();

  const [startDateDisplay, setStartDateDisplay] = useState(yesterdayStrStart);
  const [endDateDisplay, setEndDateDisplay] = useState(yesterdayStr);
  const latestValuationDate = useMemo(() => {
    if (!lastPriceDate && !lastFxDate) return null;
    if (!lastPriceDate) return lastFxDate;
    if (!lastFxDate) return lastPriceDate;
    return lastPriceDate > lastFxDate ? lastPriceDate : lastFxDate;
  }, [lastPriceDate, lastFxDate]);
  const attemptedChildPriceRef = useRef(new Set());

  // Update start date based on first transaction and endDate
  useEffect(() => {
    if (!firstTransactionDate || !endDateDisplay) return;
    const yearStart = `${endDateDisplay.slice(0, 4)}0101`;
    if (startDateDisplay == null) setStartDateDisplay(firstTransactionDate < yearStart ? yearStart : firstTransactionDate);
  }, [firstTransactionDate, endDateDisplay]);

  const appliedMap = userCorporateActionsMask?.applied ?? {};
  const excludedList = userCorporateActionsMask?.excluded ?? [];
  const addedMap = userCorporateActionsMask?.added ?? {};

  const appliedCorporateActions = useMemo(() => {
    const rows = [];
    const appliedSet = new Set(Object.keys(appliedMap));
    const excludedSet = new Set(excludedList);

    Object.entries(corporateActions || {}).forEach(([ticker, actions]) => {
      if (!actions || typeof actions !== "object") return;
      Object.entries(actions).forEach(([actionDate, details]) => {
        const type = details?.type ?? "UNKNOWN";
        const actionKey = `${ticker}#${type}#${actionDate}`;
        const ratioVal = details?.ratio ?? details?.factor ?? "";
        const ratioNum = Number(ratioVal);
        const hasPositiveRatio = !isNaN(ratioNum) && ratioNum > 0;
        if (excludedSet.has(actionKey)) return;
        const overrides = appliedMap[actionKey] ?? {};
        if (appliedSet.has(actionKey) || hasPositiveRatio) {
          rows.push({
            ticker,
            actionDate,
            type,
            summary: overrides.summary ?? details?.summary ?? "",
            child_ticker: overrides.child_ticker ?? details?.child_ticker ?? "",
            ratio: overrides.ratio ?? ratioVal,
            actionKey,
          });
        }
      });
    });

    Object.entries(addedMap).forEach(([ticker, actions]) => {
      if (!actions || typeof actions !== "object") return;
      Object.entries(actions).forEach(([actionDate, details]) => {
        const type = details?.type ?? "UNKNOWN";
        const actionKey = `${ticker}#${type}#${actionDate}`;
        const overrides = appliedMap[actionKey] ?? {};
        rows.push({
          ticker,
          actionDate,
          type,
          summary: overrides.summary ?? details?.summary ?? "",
          child_ticker: overrides.child_ticker ?? details?.child_ticker ?? "",
          ratio: overrides.ratio ?? details?.ratio ?? details?.factor ?? "",
          actionKey,
        });
      });
    });

    return rows;
  }, [corporateActions, appliedMap, excludedList, addedMap]);

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
      dividends.forEach(div => {
        if (div.currencyPrimary === "USD") return;
        const year = div.exDate.slice(0, 4);
        const prev = requests.get(div.currencyPrimary);
        if (!prev || year < prev) requests.set(div.currencyPrimary, year);
      });

      // For spin-off child tickers, ensure FX exists from action year onward.
      (appliedCorporateActions || [])
        .filter(a => a.type === "SPIN_OFF" && a.child_ticker && a.actionDate)
        .forEach(a => {
          const currency = priceTickerMap?.[a.child_ticker]?.tradingCurrency;
          if (!currency || currency === "USD") return;
          const year = a.actionDate.slice(0, 4);
          const prev = requests.get(currency);
          if (!prev || year < prev) requests.set(currency, year);
        });

      if (basis !== "Local") requests.set(basis, firstTransactionDate.slice(0, 4));

      const items = Array.from(requests.entries())
        .map(([currency, minYear]) => {
          const startDate = `${minYear}0101`;
          return startDate <= endDateDisplay ? { currency, startDate, endDate: endDateDisplay } : null;
        })
        .filter(Boolean);
      if (items.length) await getFxs(items, fxs, setFxs, setLoadingFxs);
    };

    fetchFxs();
  }, [transactions, dividends, basis, firstTransactionDate, endDateDisplay, appliedCorporateActions, priceTickerMap]);

  const tickerMap = useMemo(() => {
    const merged = {};
    const allTickers = new Set([
      ...Object.keys(transactionTickerMap || {}),
      ...Object.keys(priceTickerMap || {}),
    ]);

    allTickers.forEach((ticker) => {
      const txMeta = transactionTickerMap?.[ticker] ?? {};
      const priceMeta = priceTickerMap?.[ticker] ?? {};
      merged[ticker] = {
        description: txMeta.description || priceMeta.description || "",
        exchange: txMeta.exchange || priceMeta.exchange || "",
        tradingCurrency: txMeta.tradingCurrency || priceMeta.tradingCurrency || "",
      };
    });

    return merged;
  }, [transactionTickerMap, priceTickerMap]);

  // Fetch missing Prices (transactions + spin-offs)
  useEffect(() => {
    if (!startDateDisplay || !endDateDisplay) return;
    let startDateRequest = new Date(
      Number(startDateDisplay.slice(0, 4)),
      Number(startDateDisplay.slice(4, 6)) - 1,
      Number(startDateDisplay.slice(6, 8))
    )
    startDateRequest.setDate(startDateRequest.getDate() - 1);
    const startDateYYYYMMDD =
      startDateRequest.getFullYear().toString() +
      String(startDateRequest.getMonth() + 1).padStart(2, "0") +
      String(startDateRequest.getDate()).padStart(2, "0");

    const fetchPrices = async () => {
      const requests = new Map();
      const requestedChildTickers = [];

      transactions?.forEach(tx => {
        if (tx.assetClass !== "STK") return;
        const year = tx.tradeDate.slice(0, 4);
        const prev = requests.get(tx.ticker);
        if (!prev || year < prev) requests.set(tx.ticker, year);
      });

      appliedCorporateActions
        .filter(a => a.type === "SPIN_OFF" && a.child_ticker)
        .forEach(a => {
          const year = a.actionDate?.slice(0, 4);
          if (!year) return;
          if (attemptedChildPriceRef.current.has(a.child_ticker)) return;
          const prev = requests.get(a.child_ticker);
          if (!prev || year < prev) requests.set(a.child_ticker, year);
          requestedChildTickers.push(a.child_ticker);
        });

      const items = Array.from(requests.entries())
        .map(([ticker, minYear]) => {
          const startDate = `${minYear}0101`;
          if (startDate < startDateYYYYMMDD) {
            return { ticker, startDate: startDateYYYYMMDD, endDate: endDateDisplay };
          } else if (startDate <= endDateDisplay) {
            return { ticker, startDate, endDate: endDateDisplay };
          } else {
            return null;
          }
        })
        .filter(Boolean);
      if (items.length) {
        await getPrices(
          items,
          prices,
          setPrices,
          setLoadingPrices,
          setPriceTickerMap,
          corporateActions,
          setCorporateActions,
          setLoadingCorporateActions
        );
        requestedChildTickers.forEach(t => attemptedChildPriceRef.current.add(t));
      }
    };

    fetchPrices();
  }, [transactions, appliedCorporateActions, startDateDisplay, endDateDisplay]);

  const {
    cumulativeHoldingsByTickerByDate,
    cumulativeCostBasisByTickerByDate,
    cumulativeMarketValueByTickerByDate,
    cumulativeRealisedPLByTickerByDate,
    cumulativeUnrealisedPLByTickerByDate,
    dividendByTickerByDate,
    transactionByTickerByDate,
    holdings,
    aggregates,
    marketValueByTicker,
    marketValueByTradingCurrency,
  } = useProtectedValuation(
    transactions,
    prices,
    tickerMap,
    fxs,
    setFxs,
    setLoadingFxs,
    basis,
    endDateDisplay,
    dividends,
    appliedCorporateActions
  );

  const {
    holdings: allTimeHoldings,
    aggregates: allTimeAggregates,
  } = useProtectedValuation(
    transactions,
    prices,
    tickerMap,
    fxs,
    setFxs,
    setLoadingFxs,
    basis,
    latestValuationDate,
    dividends,
    appliedCorporateActions
  );

  const { cumulativePLByDate } = useProtectedPL(
    transactions,
    prices,
    tickerMap,
    setPrices,
    setLoadingPrices,
    fxs,
    basis,
    startDateDisplay,
    endDateDisplay,
    dividends,
    appliedCorporateActions
  );

  return (
    <ValuationContext.Provider
      value={{
        startDateDisplay,
        setStartDateDisplay,
        endDateDisplay,
        setEndDateDisplay,
        tickerMap,
        appliedCorporateActions,
      holdings,
      aggregates,
      allTimeHoldings,
      allTimeAggregates,
      latestValuationDate,
      marketValueByTicker,
        marketValueByTradingCurrency,
        cumulativePLByDate,
        cumulativeHoldingsByTickerByDate,
        cumulativeCostBasisByTickerByDate,
        cumulativeMarketValueByTickerByDate,
        cumulativeRealisedPLByTickerByDate,
        cumulativeUnrealisedPLByTickerByDate,
        dividendByTickerByDate,
        transactionByTickerByDate,
      }}
    >
      {children}
    </ValuationContext.Provider>
  );
}
