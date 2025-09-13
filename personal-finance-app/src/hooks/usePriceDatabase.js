'use client';

async function priceApi(method, data = null, setPrices) {
  try {
    const data = {
      tickers: ["NVDA", "MSFT"],
      startDate: "2020-01-01",
      endDate: "2020-01-05"
    };
    let url = process.env.NEXT_PUBLIC_AUTHENTICATED_URL + "/price";
    let content = {
      method: method,
      headers: { 'content-type': 'application/json' },
      credentials: "include",
    }
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
        setPrices(items.data);
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

export async function getPrices(setPrices) {
  return await priceApi('GET', [], setPrices);
}

export async function putPrices(data, setPrices) {
  return await priceApi('PUT', data, setPrices);
}