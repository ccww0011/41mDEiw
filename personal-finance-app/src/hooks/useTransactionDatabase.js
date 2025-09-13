'use client';

async function transactionApi(method, data = null, setTransactions) {
  try {
    let content = {
      method: method,
      headers: { 'content-type': 'application/json' },
      credentials: "include",
    }
    if (method !== "GET") {
      content.body = JSON.stringify(data);
    }
    const response = await fetch(process.env.NEXT_PUBLIC_AUTHENTICATED_URL + "/transaction", content);
    const items = await response.json();
    if (response.ok) {
      const contentType = response.headers.get('Content-Type');
      if (contentType && contentType.includes('text/html')) {
        return {message: "Unauthorised.", status: 'Unauthorised'};
      } else {
        setTransactions(items.data);
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

export async function getTransactions(setTransactions) {
  return await transactionApi('GET', null, setTransactions);
}

export async function putTransactions(data, setTransactions) {
  return await transactionApi('PUT', data, setTransactions);
}
