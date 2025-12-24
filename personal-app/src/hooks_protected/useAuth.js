"use client";

export async function fetchUser() {
  const res = await fetch(process.env.NEXT_PUBLIC_AUTHENTICATED_URL + "/oauth2/account", {
    credentials: "include",
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error("Not authenticated");
    }
    throw new Error("Failed to fetch user");
  }

  // If content-type is text/html (probably a redirect or error page), throw error
  const contentType = res.headers.get("Content-Type") || "";

  if (contentType.includes("text/html")) {
    // read the body as text just this once
    const text = await res.text();
    throw new Error("Not authenticated: " + text);
  }
  return res.json();
}

export function login() {
  const cognitoUrl = process.env.NEXT_PUBLIC_COGNITO_URL;
  const clientId = process.env.NEXT_PUBLIC_COGNITO_ID;
  const redirectUri = process.env.NEXT_PUBLIC_AUTHENTICATED_URL + "/oauth2/callback";
  window.location.href = `${cognitoUrl}/login?client_id=${clientId}&response_type=code&scope=openid&redirect_uri=${encodeURIComponent(redirectUri)}`;
}

export function logout() {
  const cognitoUrl = process.env.NEXT_PUBLIC_COGNITO_URL;
  const clientId = process.env.NEXT_PUBLIC_COGNITO_ID;
  const redirectUri = process.env.NEXT_PUBLIC_AUTHENTICATED_URL + "/oauth2/logout"
  window.location.href = `${cognitoUrl}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(redirectUri)}`;
}
