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

const EMPTY_RESULT = {
  holdings: [],
  aggregates: { aggMap: {}, missingPLCurrencies: null },
  marketValueByTicker: [],
  marketValueByTradingCurrency: [],
  cumulativeHoldingsByTickerByDate: {},
  cumulativeCostBasisByTickerByDate: {},
  cumulativeMarketValueByTickerByDate: {},
  cumulativeRealisedPLByTickerByDate: {},
  cumulativeUnrealisedPLByTickerByDate: {},
  dividendByTickerByDate: {},
  transactionByTickerByDate: {},
};

function buildDateList(startDate, endDate) {
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

  return dates;
}

export function useValuation(
  transactions,
  prices,
  priceTickerMap,
  fxs,
  setFxs,
  setLoadingFxs,
  basis,
  endDate,
  dividends = [],
  appliedCorporateActions = []
) {
  return useMemo(() => {
    if (!transactions?.length || !prices || !fxs || !endDate) return EMPTY_RESULT;

    const firstTxDate = transactions.reduce(
      (min, tx) => (min == null || tx.tradeDate < min ? tx.tradeDate : min),
      null
    );
    if (!firstTxDate) return EMPTY_RESULT;

    const year = endDate.slice(0, 4);
    const yearStartMinusOne = `${String(Number(year) - 1)}1231`;
    const dates = buildDateList(firstTxDate, endDate);

    const txByDate = new Map();
    transactions
      .filter(tx => tx.tradeDate <= endDate)
      .forEach(tx => {
        if (!txByDate.has(tx.tradeDate)) txByDate.set(tx.tradeDate, []);
        txByDate.get(tx.tradeDate).push(tx);
      });

    const divByDate = new Map();
    (dividends || []).forEach(div => {
      if (div.exDate > endDate) return;
      if (!divByDate.has(div.exDate)) divByDate.set(div.exDate, []);
      divByDate.get(div.exDate).push(div);
    });

    const splitsByDate = new Map();
    const spinOffsByDate = new Map();
    (appliedCorporateActions || []).forEach(action => {
      const type = action?.type;
      const ratioNum = parseFloat(action?.ratio);
      const actionDate = action?.actionDate;
      const ticker = action?.ticker;
      if (!ratioNum || isNaN(ratioNum) || !actionDate || !ticker) return;
      if (type === "STOCK_SPLIT" || type === "REVERSE_SPLIT") {
        if (!splitsByDate.has(actionDate)) splitsByDate.set(actionDate, []);
        splitsByDate.get(actionDate).push({ ticker, ratio: ratioNum });
        return;
      }
      if (type === "SPIN_OFF") {
        const childTicker = action?.child_ticker;
        if (!childTicker) return;
        if (!spinOffsByDate.has(actionDate)) spinOffsByDate.set(actionDate, []);
        spinOffsByDate.get(actionDate).push({ ticker, childTicker, ratio: ratioNum });
      }
    });

    const holdingsMap = {};

    const cumulativeHoldingsByDate = {};
    const cumulativeCostBasisByDate = {};
    const cumulativeMarketValueByDate = {};
    const cumulativeRealisedPLByDate = {};
    const cumulativeUnrealisedPLByDate = {};
    const dividendByDate = {};
    const transactionByDate = {};

    const cumulativeHoldingsByTickerByDate = {};
    const cumulativeCostBasisByTickerByDate = {};
    const cumulativeMarketValueByTickerByDate = {};
    const cumulativeRealisedPLByTickerByDate = {};
    const cumulativeUnrealisedPLByTickerByDate = {};
    const dividendByTickerByDate = {};
    const transactionByTickerByDate = {};

    for (const date of dates) {
      const splitsToday = splitsByDate.get(date);
      if (splitsToday?.length) {
        splitsToday.forEach(({ ticker, ratio }) => {
          Object.values(holdingsMap).forEach(h => {
            if (h.ticker !== ticker) return;
            if (h.totalQuantity === 0) return;
            h.totalQuantity *= ratio;
          });
        });
      }

      const spinOffsToday = spinOffsByDate.get(date);
      if (spinOffsToday?.length) {
        spinOffsToday.forEach(({ ticker, childTicker, ratio }) => {
          Object.values(holdingsMap).forEach(h => {
            if (h.ticker !== ticker) return;
            if (h.totalQuantity === 0) return;

            const childQty = h.totalQuantity * ratio;
            if (childQty === 0) return;

            const childMeta = priceTickerMap?.[childTicker] ?? {};
            const childCurrency = childMeta.tradingCurrency ?? "";
            const childExchange = childMeta.exchange ?? "";
            const childDescription = childMeta.description ?? "";

            const parentPriceLocal = getPrice(prices, h.ticker, date);
            const childPriceLocal = getPrice(prices, childTicker, date);
            const fxParent = getFxRate(fxs, h.tradingCurrency, date, basis);
            const fxChild = getFxRate(fxs, childCurrency, date, basis);
            const fxParentUSD = getFxRate(fxs, h.tradingCurrency, date, "USD");
            const fxChildUSD = getFxRate(fxs, childCurrency, date, "USD");

            let allocParent = 1;
            let allocChild = 0;
            if (parentPriceLocal != null && childPriceLocal != null) {
              let parentValue = null;
              let childValue = null;
              if (basis === "Local" && h.tradingCurrency !== childCurrency) {
                if (fxParentUSD != null && fxChildUSD != null) {
                  parentValue = parentPriceLocal * fxParentUSD * h.totalQuantity;
                  childValue = childPriceLocal * fxChildUSD * childQty;
                }
              } else if (fxParent != null && fxChild != null) {
                parentValue = parentPriceLocal * fxParent * h.totalQuantity;
                childValue = childPriceLocal * fxChild * childQty;
              }

              if (parentValue != null && childValue != null) {
                const totalValue = parentValue + childValue;
                if (totalValue > 0) {
                  allocParent = parentValue / totalValue;
                  allocChild = childValue / totalValue;
                }
              }
            }

            if (allocParent === 1 && allocChild === 0) {
              const totalShares = h.totalQuantity + childQty;
              if (totalShares > 0) {
                allocParent = h.totalQuantity / totalShares;
              }
            }

            const childKey = `${childTicker}|${childExchange || ""}`;
            if (!holdingsMap[childKey]) {
              holdingsMap[childKey] = {
                ticker: childTicker,
                description: childDescription,
                exchange: childExchange,
                tradingCurrency: childCurrency,
                totalQuantity: 0,
                costBasis: 0,
                realisedPL: 0,
                costBasisUSD: 0,
                realisedPLUSD: 0
              };
            }

            const childHolding = holdingsMap[childKey];
            childHolding.totalQuantity += childQty;

            const useUsdAllocation =
              basis === "Local" &&
              h.tradingCurrency !== childCurrency &&
              fxParentUSD != null &&
              fxChildUSD != null;

            const parentCostBasisUSD = h.costBasisUSD * allocParent;
            const childCostBasisUSD = h.costBasisUSD - parentCostBasisUSD;
            h.costBasisUSD = parentCostBasisUSD;
            childHolding.costBasisUSD += childCostBasisUSD;

            if (useUsdAllocation) {
              h.costBasis = fxParentUSD ? parentCostBasisUSD / fxParentUSD : h.costBasis * allocParent;
              childHolding.costBasis += fxChildUSD ? childCostBasisUSD / fxChildUSD : h.costBasis - h.costBasis * allocParent;
            } else {
              const parentCostBasis = h.costBasis * allocParent;
              const childCostBasis = h.costBasis - parentCostBasis;
              h.costBasis = parentCostBasis;
              childHolding.costBasis += childCostBasis;
            }
          });
        });
      }

      const txsToday = txByDate.get(date) || [];
      const transactionSnapshot = {};
      txsToday
        .filter(tx => tx.assetClass === "STK")
        .forEach(tx => {
          const fxRate = getFxRate(fxs, tx.currencyPrimary, tx.tradeDate, basis);
          const fxRateUSD = getFxRate(fxs, tx.currencyPrimary, tx.tradeDate, "USD");
          const netCashTranslated = fxRate == null ? null : parseFloat(tx.netCash) * fxRate;
          const netCashUSD = fxRateUSD == null ? null : parseFloat(tx.netCash) * fxRateUSD;
          const netCashBasis = netCashTranslated == null ? 0 : netCashTranslated;

          const key = `${tx.ticker}|${tx.listingExchange}`;
          const quantity = parseFloat(tx.quantity);
          const netCash = parseFloat(netCashTranslated);
          const netCashUSDNum = parseFloat(netCashUSD);

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
            item.realisedPLUSD += netCashUSDNum - avgCostUSD * quantity;
            item.costBasisUSD += avgCostUSD * quantity;
          } else {
            item.costBasis += netCash;
            item.costBasisUSD += netCashUSDNum;
          }

          transactionSnapshot[tx.ticker] = (transactionSnapshot[tx.ticker] ?? 0) + netCashBasis;
        });

      const divsToday = divByDate.get(date) || [];
      const dividendSnapshot = {};
      divsToday.forEach(div => {
        let netAmount = Number(div.netAmount || 0);
        if (Math.abs(netAmount) < 1e-10 || netAmount <= 0) return;
        const fx = getFxRate(fxs, div.currencyPrimary, div.exDate, basis);
        const netCashBasis = fx == null ? 0 : netAmount * fx;

        const key = `${div.ticker}|${div.listingExchange}`;
        if (!holdingsMap[key]) {
          holdingsMap[key] = {
            ticker: div.ticker,
            description: div.description,
            exchange: div.listingExchange,
            tradingCurrency: div.currencyPrimary,
            totalQuantity: 0,
            costBasis: 0,
            realisedPL: 0,
            costBasisUSD: 0,
            realisedPLUSD: 0
          };
        }

        const h = holdingsMap[key];
        h.realisedPL += netCashBasis;
        dividendSnapshot[div.ticker] = (dividendSnapshot[div.ticker] ?? 0) + netCashBasis;

        const fxUSD = getFxRate(fxs, div.currencyPrimary, div.exDate, "USD");
        const netCashUSD = fxUSD == null ? 0 : netAmount * fxUSD;
        h.realisedPLUSD += netCashUSD;
      });

      const holdingsSnapshot = {};
      const costBasisSnapshot = {};
      const realisedSnapshot = {};
      Object.values(holdingsMap).forEach(h => {
        holdingsSnapshot[h.ticker] = (holdingsSnapshot[h.ticker] ?? 0) + h.totalQuantity;
        costBasisSnapshot[h.ticker] = (costBasisSnapshot[h.ticker] ?? 0) + h.costBasis;
        realisedSnapshot[h.ticker] = (realisedSnapshot[h.ticker] ?? 0) + h.realisedPL;
      });

      cumulativeHoldingsByDate[date] = holdingsSnapshot;
      cumulativeCostBasisByDate[date] = costBasisSnapshot;
      cumulativeRealisedPLByDate[date] = realisedSnapshot;
      dividendByDate[date] = dividendSnapshot;
      transactionByDate[date] = transactionSnapshot;

      Object.entries(holdingsSnapshot).forEach(([ticker, value]) => {
        if (!cumulativeHoldingsByTickerByDate[ticker]) cumulativeHoldingsByTickerByDate[ticker] = {};
        cumulativeHoldingsByTickerByDate[ticker][date] = value;
      });
      Object.entries(costBasisSnapshot).forEach(([ticker, value]) => {
        if (!cumulativeCostBasisByTickerByDate[ticker]) cumulativeCostBasisByTickerByDate[ticker] = {};
        cumulativeCostBasisByTickerByDate[ticker][date] = value;
      });
      Object.entries(realisedSnapshot).forEach(([ticker, value]) => {
        if (!cumulativeRealisedPLByTickerByDate[ticker]) cumulativeRealisedPLByTickerByDate[ticker] = {};
        cumulativeRealisedPLByTickerByDate[ticker][date] = value;
      });
      Object.entries(dividendSnapshot).forEach(([ticker, value]) => {
        if (!dividendByTickerByDate[ticker]) dividendByTickerByDate[ticker] = {};
        dividendByTickerByDate[ticker][date] = value;
      });
      Object.entries(transactionSnapshot).forEach(([ticker, value]) => {
        if (!transactionByTickerByDate[ticker]) transactionByTickerByDate[ticker] = {};
        transactionByTickerByDate[ticker][date] = value;
      });

      if (date >= yearStartMinusOne) {
        const marketValueSnapshot = {};
        const unrealisedSnapshot = {};
        Object.values(holdingsMap).forEach(h => {
          const priceLocal = getPrice(prices, h.ticker, date);
          const fxPrice = getFxRate(fxs, h.tradingCurrency, date, basis);
          if (priceLocal == null || fxPrice == null) return;
          const price = priceLocal * fxPrice;
          const value = price * h.totalQuantity;
          marketValueSnapshot[h.ticker] = (marketValueSnapshot[h.ticker] ?? 0) + value;
          unrealisedSnapshot[h.ticker] = (unrealisedSnapshot[h.ticker] ?? 0) + value + h.costBasis;
        });
        cumulativeMarketValueByDate[date] = marketValueSnapshot;
        cumulativeUnrealisedPLByDate[date] = unrealisedSnapshot;

        Object.entries(marketValueSnapshot).forEach(([ticker, value]) => {
          if (!cumulativeMarketValueByTickerByDate[ticker]) cumulativeMarketValueByTickerByDate[ticker] = {};
          cumulativeMarketValueByTickerByDate[ticker][date] = value;
        });
        Object.entries(unrealisedSnapshot).forEach(([ticker, value]) => {
          if (!cumulativeUnrealisedPLByTickerByDate[ticker]) cumulativeUnrealisedPLByTickerByDate[ticker] = {};
          cumulativeUnrealisedPLByTickerByDate[ticker][date] = value;
        });
      }
    }

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
        ...h,
        price,
        value,
        avgCost,
        unrealisedPL,
        priceUSD,
        valueUSD,
        avgCostUSD,
        unrealisedPLUSD,
        pLUSD: unrealisedPLUSD + h.realisedPLUSD
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

    return {
      holdings,
      aggregates: { aggMap, missingPLCurrencies: [...missingPLCurrencies] },
      marketValueByTicker,
      marketValueByTradingCurrency,
      cumulativeHoldingsByTickerByDate,
      cumulativeCostBasisByTickerByDate,
      cumulativeMarketValueByTickerByDate,
      cumulativeRealisedPLByTickerByDate,
      cumulativeUnrealisedPLByTickerByDate,
      dividendByTickerByDate,
      transactionByTickerByDate,
    };
  }, [transactions, prices, priceTickerMap, fxs, basis, endDate, dividends, appliedCorporateActions]);
}

