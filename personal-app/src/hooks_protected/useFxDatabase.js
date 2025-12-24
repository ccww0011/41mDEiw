'use client';

import {logout} from "@/hooks_protected/useAuth";

async function fxApi(method, data, setFxs) {
  try {
    let url = process.env.NEXT_PUBLIC_AUTHENTICATED_URL + "/api/forex";
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
        setFxs(prevFxs => {
          const newFxs = items.data;
          if (!prevFxs || typeof prevFxs !== 'object') {
            return newFxs;
          }
          const merged = { ...prevFxs };
          for (const fx in newFxs) {
            if (merged[fx]) {
              merged[fx] = {
                ...merged[fx],
                ...newFxs[fx],
              };
            } else {
              merged[fx] = newFxs[fx];
            }
          }
          return merged;
        });
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

// item = {currency, startDate, endDate}
export async function getFxs(items, fxs, setFxs, setLoadingFxs) {
  if (items?.length === 0 || fxs == null) return
  const d0 = new Date();
  d0.setDate(d0.getDate() - 1);
  const yesterdayStr = d0.getFullYear().toString() + String(d0.getMonth() + 1).padStart(2, '0') + String(d0.getDate()).padStart(2, '0');
  const requestMap = new Map();
  for (const item of items) {
    const currency = item.currency;
    if (currency === "USD") continue;
    const startDateStr = item.startDate;
    const endDateStr = item.endDate < yesterdayStr ? item.endDate : yesterdayStr;
    const existingDates = new Set(Object.keys(fxs[currency] ?? {}));
    let d = new Date(Number(startDateStr.slice(0, 4)), Number(startDateStr.slice(4, 6)) - 1, Number(startDateStr.slice(6, 8)));
    const endD = new Date(Number(endDateStr.slice(0, 4)), Number(endDateStr.slice(4, 6)) - 1, Number(endDateStr.slice(6, 8)));
    while (d <= endD) {
      const dateStr = d.getFullYear().toString() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
      d.setDate(d.getDate() + 1);
      if (!existingDates.has(dateStr)) {
        if (requestMap.has(currency)) {
          requestMap.get(currency).add(dateStr.slice(0, 4));
        } else {
          requestMap.set(currency, new Set([dateStr.slice(0, 4)]));
        }
        d = new Date(Number(dateStr.slice(0, 4)) + 1, 0, 1);
      }
    }
  }
  if (requestMap.size === 0) return;
  const requests = [];

  for (const [currency, startYears] of requestMap) {
    startYears.forEach( startYear => {
      if (startYear > yesterdayStr) return
      const endDate =  startYear + "1231" > yesterdayStr ? yesterdayStr : startYear + "1231"
      requests.push({currency, startDate: startYear + "0101", endDate})
    })
  }
  setLoadingFxs(true);
  try {
    await fxApi('GET', { items: JSON.stringify(requests) }, setFxs);
  } finally {
    setLoadingFxs(false);
  }
}


export async function putFxs(currency, startDate, endDate, fxs, setFxs) {
  const data = [];
  return await fxApi('PUT', data, setFxs);
}