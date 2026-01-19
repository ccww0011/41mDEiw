'use client';

import {logout} from "@/hooks_protected/useAuth";

async function dividendApi(method, body = null, setDividends) {
  try {
    let content = {
      method: method,
      headers: { 'content-type': 'application/json' },
      credentials: "include",
    }
    if (method !== "GET") {
      content.body = JSON.stringify(body);
    }
    const response = await fetch(process.env.NEXT_PUBLIC_AUTHENTICATED_URL + "/api/dividend", content);
    const items = await response.json();
    if (response.ok) {
      const contentType = response.headers.get('Content-Type');
      if (contentType && contentType.includes('text/html')) {
        return {message: "Unauthorised.", status: 'Unauthorised'};
      } else {
        setDividends(items.data);
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

export async function getDividends(setDividends) {
  return await dividendApi('GET', null, setDividends);
}

export async function putDividends(body, setDividends) {
  return await dividendApi('PUT', body, setDividends);
}
