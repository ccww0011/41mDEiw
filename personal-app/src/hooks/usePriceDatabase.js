'use client';

import {logout} from "@/hooks/useAuth";

async function priceApi(method, data, setPrices) {
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

        return {message: items.message, status: 'Success'};
      }
    } else if (response.status === 403) {
      logout();
      return {message: "Unauthorised.", status: 'Unauthorised'};
    } else {
      return {message: items.message, status: 'Error'};
    }
  } catch (error) {
    return {message: error.message, status: 'Error'};
  }
}

export async function getInitialPrices(tickers, date, setPrices) {
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

  // all tickers in chunks of 25
  const tickerChunks = chunkArray(tickers, 25);

  // call API for each chunk
  for (const chunk of tickerChunks) {
    const items = chunk.map((ticker) => ({
      ticker,
      startDate: startDateStr,
      endDate: endDateStr
    }));

    const data = { items: JSON.stringify(items) };
    await priceApi('GET', data, setPrices);
  }
}


export async function getPrices(ticker, startDate, endDate, prices, setPrices) {
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
  const end = toUTCDate(endDate);

  // ---- FIND MISSING RANGES ----
  let ranges = [];
  let inRange = false;

  let d = start;
  let prev = null;

  while (d <= end) {
    const dayStr = formatUTCDate(d);

    const exists =
      prices[ticker] &&
      Object.prototype.hasOwnProperty.call(prices[ticker], dayStr);

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
      ticker,
      startDate: ranges[i],
      endDate: ranges[i + 1],
    });
  }

  const data = { items: JSON.stringify(items) };

  return await priceApi('GET', data, setPrices);
}

export async function putPrices(ticker, startDate, endDate, prices, setPrices) {
  const data = [];
  return await priceApi('PUT', data, setPrices);
}