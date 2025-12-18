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
        // Merge incoming data with existing fxs
        setFxs(prevFxs => {
          const newFxs = items.data;
          // Defensive: if prevCurrencies is null or not object, start fresh
          if (!prevFxs || typeof prevFxs !== 'object') {
            return newFxs;
          }
          // Merge fxs
          const merged = { ...prevFxs };
          for (const fx in newFxs) {
            if (merged[fx]) {
              // Merge date-fx pairs for this fx
              merged[fx] = {
                ...merged[fx],
                ...newFxs[fx],
              };
            } else {
              // New fx, add it directly
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

export async function getInitialFxs(currencies, date, setFxs) {
  const filteredCurrencies = currencies.filter(currency => currency !== "USD");
  // format date as YYYYMMDD
  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}${m}${d}`;
  };

  // get first and last day of this year
  const getStartOfYear = (year) => new Date(year, 0, 1);
  const getEndOfYear = (year) => new Date(year, 11, 31);

  const thisYear = date.getFullYear();
  const startDateStr = formatDate(getStartOfYear(thisYear));
  const endDateStr = formatDate(getEndOfYear(thisYear));

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

export async function getMissingFxs(currencies, valuationDateStr, fxs, setFxs) {
  const filteredCurrencies = currencies.filter(currency => currency !== "USD");

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}${m}${d}`;
  };

  const parseYYYYMMDD = (str) => new Date(str.slice(0, 4), parseInt(str.slice(4, 6)) - 1, str.slice(6, 8));

  const endOfYear = (year) => new Date(year, 11, 31);
  const startOfYear = (year) => new Date(year, 0, 1);

  const valuationDate = parseYYYYMMDD(valuationDateStr);

  for (const currency of [...filteredCurrencies]) {
    const year = valuationDate.getFullYear();
    const startDateStr = formatDate(startOfYear(year));
    const endDateCandidate = endOfYear(year) < yesterday ? endOfYear(year) : yesterday;
    const endDateStr = formatDate(endDateCandidate);

    // Check if all dates in range are already in fxs
    const existingDates = fxs[currency] ? Object.keys(fxs[currency]) : [];
    let allDatesPresent = true;
    let d = new Date(startOfYear(year));
    while (d <= endDateCandidate) {
      const dateStr = formatDate(d);
      if (!existingDates.includes(dateStr)) {
        allDatesPresent = false;
        break;
      }
      d.setDate(d.getDate() + 1);
    }

    if (allDatesPresent) continue; // skip this currency

    // Fetch missing FXs
    const items = [{ currency, startDate: startDateStr, endDate: endDateStr }];
    const data = { items: JSON.stringify(items) };
    await fxApi('GET', data, setFxs);
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