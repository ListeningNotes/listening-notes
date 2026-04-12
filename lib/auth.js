// lib/auth.js
// Checks that the incoming request has the correct SESSION_SECRET header.
// Every protected API route calls this before doing anything else.
// If it returns false, the route should immediately return a 401 Unauthorized response.

export function isAuthorized(request) {
  const secret = request.headers.get('x-session-secret');
  return secret === process.env.SESSION_SECRET;
}