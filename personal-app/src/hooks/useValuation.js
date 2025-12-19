import {getMissingFxs} from "@/hooks/useFxDatabase";
import { useEffect, useMemo } from "react";

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

function getPrice(prices, ticker, date) {
  const tickerPrices = prices[ticker];
  if (!tickerPrices) return null;
  return tickerPrices[date] ?? null;
}

// Get today's date in UTC
const todayUTC = new Date();
const yesterdayUTC = new Date(Date.UTC(
  todayUTC.getUTCFullYear(),
  todayUTC.getUTCMonth(),
  todayUTC.getUTCDate() - 1
));

// Format as YYYYMMDD (UTC)
const yesterdayStr = `${yesterdayUTC.getUTCFullYear()}${String(
  yesterdayUTC.getUTCMonth() + 1
).padStart(2, '0')}${String(
  yesterdayUTC.getUTCDate()
).padStart(2, '0')}`;


const EMPTY_RESULT = {
  holdings: [],
  aggregates: { aggMap: {}, missingPLCurrencies: null},
  marketValueByTicker: [],
  marketValueByTradingCurrency: []
};

export function useValuation(transactions, prices, fxs, setFxs, setLoadingFxs, basis, startDate, valuationDate = yesterdayStr) {
  useEffect(() => {
    const fetchFxs = async () => {
      const requests = new Map();
      transactions.forEach(tx => {
        if (tx.currencyPrimary === "USD") return;
        const year = tx.tradeDate.slice(0, 4);
        if (!requests.has(year)) requests.set(year, new Set());
        requests.get(year).add(tx.currencyPrimary);
      });
      if (basis !== "Local") requests.forEach(currencies => currencies.add(basis));
      for (const [year, currencies] of requests.entries()) {
        let date = year + "0101";
        if (date > valuationDate) continue;
        return await getMissingFxs([...currencies], date, fxs, setFxs, setLoadingFxs);
      }
    };
    fetchFxs();
  }, [transactions, basis, valuationDate]);

  return useMemo(() => {
    if (!transactions?.length || !prices || !fxs) return EMPTY_RESULT;

    const translatedTransactions = transactions.map(tx => {
      const fxRate = getFxRate(fxs, tx.currencyPrimary, tx.tradeDate, basis);
      const netCashTranslated = fxRate == null ? null : parseFloat(tx.netCash) * fxRate;
      const fxRateUSD = getFxRate(fxs, tx.currencyPrimary, tx.tradeDate, "USD");
      const netCashUSD = fxRateUSD == null ? null : parseFloat(tx.netCash) * fxRateUSD;
      return { ...tx, netCashTranslated, fxRate, netCashUSD, fxRateUSD };
    });

    const sortedTransactions = [...translatedTransactions].sort((a, b) => parseInt(a.tradeDate) - parseInt(b.tradeDate));
    const holdingsMap = {};

    sortedTransactions.forEach(tx => {
      if (tx.assetClass !== "STK") return;
      const key = `${tx.ticker}|${tx.listingExchange}`;
      const quantity = parseFloat(tx.quantity);
      const netCash = parseFloat(tx.netCashTranslated);
      const netCashUSD = parseFloat(tx.netCashUSD);

      if (!holdingsMap[key]) holdingsMap[key] = {
        ticker: tx.ticker,
        description: tx.description,
        exchange: tx.listingExchange,
        tradingCurrency: tx.currencyPrimary,
        totalQuantity: 0,
        costBasis: 0,
        realisedPL: 0,
        costBasisUSD: 0,
        realisedPLUSD: 0
      };

      const item = holdingsMap[key];
      const prevQty = item.totalQuantity;
      item.totalQuantity += quantity;

      if ((prevQty > 0 && quantity < 0) || (prevQty < 0 && quantity > 0)) {
        const avgCost = prevQty !== 0 ? item.costBasis / prevQty : 0;
        item.realisedPL += netCash - avgCost * quantity;
        item.costBasis += avgCost * quantity;

        const avgCostUSD = prevQty !== 0 ? item.costBasisUSD / prevQty : 0;
        item.realisedPLUSD += netCashUSD - avgCostUSD * quantity;
        item.costBasisUSD += avgCostUSD * quantity;
      } else {
        item.costBasis += netCash;
        item.costBasisUSD += netCashUSD;
      }
    });

    const holdings = Object.values(holdingsMap).map(h => {
      const priceLocal = getPrice(prices, h.ticker, valuationDate);
      const fxPrice = getFxRate(fxs, h.tradingCurrency, valuationDate, basis);
      const price = priceLocal != null && fxPrice != null ? priceLocal * fxPrice : null;
      const value = price != null ? price * h.totalQuantity : null;
      const avgCost = h.totalQuantity !== 0 ? h.costBasis / h.totalQuantity : null;
      const unrealisedPL = value != null ? value + h.costBasis : null;

      const fxPriceUSD = getFxRate(fxs, h.tradingCurrency, valuationDate, "USD");
      const priceUSD = priceLocal != null && fxPriceUSD != null ? priceLocal * fxPriceUSD : null;
      const valueUSD = priceUSD != null ? priceUSD * h.totalQuantity : null;
      const avgCostUSD = h.totalQuantity !== 0 ? h.costBasisUSD / h.totalQuantity : null;
      const unrealisedPLUSD = valueUSD != null ? valueUSD + h.costBasisUSD : null;

      return {
        ...h, price, value, avgCost, unrealisedPL, priceUSD, valueUSD, avgCostUSD, unrealisedPLUSD, pLUSD: unrealisedPLUSD + h.realisedPLUSD
      };
    });

    const aggMap = {};
    const missingPLCurrencies = new Set();
    holdings.forEach(h => {
      const curr = basis === "Local" ? h.tradingCurrency : basis;
      if (!aggMap[curr]) aggMap[curr] = { costBasis: 0, marketValue: 0, unrealisedPL: 0, realisedPL: 0, pL: 0 };
      if (h.costBasis != null) aggMap[curr].costBasis += h.costBasis; else missingPLCurrencies.add(curr);
      if (h.value != null) aggMap[curr].marketValue += h.value; else missingPLCurrencies.add(curr);
      if (h.unrealisedPL != null) aggMap[curr].unrealisedPL += h.unrealisedPL; else missingPLCurrencies.add(curr);
      if (h.realisedPL != null) aggMap[curr].realisedPL += h.realisedPL; else missingPLCurrencies.add(curr);
      if (h.unrealisedPL !== null && h.realisedPL !== null) aggMap[curr].pL += h.unrealisedPL + h.realisedPL; else missingPLCurrencies.add(curr);
    });

    const allTickers = holdings.filter(h => h.valueUSD != null).map(h => ({ ticker: h.ticker, marketValue: h.valueUSD }));
    const totalMarketValue = allTickers.reduce((sum, t) => sum + t.marketValue, 0);
    const marketValueByTicker = allTickers.sort((a, b) => b.marketValue - a.marketValue).slice(0, 10).map(t => ({ ...t, percent: t.marketValue / totalMarketValue }));
    const map = {};
    holdings.forEach(h => {
      if (h.valueUSD == null) return;
      if (!map[h.tradingCurrency]) map[h.tradingCurrency] = 0;
      map[h.tradingCurrency] += h.valueUSD;
    });
    const marketValueByTradingCurrency = Object.entries(map).map(([tradingCurrency, marketValue]) => ({ tradingCurrency, marketValue, percent: marketValue / totalMarketValue }));

    return { holdings, aggregates: { aggMap, missingPLCurrencies: [...missingPLCurrencies] }, marketValueByTicker, marketValueByTradingCurrency };
  }, [transactions, prices, fxs, basis, valuationDate]);
}

