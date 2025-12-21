'use client';

import {logout} from "@/hooks/useAuth";

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
export async function getMissingFxs(items, fxs, setFxs, setLoadingFxs) {
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


export async function getFxs(currency, startDate, endDate, fxs, setFxs) {
  if (currency === 'USD')
    return;
  // Parse date strings -> UTC dates (IMPORTANT)
  const toUTCDate = (str) =>
    new Date(Date.UTC(
      +str.slice(0, 4),
      +str.slice(4, 6) - 1,
      +str.slice(6, 8)
    ));

  // Format UTC date -> YYYYMMDD
  const formatUTCDate = (date) => {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  };

  // Add 1 day in UTC safely
  const addUTC1Day = (date) =>
    new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() + 1
    ));

  const start = toUTCDate(startDate);

// Clamp end date to yesterday
  const today = new Date(Date.now() - 24 * 60 * 60 * 1000); // yesterday
  const endCandidate = toUTCDate(endDate);
  const end = endCandidate > today ? today : endCandidate;

  // ---- FIND MISSING RANGES ----
  let ranges = [];
  let inRange = false;

  let d = start;
  let prev = null;

  while (d <= end) {
    const dayStr = formatUTCDate(d);

    const exists =
      fxs[currency] &&
      Object.prototype.hasOwnProperty.call(fxs[currency], dayStr);

    if (!exists) {
      if (!inRange) {
        // starting a new missing range
        ranges.push(dayStr);
        inRange = true;
      }
    } else {
      if (inRange) {
        // closing missing range
        ranges.push(prev);
        inRange = false;
      }
    }

    prev = dayStr;
    d = addUTC1Day(d);  // safe UTC increment
  }

  // if open missing range extends to the end
  if (inRange) {
    ranges.push(prev);
  }

  // ---- BUILD ITEMS FOR API ----
  const items = [];
  for (let i = 0; i < ranges.length; i += 2) {
    items.push({
      currency,
      startDate: ranges[i],
      endDate: ranges[i + 1],
    });
  }
  if (items.length === 0) {
    return;
  }

  const data = { items: JSON.stringify(items) };
  return await fxApi('GET', data, setFxs);
}

export async function putFxs(currency, startDate, endDate, fxs, setFxs) {
  const data = [];
  return await fxApi('PUT', data, setFxs);
}