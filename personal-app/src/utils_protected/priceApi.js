'use client';

import {logout} from "@/utils_protected/authApi";
import { getCorporateActions } from "@/utils_protected/corporateActionApi";

async function priceApi(method, data, setPrices, setPriceTickerMap) {
  try {
    let url = process.env.NEXT_PUBLIC_AUTHENTICATED_URL + "/api/price";
    let content = {
      method: method,
      headers: { 'content-type': 'application/json' },
      credentials: "include",
    };
    if (method !== "GET") {
      content.body = JSON.stringify(data);
    } else {
      const queryString = new URLSearchParams(data).toString();
      url += "?" + queryString;
    }
    const response = await fetch(url, content);
    const items = await response.json();
    if (response.ok) {
      const contentType = response.headers.get('Content-Type');
      if (contentType && contentType.includes('text/html')) {
        return {message: "Unauthorised.", status: 'Unauthorised'};
      } else {
        // Merge incoming data with existing prices
        setPrices(prevPrices => {
          const newPrices = items.data;

          // Defensive: if prevPrices is null or not object, start fresh
          if (!prevPrices || typeof prevPrices !== 'object') {
            return newPrices;
          }

          // Merge tickers
          const merged = { ...prevPrices };

          for (const ticker in newPrices) {
            if (merged[ticker]) {
              // Merge date-price pairs for this ticker
              merged[ticker] = {
                ...merged[ticker],
                ...newPrices[ticker],
              };
            } else {
              // New ticker, add it directly
              merged[ticker] = newPrices[ticker];
            }
          }

          return merged;
        });

        if (items.meta && setPriceTickerMap) {
          setPriceTickerMap(prevMap => {
            const merged = { ...(prevMap || {}) };
            Object.entries(items.meta).forEach(([ticker, meta]) => {
              merged[ticker] = {
                description: (meta?.description ?? merged[ticker]?.description ?? "").toUpperCase(),
                exchange: (meta?.exchange ?? merged[ticker]?.exchange ?? "").toUpperCase(),
                tradingCurrency: (meta?.tradingCurrency ?? merged[ticker]?.tradingCurrency ?? "").toUpperCase(),
              };
            });
            return merged;
          });
        }

        return {message: items.message, status: 'Success'};
      }
    } else if (response.status === 401 || response.status === 403) {
      logout();
      return {message: "Unauthorised.", status: 'Unauthorised'};
    } else {
      return {message: items.message, status: 'Error'};
    }
  } catch (error) {
    return {message: error.message, status: 'Error'};
  }
}

// item = {ticker, startDate, endDate}
export async function getPrices(
  items,
  prices,
  setPrices,
  setLoadingPrices,
  setPriceTickerMap,
  corporateActions,
  setCorporateActions,
  setLoadingCorporateActions
) {
  const d0 = new Date();
  d0.setDate(d0.getDate() - 1);
  const yesterdayStr = d0.getFullYear().toString() + String(d0.getMonth() + 1).padStart(2, '0') + String(d0.getDate()).padStart(2, '0');
  const requestMap = new Map();
  for (const item of items) {
    const ticker = item.ticker;
    const startDateStr = item.startDate;
    const endDateStr = item.endDate < yesterdayStr ? item.endDate : yesterdayStr;
    const existingDates = new Set(Object.keys(prices[ticker] ?? {}));
    let d = new Date(Number(startDateStr.slice(0, 4)), Number(startDateStr.slice(4, 6)) - 1, Number(startDateStr.slice(6, 8)));
    const endD = new Date(Number(endDateStr.slice(0, 4)), Number(endDateStr.slice(4, 6)) - 1, Number(endDateStr.slice(6, 8)));
    while (d <= endD) {
      const dateStr = d.getFullYear().toString() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
      d.setDate(d.getDate() + 1);
      if (!existingDates.has(dateStr)) {
        if (requestMap.has(ticker)) {
          requestMap.get(ticker).add(dateStr.slice(0, 4));
        } else {
          requestMap.set(ticker, new Set([dateStr.slice(0, 4)]));
        }
        d = new Date(Number(dateStr.slice(0, 4)) + 1, 0, 1);
      }
    }
  }
  if (requestMap.size === 0) return;
  const requests = [];

  for (const [ticker, startYears] of requestMap) {
    startYears.forEach( startYear => {
      if (startYear > yesterdayStr) return
      const endDate =  startYear + "1231" > yesterdayStr ? yesterdayStr : startYear + "1231"
      requests.push({ticker, startDate: startYear + "0101", endDate})
    })
  }
  setLoadingPrices(true);
  try {
    await priceApi('POST', { items: JSON.stringify(requests) }, setPrices, setPriceTickerMap);
    if (corporateActions && setCorporateActions && setLoadingCorporateActions) {
      await getCorporateActions(requests, corporateActions, setCorporateActions, setLoadingCorporateActions);
    }
  } finally {
    setLoadingPrices(false);
  }
}


export async function putPrices(ticker, startDate, endDate, prices, setPrices) {
  const data = [];
  return await priceApi('PUT', data, setPrices, null);
}
