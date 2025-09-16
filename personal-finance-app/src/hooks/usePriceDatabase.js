'use client';

async function priceApi(method, data, setPrices) {
  try {
    let url = process.env.NEXT_PUBLIC_AUTHENTICATED_URL + "/price";
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
      return {message: "Unauthorised.", status: 'Unauthorised'};
    } else {
      return {message: items.message, status: 'Error'};
    }
  } catch (error) {
    return {message: error.message, status: 'Error'};
  }
}

export async function getPrices(ticker, startDate, endDate, prices, setPrices) {
  // const prices = {
  //   "AAPL": {
  //     "20250101": 192.55,
  //     "20250102": 194.22
  //   }
  // };
  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');

    return `${y}${m}${d}`;
  };

  const toDate = (str) => new Date(
    +str.slice(0, 4),
    +str.slice(4, 6) - 1,
    +str.slice(6, 8)
  );

  const start = toDate(startDate);
  const end = toDate(endDate);

  let ranges = [];
  let started = false;
  let dateStr = "";
  let prevDateStr = "";
  for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
    dateStr = formatDate(d);
    if (!(ticker in prices) || !(dateStr in prices[ticker])) {
      if (!started) {
        ranges.push(dateStr);
        started = true;
      }
    } else {
      if (started) {
        ranges.push(prevDateStr);
        started = false;
      }
    }
    prevDateStr = dateStr;
  }
  if (started) {
    ranges.push(dateStr);
  }
  const items = [];
  for (let i = 0; i < ranges.length; i += 2) {
    items.push({
      ticker: ticker,
      startDate: ranges[i],
      endDate: ranges[i + 1]
    });
  }
  const data = { items: JSON.stringify(items) };
  return await priceApi('GET', data, setPrices);
}

export async function putPrices(ticker, startDate, endDate, prices, setPrices) {
  const data = [];
  return await priceApi('PUT', data, setPrices);
}