export function usePL(transactions, prices, priceTickerMap, setPrices, setLoadingPrices, fxs, basis, startDate, endDate, dividends = [], appliedCorporateActions = []) {
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

    const startDateObj = new Date(
      Number(startDate.slice(0, 4)),
      Number(startDate.slice(4, 6)) - 1,
      Number(startDate.slice(6, 8))
    );
    startDateObj.setDate(startDateObj.getDate() - 1);
    const startDateMinusOne = `${startDateObj.getFullYear()}${String(
      startDateObj.getMonth() + 1
    ).padStart(2, "0")}${String(startDateObj.getDate()).padStart(2, "0")}`;

    const dates = buildDateList(startDateMinusOne, endDate);

    const splitsByDate = new Map();
    const spinOffsByDate = new Map();
    (appliedCorporateActions || []).forEach(action => {
      const type = action?.type;
      const ratioNum = parseFloat(action?.ratio);
      const actionDate = action?.actionDate;
      const ticker = action?.ticker;
      if (!ratioNum || isNaN(ratioNum) || !actionDate || !ticker) return;
      if (type === "STOCK_SPLIT" || type === "REVERSE_SPLIT") {
        if (!splitsByDate.has(actionDate)) splitsByDate.set(actionDate, []);
        splitsByDate.get(actionDate).push({ ticker, ratio: ratioNum });
        return;
      }
      if (type === "SPIN_OFF") {
        const childTicker = action?.child_ticker;
        if (!childTicker) return;
        if (!spinOffsByDate.has(actionDate)) spinOffsByDate.set(actionDate, []);
        spinOffsByDate.get(actionDate).push({ ticker, childTicker, ratio: ratioNum });
      }
    });

    const holdingsMap = {};
    const cumulativePLByDate = {};
    let txIndex = 0;

    for (const date of dates) {
      const splitsToday = splitsByDate.get(date);
      if (splitsToday?.length) {
        splitsToday.forEach(({ ticker, ratio }) => {
          Object.values(holdingsMap).forEach(h => {
            if (h.ticker !== ticker) return;
            if (h.totalQuantity === 0) return;
            h.totalQuantity *= ratio;
          });
        });
      }

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

      const spinOffsToday = spinOffsByDate.get(date);
      if (spinOffsToday?.length) {
        spinOffsToday.forEach(({ ticker, childTicker, ratio }) => {
          Object.values(holdingsMap).forEach(h => {
            if (h.ticker !== ticker) return;
            if (h.totalQuantity === 0) return;

            const childQty = h.totalQuantity * ratio;
            if (childQty === 0) return;

            const childMeta = priceTickerMap?.[childTicker] ?? {};
            const childCurrency = childMeta.tradingCurrency ?? "";
            const childExchange = childMeta.exchange ?? "";

            const parentPriceLocal = getPrice(prices, h.ticker, date);
            const childPriceLocal = getPrice(prices, childTicker, date);
            const fxParent = getFxRate(fxs, h.tradingCurrency, date, basis);
            const fxChild = getFxRate(fxs, childCurrency, date, basis);

            let allocParent = 1;
            if (parentPriceLocal != null && childPriceLocal != null && fxParent != null && fxChild != null) {
              const parentValue = parentPriceLocal * fxParent * h.totalQuantity;
              const childValue = childPriceLocal * fxChild * childQty;
              const totalValue = parentValue + childValue;
              if (totalValue > 0) {
                allocParent = parentValue / totalValue;
              }
            } else {
              const totalShares = h.totalQuantity + childQty;
              if (totalShares > 0) {
                allocParent = h.totalQuantity / totalShares;
              }
            }

            const childKey = `${childTicker}|${childExchange || ""}`;
            if (!holdingsMap[childKey]) {
              holdingsMap[childKey] = {
                ticker: childTicker,
                exchange: childExchange,
                tradingCurrency: childCurrency,
                totalQuantity: 0,
                costBasisBasis: 0,
                realisedPLBasis: 0
              };
            }
            const childHolding = holdingsMap[childKey];
            childHolding.totalQuantity += childQty;

            const parentCostBasis = h.costBasisBasis * allocParent;
            const childCostBasis = h.costBasisBasis - parentCostBasis;
            h.costBasisBasis = parentCostBasis;
            childHolding.costBasisBasis += childCostBasis;
          });
        });
      }

      for (const div of dividends) {
        if (div.exDate === date && parseFloat(div.netAmount) > 0) {
          const fx = getFxRate(fxs, div.currencyPrimary, date, basis);
          if (fx != null) {
            const divAmount = parseFloat(div.netAmount) * fx;
            const key = `${div.ticker}|${div.listingExchange}`;
            if (!holdingsMap[key]) {
              holdingsMap[key] = {
                ticker: div.ticker,
                exchange: div.listingExchange,
                tradingCurrency: div.currencyPrimary,
                totalQuantity: 0,
                costBasisBasis: 0,
                realisedPLBasis: 0
              };
            }
            holdingsMap[key].realisedPLBasis += divAmount;
          }
        }
      }

      let cumulativePL = 0;
      for (const h of Object.values(holdingsMap)) {
        if (h.totalQuantity === 0 && h.costBasisBasis === 0) continue;
        const price = getPrice(prices, h.ticker, date);
        const fx = getFxRate(fxs, h.tradingCurrency, date, basis);
        let val = 0;
        if (h.totalQuantity !== 0 && price != null && fx != null) {
          val = price * fx * h.totalQuantity;
        }
        cumulativePL += val + h.costBasisBasis + h.realisedPLBasis;
      }
      cumulativePLByDate[date] = cumulativePL;
    }

    return { cumulativePLByDate };
  }, [transactions, prices, priceTickerMap, fxs, basis, startDate, endDate, dividends, appliedCorporateActions]);
}
