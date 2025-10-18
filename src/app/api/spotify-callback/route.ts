import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL(`/?spotify_error=${error}`, request.url));
  }

  if (code) {
    return NextResponse.redirect(new URL(`/?spotify_code=${code}`, request.url));
  }

  return NextResponse.redirect(new URL('/?spotify_error=no_code', request.url));
}

