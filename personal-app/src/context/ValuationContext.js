'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useTransactions } from "@/context/TransactionContext";
import { useFxs } from "@/context/FxContext";
import { usePrices } from "@/context/PriceContext";
import { getFxs } from "@/utils_protected/fxApi";
import { getPrices } from "@/utils_protected/priceApi";
import {useDividends} from "@/context/DividendContext";
import { useUserSettings } from "@/context/UserSettingsContext";

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
    corporateActions,
    setCorporateActions,
    setLoadingCorporateActions,
  } = usePrices();
  const { fxs, lastFxDate, setFxs, setLoadingFxs } = useFxs();
  const { transactions, firstTransactionDate } = useTransactions();
  const { dividends } = useDividends();
  const { userSettings, putUserSettings } = useUserSettings();

  const [basis, setBasis] = useState("Local");
  const [startDateDisplay, setStartDateDisplay] = useState(yesterdayStrStart);
  const [endDateDisplay, setEndDateDisplay] = useState(yesterdayStr);

  // Update start date based on first transaction and endDate
  useEffect(() => {
    if (!firstTransactionDate || !endDateDisplay) return;
    const yearStart = `${endDateDisplay.slice(0, 4)}0101`;
    if (startDateDisplay == null) setStartDateDisplay(firstTransactionDate < yearStart ? yearStart : firstTransactionDate);
  }, [firstTransactionDate, endDateDisplay]);

  // Initialize basis from user settings (default Local)
  useEffect(() => {
    const serverBasis = userSettings?.basis;
    if (serverBasis) {
      setBasis(serverBasis);
    } else if (userSettings && !serverBasis) {
      setBasis("Local");
    }
  }, [userSettings]);

  // Sync basis to user settings
  useEffect(() => {
    if (!userSettings) return;
    if (userSettings.basis === basis) return;
    const next = { ...userSettings, basis };
    putUserSettings({ items: JSON.stringify(next) });
  }, [basis, userSettings, putUserSettings]);

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
  }, [transactions, basis, firstTransactionDate, endDateDisplay]);

  // Fetch missing Prices
  useEffect(() => {
    if (!transactions?.length || !startDateDisplay || !endDateDisplay) return;
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
      transactions.forEach(tx => {
        if (tx.assetClass !== "STK") return;
        const year = tx.tradeDate.slice(0, 4);
        const prev = requests.get(tx.ticker);
        if (!prev || year < prev) requests.set(tx.ticker, year);
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
          corporateActions,
          setCorporateActions,
          setLoadingCorporateActions
        );
      }
    };

    fetchPrices();
  }, [transactions, startDateDisplay, endDateDisplay]);

  const appliedCorporateActions = useMemo(() => {
    const rows = [];
    const appliedMap = userSettings?.corporate_actions_applied ?? {};
    const appliedSet = new Set(Object.keys(appliedMap));
    const unappliedSet = new Set(userSettings?.corporate_actions_unapplied ?? []);

    Object.entries(corporateActions || {}).forEach(([ticker, actions]) => {
      if (!actions || typeof actions !== "object") return;
      Object.entries(actions).forEach(([actionDate, details]) => {
        const type = details?.type ?? "UNKNOWN";
        const actionKey = `${ticker}#${type}#${actionDate}`;
        const ratioVal = details?.ratio ?? details?.factor ?? "";
        const ratioNum = Number(ratioVal);
        const hasPositiveRatio = !isNaN(ratioNum) && ratioNum > 0;
        if (unappliedSet.has(actionKey)) return;
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

    const added = userSettings?.corporate_actions_added ?? {};
    Object.entries(added).forEach(([ticker, actions]) => {
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
  }, [corporateActions, userSettings]);


  return (
    <ValuationContext.Provider
      value={{
        basis,
        setBasis,
        startDateDisplay,
        setStartDateDisplay,
        endDateDisplay,
        setEndDateDisplay,
        appliedCorporateActions,
      }}
    >
      {children}
    </ValuationContext.Provider>
  );
}