export function useCumulativePL(transactions, prices, fxs, basis, startDate, endDate) {
  return useMemo(() => {
    if (!transactions?.length || !prices || !fxs || !startDate || !endDate) return {};
    if (basis === 'Local')
      basis = 'USD'
    const translatedTransactions = transactions.map(tx => {
      const fxRate = getFxRate(fxs, tx.currencyPrimary, tx.tradeDate, basis);
      const netCashTranslated = fxRate == null ? null : parseFloat(tx.netCash) * fxRate;
      const fxRateBasis = getFxRate(fxs, tx.currencyPrimary, tx.tradeDate, basis);
      const netCashBasis = fxRateBasis == null ? null : parseFloat(tx.netCash) * fxRateBasis;
      return { ...tx, netCashTranslated, fxRate, netCashBasis, fxRateBasis };
    });

    const sortedTransactions = [...translatedTransactions].sort((a, b) => parseInt(a.tradeDate) - parseInt(b.tradeDate));
    const stockTx = sortedTransactions.filter(tx => tx.assetClass === "STK");

    const dates = [];
    let d = new Date(
      Number(startDate.slice(0, 4)),
      Number(startDate.slice(4, 6)) - 1,
      Number(startDate.slice(6, 8))
    );
    const end = new Date(
      Number(endDate.slice(0, 4)),
      Number(endDate.slice(4, 6)) - 1,
      Number(endDate.slice(6, 8))
    );
    while (d <= end) {
      const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
      dates.push(dateStr);
      d.setDate(d.getDate() + 1);
    }
    const cumulativePLByDate = {};
    const aggRealisedPLBasis = {};

    for (const date of dates) {
      const txUpToDate = stockTx.filter(tx => tx.tradeDate <= date);
      const holdingsMap = {};
      // Build holdings snapshot and calculate realised P/L manually
      txUpToDate.forEach(tx => {
        const key = `${tx.ticker}|${tx.listingExchange}`;
        const quantity = parseFloat(tx.quantity);
        const netCash = parseFloat(tx.netCashTranslated);
        const netCashBasis = parseFloat(tx.netCashBasis);

        if (!holdingsMap[key]) holdingsMap[key] = {
          ticker: tx.ticker,
          description: tx.description,
          exchange: tx.listingExchange,
          tradingCurrency: tx.currencyPrimary,
          totalQuantity: 0,
          costBasis: 0,
          realisedPL: 0,
          costBasisBasis: 0,
          realisedPLBasis: 0
        };
        const h = holdingsMap[key];
        const prevQty = h.totalQuantity;
        h.totalQuantity += quantity;

        if ((prevQty > 0 && quantity < 0) || (prevQty < 0 && quantity > 0)) {
          const avgCost = prevQty !== 0 ? h.costBasis / prevQty : 0;
          h.realisedPL += netCash - avgCost * quantity;
          h.costBasis += avgCost * quantity;

          const avgCostBasis = prevQty !== 0 ? h.costBasisBasis / prevQty : 0;
          h.realisedPLBasis += netCashBasis - avgCostBasis * quantity;
          h.costBasisBasis += avgCostBasis * quantity;
        } else {
          h.costBasis += netCash;
          h.costBasisBasis += netCashBasis;
        }
        aggRealisedPLBasis[key] = h.realisedPLBasis;
      });

      let totalPLBasis = 0;
      Object.values(holdingsMap).forEach(h => {
        const priceLocal = getPrice(prices, h.ticker, date);
        const fxPriceBasis = getFxRate(fxs, h.tradingCurrency, date, basis);
        const priceBasis = priceLocal != null && fxPriceBasis != null ? parseFloat(priceLocal) * parseFloat(fxPriceBasis) : 0;
        const valueBasis = priceBasis * h.totalQuantity;

        const unrealisedPLBasis = valueBasis + h.costBasisBasis;
        const realisedPLBasis = aggRealisedPLBasis[`${h.ticker}|${h.exchange}`] || 0;
        totalPLBasis += unrealisedPLBasis + realisedPLBasis;
      });
      cumulativePLByDate[date] = totalPLBasis;
    }
    return cumulativePLByDate;
  }, [transactions, prices, fxs, basis, startDate, endDate]);
}