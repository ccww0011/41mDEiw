import { NextResponse } from "next/server";

export async function POST(request) {
  const { username, password } = await request.json();

  // Validate user - example only
  if (username === "admin" && password === "pass") {
    return NextResponse.json({ token: "fake-jwt-token", user: { name: "Admin" } });
  }

  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
}
