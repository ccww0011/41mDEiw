'use client';

import { useMemo } from "react";
import { useValuationContext } from "@/context/ValuationContext";

function getSnapshotValue(byDate, targetDate) {
  if (!byDate || !targetDate) return null;
  if (Object.prototype.hasOwnProperty.call(byDate, targetDate)) return byDate[targetDate];
  let latestDate = null;
  let latestValue = null;
  Object.entries(byDate).forEach(([date, value]) => {
    if (date <= targetDate && (latestDate == null || date > latestDate)) {
      latestDate = date;
      latestValue = value;
    }
  });
  return latestValue;
}

function buildHoldingsAtDate({
  targetDate,
  tickerMap,
  cumulativeHoldingsByTickerByDate,
  cumulativeCostBasisByTickerByDate,
  cumulativeMarketValueByTickerByDate,
  cumulativeRealisedPLByTickerByDate,
  cumulativeUnrealisedPLByTickerByDate
}) {
  if (!targetDate) return [];

  const tickerSet = new Set([
    ...Object.keys(cumulativeHoldingsByTickerByDate || {}),
    ...Object.keys(cumulativeCostBasisByTickerByDate || {}),
    ...Object.keys(cumulativeMarketValueByTickerByDate || {}),
    ...Object.keys(cumulativeRealisedPLByTickerByDate || {}),
    ...Object.keys(cumulativeUnrealisedPLByTickerByDate || {}),
  ]);

  return Array.from(tickerSet).map((ticker) => {
    const totalQuantity = getSnapshotValue(cumulativeHoldingsByTickerByDate?.[ticker], targetDate) ?? 0;
    const costBasis = getSnapshotValue(cumulativeCostBasisByTickerByDate?.[ticker], targetDate) ?? 0;
    const value = getSnapshotValue(cumulativeMarketValueByTickerByDate?.[ticker], targetDate);
    const realisedPL = getSnapshotValue(cumulativeRealisedPLByTickerByDate?.[ticker], targetDate) ?? 0;
    const unrealisedPL =
      getSnapshotValue(cumulativeUnrealisedPLByTickerByDate?.[ticker], targetDate) ??
      (value != null ? value + costBasis : null);
    const meta = tickerMap?.[ticker] ?? {};

    return {
      ticker,
      description: meta.description ?? "",
      exchange: meta.exchange ?? "",
      tradingCurrency: meta.tradingCurrency ?? "",
      totalQuantity,
      costBasis,
      realisedPL,
      value,
      avgCost: totalQuantity !== 0 ? costBasis / totalQuantity : null,
      price: totalQuantity !== 0 && value != null ? value / totalQuantity : null,
      unrealisedPL,
      pL: unrealisedPL != null ? unrealisedPL + realisedPL : null
    };
  }).filter((h) => !(h.totalQuantity === 0 && h.costBasis === 0 && h.realisedPL === 0));
}

export function useValuationPositions(targetDate) {
  const {
    endDateDisplay,
    getNormalizedValuationSeries,
    tickerMap,
  } = useValuationContext();

  return useMemo(() => {
    const normalized = getNormalizedValuationSeries(targetDate || endDateDisplay);
    return buildHoldingsAtDate({
      targetDate: targetDate || endDateDisplay,
      tickerMap,
      cumulativeHoldingsByTickerByDate: normalized.cumulativeHoldingsByTickerByDate,
      cumulativeCostBasisByTickerByDate: normalized.cumulativeCostBasisByTickerByDate,
      cumulativeMarketValueByTickerByDate: normalized.cumulativeMarketValueByTickerByDate,
      cumulativeRealisedPLByTickerByDate: normalized.cumulativeRealisedPLByTickerByDate,
      cumulativeUnrealisedPLByTickerByDate: normalized.cumulativeUnrealisedPLByTickerByDate
    });
  }, [
    targetDate,
    endDateDisplay,
    getNormalizedValuationSeries,
    tickerMap,
  ]);
}
