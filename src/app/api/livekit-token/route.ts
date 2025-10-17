import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';

// LiveKit token generation endpoint
// Requires: LIVEKIT_API_KEY, LIVEKIT_API_SECRET env vars
export async function POST(request: NextRequest) {
  try {
    // Clone the request to avoid consuming the body
    const body = await request.text();
    
    if (!body || body.trim() === '') {
      console.error('❌ Empty request body received');
      return NextResponse.json(
        { error: 'Request body is empty' },
        { status: 400 }
      );
    }

    let parsedBody;
    try {
      parsedBody = JSON.parse(body);
    } catch (parseError) {
      console.error('❌ Failed to parse JSON:', parseError);
      console.error('Body received:', body);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { roomName, participantName, participantIdentity } = parsedBody;

    if (!roomName || !participantIdentity) {
      console.error('❌ Missing required fields:', { roomName, participantIdentity });
      return NextResponse.json(
        { error: 'roomName and participantIdentity are required' },
        { status: 400 }
      );
    }

    console.log('✅ Token request:', { roomName, participantIdentity, participantName });

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      console.error('Missing LiveKit credentials in environment');
      return NextResponse.json(
        { error: 'Server configuration error - LiveKit credentials not set' },
        { status: 500 }
      );
    }

    // Create access token
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantIdentity,
      name: participantName || participantIdentity,
    });

    // Grant permissions to join room and publish/subscribe
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();
    
    return NextResponse.json({ token });
  } catch (error) {
    console.error('LiveKit token generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate token', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

