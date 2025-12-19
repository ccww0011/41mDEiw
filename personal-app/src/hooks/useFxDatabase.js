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

export async function getInitialFxs(currencies, dateStr, setFxs) {
  const filteredCurrencies = currencies.filter(currency => currency !== "USD");
  const year = dateStr.slice(0, 4).toString();
  const startDateStr = year + "0101";
  const endDateStr   = year + "1231";

  // function to split array into chunks of size n
  const chunkArray = (arr, size) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  };

  // all currencies in chunks of 25
  const currencyChunks = chunkArray(filteredCurrencies, 25);

  // call API for each chunk
  for (const chunk of currencyChunks) {
    const items = chunk.map((currency) => ({
      currency,
      startDate: startDateStr,
      endDate: endDateStr
    }));

    const data = { items: JSON.stringify(items) };
    await fxApi('GET', data, setFxs);
  }
}

export async function getMissingFxs(currencies, valuationDateStr, fxs, setFxs, setLoadingFxs) {
  const filteredCurrencies = currencies.filter(currency => currency !== "USD");

  const year = valuationDateStr.slice(0, 4);
  const startDateStr = year + "0101";
  let endDateStr   = year + "1231";
  const yesterdayStr = new Date(Date.now() - 86400000)
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '');

  for (const currency of [...filteredCurrencies]) {
    endDateStr = endDateStr < yesterdayStr ? endDateStr : yesterdayStr;

    let allDatesPresent = true;
    let d = new Date(
      Number(startDateStr.slice(0, 4)),
      Number(startDateStr.slice(4, 6)) - 1,
      Number(startDateStr.slice(6, 8))
    );
    const endDate = new Date(
      Number(endDateStr.slice(0, 4)),
      Number(endDateStr.slice(4, 6)) - 1,
      Number(endDateStr.slice(6, 8))
    );
    const existingDatesSet = new Set(Object.keys(fxs[currency] ?? {}));
    while (d <= endDate) {
      const dateStr =
        d.getFullYear().toString() +
        String(d.getMonth() + 1).padStart(2, '0') +
        String(d.getDate()).padStart(2, '0');
      if (!existingDatesSet.has(dateStr)) {
        allDatesPresent = false;
        break;
      }
      d.setDate(d.getDate() + 1);
    }

    if (!allDatesPresent) {
      const items = [{ currency, startDate: startDateStr, endDate: endDateStr }];
      const data = { items: JSON.stringify(items) };

      setLoadingFxs(true);
      try {
        await fxApi('GET', data, setFxs);
      } finally {
        setLoadingFxs(false);
      }
    }
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