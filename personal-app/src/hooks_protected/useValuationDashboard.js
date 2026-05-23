'use client';

import { useMemo } from "react";
import { useValuationContext } from "@/context/ValuationContext";
import { useUserSettings } from "@/context/UserSettingsContext";
import { useValuationPositions } from "@/hooks_protected/useValuationPositions";

function buildSnapshotAggregates(holdings, basis) {
  const aggMap = {};
  const missingPLCurrencies = new Set();

  const addMissingCurrency = (currency) => {
    const normalized = (currency || "").trim().toUpperCase();
    if (normalized) missingPLCurrencies.add(normalized);
  };

  holdings.forEach((h) => {
    const curr = basis === "Local" ? h.tradingCurrency : basis;
    if (!curr) return;
    if (!aggMap[curr]) {
      aggMap[curr] = { costBasis: 0, marketValue: 0, unrealisedPL: 0, realisedPL: 0, pL: 0 };
    }
    if (h.costBasis != null) aggMap[curr].costBasis += h.costBasis; else addMissingCurrency(curr);
    if (h.value != null) aggMap[curr].marketValue += h.value; else addMissingCurrency(curr);
    if (h.unrealisedPL != null) aggMap[curr].unrealisedPL += h.unrealisedPL; else addMissingCurrency(curr);
    if (h.realisedPL != null) aggMap[curr].realisedPL += h.realisedPL; else addMissingCurrency(curr);
    if (h.pL != null) aggMap[curr].pL += h.pL; else addMissingCurrency(curr);
  });

  return { aggMap, missingPLCurrencies: [...missingPLCurrencies] };
}

function buildMarketValueByTicker(holdings) {
  const withValue = holdings.filter((h) => h.value != null);
  const totalMarketValue = withValue.reduce((sum, h) => sum + h.value, 0);
  if (!totalMarketValue) return [];
  return withValue
    .map((h) => ({ ticker: h.ticker, marketValue: h.value, percent: h.value / totalMarketValue }))
    .sort((a, b) => b.marketValue - a.marketValue)
    .slice(0, 10);
}

function buildMarketValueByTradingCurrency(holdings) {
  const map = {};
  holdings.forEach((h) => {
    const tradingCurrency = (h.tradingCurrency || "").trim().toUpperCase();
    if (h.value == null || !tradingCurrency) return;
    if (!map[tradingCurrency]) map[tradingCurrency] = 0;
    map[tradingCurrency] += h.value;
  });
  const totalMarketValue = Object.values(map).reduce((sum, value) => sum + value, 0);
  if (!totalMarketValue) return [];
  return Object.entries(map).map(([tradingCurrency, marketValue]) => ({
    tradingCurrency,
    marketValue,
    percent: marketValue / totalMarketValue
  }));
}

export function useValuationDashboard() {
  const { endDateDisplay } = useValuationContext();
  const { basis } = useUserSettings();
  const holdings = useValuationPositions(endDateDisplay);

  return useMemo(() => {
    return {
      holdings,
      aggregates: buildSnapshotAggregates(holdings, basis),
      marketValueByTicker: buildMarketValueByTicker(holdings),
      marketValueByTradingCurrency: buildMarketValueByTradingCurrency(holdings)
    };
  }, [holdings, basis]);
}
