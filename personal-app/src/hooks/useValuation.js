import { useMemo } from "react";

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

export function useValuation(transactions, prices, fxs, setFxs, setLoadingFxs, basis, endDate = yesterdayStr) {
  return useMemo(() => {
    if (!transactions?.length || !prices || !fxs) return EMPTY_RESULT;
    const translatedTransactions = transactions
      .filter(tx => tx.tradeDate <= endDate)
      .map(tx => {
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
      const priceLocal = getPrice(prices, h.ticker, endDate);
      const fxPrice = getFxRate(fxs, h.tradingCurrency, endDate, basis);
      const price = priceLocal != null && fxPrice != null ? priceLocal * fxPrice : null;
      const value = price != null ? price * h.totalQuantity : null;
      const avgCost = h.totalQuantity !== 0 ? h.costBasis / h.totalQuantity : null;
      const unrealisedPL = value != null ? value + h.costBasis : null;

      const fxPriceUSD = getFxRate(fxs, h.tradingCurrency, endDate, "USD");
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
  }, [transactions, prices, fxs, basis, endDate]);
}


export function usePL(transactions, prices, setPrices, setLoadingPrices, fxs, basis, startDate, endDate) {
  return useMemo(() => {
    if (!transactions?.length || !prices || !fxs || !startDate || !endDate) {
      return { cumulativePLByDate: {} };
    }
    if (basis === "Local") basis = "USD";
    const stockTx = transactions
      .filter(tx => tx.tradeDate <= endDate)
      .map(tx => {
        const fx = getFxRate(fxs, tx.currencyPrimary, tx.tradeDate, basis);
        return { ...tx, netCashBasis: fx == null ? null : parseFloat(tx.netCash) * fx };
      })
      .filter(tx => tx.assetClass === "STK")
      .sort((a, b) => parseInt(a.tradeDate) - parseInt(b.tradeDate));

    /* build date range */
    const dates = [];
    let d = new Date(
      Number(startDate.slice(0, 4)),
      Number(startDate.slice(4, 6)) - 1,
      Number(startDate.slice(6, 8))
    );
    const endD = new Date(
      Number(endDate.slice(0, 4)),
      Number(endDate.slice(4, 6)) - 1,
      Number(endDate.slice(6, 8))
    );

    while (d <= endD) {
      dates.push(
        `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`
      );
      d.setDate(d.getDate() + 1);
    }

    const holdingsMap = {};
    const cumulativePLByDate = {};
    let txIndex = 0;

    for (const date of dates) {
      while (txIndex < stockTx.length && stockTx[txIndex].tradeDate <= date) {
        const tx = stockTx[txIndex];
        const key = `${tx.ticker}|${tx.listingExchange}`;
        const q = parseFloat(tx.quantity);
        const net = parseFloat(tx.netCashBasis);

        if (!holdingsMap[key]) {
          holdingsMap[key] = {
            ticker: tx.ticker,
            exchange: tx.listingExchange,
            tradingCurrency: tx.currencyPrimary,
            totalQuantity: 0,
            costBasisBasis: 0,
            realisedPLBasis: 0
          };
        }
        const h = holdingsMap[key];
        const prevQty = h.totalQuantity;
        h.totalQuantity += q;

        if ((prevQty > 0 && q < 0) || (prevQty < 0 && q > 0)) {
          const avg = h.costBasisBasis / prevQty || 0;
          const realised = net - avg * q;
          h.realisedPLBasis += realised;
          h.costBasisBasis += avg * q;
        } else {
          h.costBasisBasis += net;
        }
        txIndex++;
      }

      let cumulativePL = 0;
      for (const h of Object.values(holdingsMap)) {
        if (h.totalQuantity === 0) continue;
        const price = getPrice(prices, h.ticker, date);
        const fx = getFxRate(fxs, h.tradingCurrency, date, basis);
        if (price == null || fx == null) continue;

        const val = price * fx * h.totalQuantity;
        cumulativePL += val + h.costBasisBasis + h.realisedPLBasis;
      }
      cumulativePLByDate[date] = cumulativePL;
    }
    return { cumulativePLByDate };
  }, [transactions, prices, fxs, basis, startDate, endDate]);
}
