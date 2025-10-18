import { NextRequest, NextResponse } from 'next/server';

/**
 * Spotify OAuth Callback Handler
 * Receives the authorization code from Spotify and redirects back to the app
 */

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    // Redirect back to app with error
    return NextResponse.redirect(new URL(`/?spotify_error=${error}`, request.url));
  }

  if (code) {
    // Redirect back to app with authorization code
    return NextResponse.redirect(new URL(`/?spotify_code=${code}`, request.url));
  }

  return NextResponse.redirect(new URL('/?spotify_error=no_code', request.url));
}

