'use client';

import { logout } from "@/utils_protected/authApi";

async function userSettingsApi(method, body = null, setUserSettings) {
  try {
    const content = {
      method,
      headers: { "content-type": "application/json" },
      credentials: "include",
    };
    if (method !== "GET") {
      let payload = body;
      if (payload?.items && typeof payload.items === "string") {
        try {
          payload = { ...payload, items: JSON.parse(payload.items) };
        } catch {
          // keep original if parsing fails
        }
      }
      content.body = JSON.stringify(payload);
    }
    const response = await fetch(process.env.NEXT_PUBLIC_AUTHENTICATED_URL + "/api/user-settings", content);
    const items = await response.json();

    if (response.ok) {
      const contentType = response.headers.get("Content-Type");
      if (contentType && contentType.includes("text/html")) {
        return { message: "Unauthorised.", status: "Unauthorised" };
      } else {
        setUserSettings(items.data ?? {});
        return { message: items.message, status: "Success" };
      }
    } else if (response.status === 401 || response.status === 403) {
      logout();
      return { message: "Unauthorised.", status: "Unauthorised" };
    } else {
      return { message: items.message, status: "Error" };
    }
  } catch (error) {
    return { message: error.message, status: "Error" };
  }
}

export async function getUserSettings(setUserSettings) {
  return await userSettingsApi("GET", null, setUserSettings);
}

export async function putUserSettings(body, setUserSettings) {
  return await userSettingsApi("PUT", body, setUserSettings);
}
