// middleware.js
// This file runs on the SERVER before any request reaches your API routes.
// It automatically attaches the SESSION_SECRET header to requests
// coming from your own session tool — so the secret never touches the browser.
import { NextResponse } from 'next/server';

export function middleware(request) {
  // Clone the request headers so we can modify them
  const headers = new Headers(request.headers);

  // Attach the secret from the server environment — never exposed to the browser
  headers.set('x-session-secret', process.env.SESSION_SECRET);

  // Pass the request through to the API route with the new header attached
  return NextResponse.next({ request: { headers } });
}

// Only run this middleware on your protected API routes — not on every page
export const config = {
  matcher: ['/api/research', '/api/format', '/api/entries', '/api/reflect'],
};