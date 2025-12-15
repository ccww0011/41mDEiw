'use client';

import {logout} from "@/hooks/useAuth";

async function transactionApi(method, body = null, setTransactions) {
  try {
    let content = {
      method: method,
      headers: { 'content-type': 'application/json' },
      credentials: "include",
    }
    if (method !== "GET") {
      content.body = JSON.stringify(body);
    }
    const response = await fetch(process.env.NEXT_PUBLIC_AUTHENTICATED_URL + "/api/transaction", content);
    const items = await response.json();
    if (response.ok) {
      const contentType = response.headers.get('Content-Type');
      if (contentType && contentType.includes('text/html')) {
        return {message: "Unauthorised.", status: 'Unauthorised'};
      } else {
        setTransactions(items.data);
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

export async function getTransactions(setTransactions) {
  return await transactionApi('GET', null, setTransactions);
}

export async function putTransactions(body, setTransactions) {
  return await transactionApi('PUT', body, setTransactions);
}
