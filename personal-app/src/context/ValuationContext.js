'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react';
import { useTransactions } from "@/context/TransactionContext";
import { useFxs } from "@/context/FxContext";
import { usePrices } from "@/context/PriceContext";
import { getFxs } from "@/utils_protected/fxApi";
import { getPrices } from "@/utils_protected/priceApi";
import { getCorporateActions } from "@/utils_protected/corporateActionApi";
import {useDividends} from "@/context/DividendContext";
import { useUserSettings } from "@/context/UserSettingsContext";
import { useValuation as useProtectedValuation, usePL as useProtectedPL } from "@/hooks_protected/useValuation";

const d0 = new Date();
d0.setDate(d0.getDate() - 1);
const yesterdayStr = d0.getFullYear().toString() + String(d0.getMonth() + 1).padStart(2, '0') + String(d0.getDate()).padStart(2, '0');
const yesterdayStrStart = yesterdayStr.slice(0,4) + "0101"

function buildRequestItems(requests, startDateYYYYMMDD, fetchEndDate) {
  return Array.from(requests.entries())
    .map(([key, minYear]) => {
      const startDate = `${minYear}0101`;
      if (startDate < startDateYYYYMMDD) {
        return { ticker: key, startDate: startDateYYYYMMDD, endDate: fetchEndDate };
      }
      if (startDate <= fetchEndDate) {
        return { ticker: key, startDate, endDate: fetchEndDate };
      }
      return null;
    })
    .filter(Boolean);
}

