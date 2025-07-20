import { NextResponse } from 'next/server';

const isDev = process.env.NODE_ENV === 'development';

export function middleware(request) {
  console.log('🚨 Middleware triggered on:', request.url);

  if (isDev) {
    // Skip token check in dev
    console.log('🚨 Dev mode: skipping token check');
    return NextResponse.next();
  }

  const token = request.cookies.get('accessToken')?.value;
  console.log('🚨 Token:', token);

  if (!token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/login', '/login/:path*'],
};

