"use client";

export function login() {
  const cognitoUrl = process.env.NEXT_PUBLIC_COGNITO_URL;
  const clientId = process.env.NEXT_PUBLIC_COGNITO_ID;
  const redirectUri = process.env.NEXT_PUBLIC_CALLBACK_URL + "/oauth2/callback";
  window.location.href = `${cognitoUrl}/login?client_id=${clientId}&response_type=code&scope=openid&redirect_uri=${encodeURIComponent(redirectUri)}`;
}

export async function fetchUser() {
  const res = await fetch(process.env.NEXT_PUBLIC_AUTHENTICATED_URL + "/auth/user", {
    credentials: "include",
  });

  if (!res.ok) {
    if (res.status === 403) {
      throw new Error("Forbidden");
    }
    throw new Error("Failed to fetch user");
  }

  const contentType = res.headers.get("Content-Type") || "";
  if (contentType.includes("text/html")) {
    throw new Error("Not authenticated");
  }

  return res.json(); // user object expected here
}

export function logout() {
  const cognitoUrl = process.env.NEXT_PUBLIC_COGNITO_URL;
  const clientId = process.env.NEXT_PUBLIC_COGNITO_ID;
  const redirectUri = process.env.NEXT_PUBLIC_LOGOUT_URL + "/logout";

  window.location.href = `${cognitoUrl}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(redirectUri)}`;
}