function buildEffectiveCorporateActionRows(corporateActions, appliedMap, excludedList, addedMap) {
  const rows = [];
  const appliedSet = new Set(Object.keys(appliedMap || {}));
  const excludedSet = new Set(excludedList || []);

  Object.entries(corporateActions || {}).forEach(([ticker, actions]) => {
    if (!actions || typeof actions !== "object") return;
    Object.entries(actions).forEach(([actionDate, details]) => {
      const type = details?.type ?? "UNKNOWN";
      const actionKey = `${ticker}#${type}#${actionDate}`;
      const ratioVal = details?.ratio ?? details?.factor ?? "";
      const ratioNum = Number(ratioVal);
      const hasPositiveRatio = !isNaN(ratioNum) && ratioNum > 0;
      if (excludedSet.has(actionKey)) return;
      const overrides = appliedMap?.[actionKey] ?? {};
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

  Object.entries(addedMap || {}).forEach(([ticker, actions]) => {
    if (!actions || typeof actions !== "object") return;
    Object.entries(actions).forEach(([actionDate, details]) => {
      const type = details?.type ?? "UNKNOWN";
      const actionKey = `${ticker}#${type}#${actionDate}`;
      const overrides = appliedMap?.[actionKey] ?? {};
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
}

function normalizeCurrency(currency) {
  return (currency || "").trim().toUpperCase();
}

function getDividendCurrency(div) {
  return normalizeCurrency(
    div?.dividendCurrency ??
    div?.distributionCurrency ??
    div?.currencySecondary ??
    div?.currencyPrimary
  );
}

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
    corporateActionFetchMap,
    setCorporateActionFetchMap,
    setCorporateActions,
    setLoadingCorporateActions,
  } = usePrices();
  const { fxs, lastFxDate, setFxs, setLoadingFxs } = useFxs();
  const { transactions, firstTransactionDate, transactionTickerMap } = useTransactions();
  const { dividends } = useDividends();
  const { basis, userCorporateActionsMask } = useUserSettings();

  const [startDateDisplay, setStartDateDisplay] = useState(yesterdayStrStart);
  const [endDateDisplay, setEndDateDisplay] = useState(yesterdayStr);
  const pricesRef = useRef(prices);
  const priceTickerMapRef = useRef(priceTickerMap);
  const corporateActionsRef = useRef(corporateActions);
  const corporateActionFetchMapRef = useRef(corporateActionFetchMap);
  const fxsRef = useRef(fxs);
  const requestSignatureRef = useRef("");
  const latestValuationDate = useMemo(() => {
    if (!lastPriceDate && !lastFxDate) return null;
    if (!lastPriceDate) return lastFxDate;
    if (!lastFxDate) return lastPriceDate;
    return lastPriceDate > lastFxDate ? lastPriceDate : lastFxDate;
  }, [lastPriceDate, lastFxDate]);
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
    return buildEffectiveCorporateActionRows(corporateActions, appliedMap, excludedList, addedMap);
  }, [corporateActions, appliedMap, excludedList, addedMap]);

  pricesRef.current = prices;
  priceTickerMapRef.current = priceTickerMap;
  corporateActionsRef.current = corporateActions;
  corporateActionFetchMapRef.current = corporateActionFetchMap;
  fxsRef.current = fxs;

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

  // Fetch corporate actions recursively, then prices, then FX for the completed ticker universe.
  useEffect(() => {
    if (!transactions?.length || !basis || !firstTransactionDate || !startDateDisplay || !endDateDisplay) return;
    const fetchEndDate = endDateDisplay;
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

    const requestSignature = JSON.stringify({
      tx: transactions.map((tx) => `${tx.ticker}|${tx.tradeDate}|${tx.assetClass}|${tx.currencyPrimary}`),
      div: dividends.map((div) => `${div.ticker}|${div.exDate}|${getDividendCurrency(div)}`),
      basis,
      firstTransactionDate,
      startDateDisplay,
      endDateDisplay,
      applied: Object.keys(appliedMap).sort(),
      excluded: [...excludedList].sort(),
      added: Object.keys(addedMap).sort(),
    });
    if (requestSignatureRef.current === requestSignature) return;
    requestSignatureRef.current = requestSignature;

    const fetchValuationInputs = async () => {
      const tickerRequests = new Map();
      const mergedCorporateActions = { ...(corporateActionsRef.current || {}) };

      const addTickerRequest = (ticker, year) => {
        if (!ticker || !year) return;
        const prev = tickerRequests.get(ticker);
        if (!prev || year < prev) tickerRequests.set(ticker, year);
      };

      transactions?.forEach(tx => {
        if (tx.assetClass !== "STK") return;
        addTickerRequest(tx.ticker, tx.tradeDate.slice(0, 4));
      });

      let expanded = true;
      let iterations = 0;
      while (expanded && iterations < 20) {
        iterations += 1;
        expanded = false;

        const corporateActionItems = buildRequestItems(tickerRequests, startDateYYYYMMDD, fetchEndDate);
        const fetchedCorporateActions = corporateActionItems.length
          ? await getCorporateActions(
              corporateActionItems,
              corporateActionsRef.current,
              setCorporateActions,
              setLoadingCorporateActions,
              corporateActionFetchMapRef.current,
              setCorporateActionFetchMap
            )
          : {};

        Object.entries(fetchedCorporateActions || {}).forEach(([ticker, actions]) => {
          mergedCorporateActions[ticker] = {
            ...(mergedCorporateActions[ticker] || {}),
            ...(actions || {}),
          };
        });

        const effectiveActions = buildEffectiveCorporateActionRows(
          mergedCorporateActions,
          appliedMap,
          excludedList,
          addedMap
        );
        Array.from(tickerRequests.entries()).forEach(([ticker]) => {
          effectiveActions
            .filter((action) => action.ticker === ticker && action.type === "SPIN_OFF" && action.child_ticker)
            .forEach((action) => {
              const before = tickerRequests.get(action.child_ticker);
              addTickerRequest(action.child_ticker, action.actionDate?.slice(0, 4));
              if (tickerRequests.get(action.child_ticker) !== before) {
                expanded = true;
              }
            });
        });
      }

      const priceItems = buildRequestItems(tickerRequests, startDateYYYYMMDD, fetchEndDate);
      let fetchedPriceMeta = {};
      if (priceItems.length) {
        const priceResult = await getPrices(
          priceItems,
          pricesRef.current,
          setPrices,
          setLoadingPrices,
          setPriceTickerMap,
          corporateActionsRef.current,
          setCorporateActions,
          setLoadingCorporateActions,
          corporateActionFetchMapRef.current,
          setCorporateActionFetchMap,
          false
        );
        fetchedPriceMeta = priceResult?.meta ?? {};
      }

      const combinedTickerMeta = { ...(priceTickerMapRef.current || {}) };
      Object.entries(fetchedPriceMeta).forEach(([ticker, meta]) => {
        combinedTickerMeta[ticker] = {
          description: (meta?.description ?? combinedTickerMeta[ticker]?.description ?? "").toUpperCase(),
          exchange: (meta?.exchange ?? combinedTickerMeta[ticker]?.exchange ?? "").toUpperCase(),
          tradingCurrency: (meta?.tradingCurrency ?? combinedTickerMeta[ticker]?.tradingCurrency ?? "").toUpperCase(),
        };
      });

      const fxRequests = new Map();
      const addFxRequest = (currency, year) => {
        const normalizedCurrency = (currency || "").trim().toUpperCase();
        if (!normalizedCurrency || normalizedCurrency === "USD" || !year) return;
        const prev = fxRequests.get(normalizedCurrency);
        if (!prev || year < prev) fxRequests.set(normalizedCurrency, year);
      };

      transactions.forEach((tx) => addFxRequest(tx.currencyPrimary, tx.tradeDate.slice(0, 4)));
      dividends.forEach((div) => {
        const year = div?.exDate?.slice(0, 4);
        if (!year) return;
        addFxRequest(getDividendCurrency(div), year);
        const tickerCurrency = normalizeCurrency(
          transactionTickerMap?.[div.ticker]?.tradingCurrency ||
          combinedTickerMeta?.[div.ticker]?.tradingCurrency ||
          ""
        );
        addFxRequest(tickerCurrency, year);
      });
      Array.from(tickerRequests.entries()).forEach(([ticker, year]) => {
        const currency =
          transactionTickerMap?.[ticker]?.tradingCurrency ||
          combinedTickerMeta?.[ticker]?.tradingCurrency ||
          "";
        addFxRequest(currency, year);
      });

      if (basis !== "Local") addFxRequest(basis, firstTransactionDate.slice(0, 4));

      const fxItems = Array.from(fxRequests.entries())
        .map(([currency, minYear]) => {
          const startDate = `${minYear}0101`;
          return startDate <= fetchEndDate ? { currency, startDate, endDate: fetchEndDate } : null;
        })
        .filter(Boolean);
      if (fxItems.length) {
        await getFxs(fxItems, fxsRef.current, setFxs, setLoadingFxs);
      }
    };

    fetchValuationInputs();
  }, [
    transactions,
    dividends,
    basis,
    firstTransactionDate,
    startDateDisplay,
    endDateDisplay,
    transactionTickerMap,
    appliedMap,
    excludedList,
    addedMap
  ]);

  const {
    holdings: endDateHoldings,
    aggregates: endDateAggregates,
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

  const latestValuation = useProtectedValuation(
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
  const latestHoldings = latestValuation.holdings;
  const latestAggregates = latestValuation.aggregates;
  const cumulativeHoldingsByTickerByDate = latestValuation.cumulativeHoldingsByTickerByDate;
  const cumulativeCostBasisByTickerByDate = latestValuation.cumulativeCostBasisByTickerByDate;
  const cumulativeMarketValueByTickerByDate = latestValuation.cumulativeMarketValueByTickerByDate;
  const cumulativeRealisedPLByTickerByDate = latestValuation.cumulativeRealisedPLByTickerByDate;
  const cumulativeUnrealisedPLByTickerByDate = latestValuation.cumulativeUnrealisedPLByTickerByDate;
  const dividendByTickerByDate = latestValuation.dividendByTickerByDate;
  const transactionByTickerByDate = latestValuation.transactionByTickerByDate;

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

  // console.log(cumulativePLByDate);

  return (
    <ValuationContext.Provider
      value={{
        startDateDisplay,
        setStartDateDisplay,
        endDateDisplay,
        setEndDateDisplay,
        tickerMap,
        appliedCorporateActions,
      holdings: endDateHoldings,
      aggregates: endDateAggregates,
      allTimeHoldings: latestHoldings,
      allTimeAggregates: latestAggregates,
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
