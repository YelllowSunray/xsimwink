const crypto = require('crypto');

// Your credentials
const apiKey = 'APIF9cJBzESgerj';
const apiSecret = 'YpfvkQ6LXGcnJVRGBHXfX9Qfo75cc7HD1eHfgLOtglpH';
const serverUrl = 'wss://xoxo-4t6ardn5.livekit.cloud';

// JWT payload
const now = Math.floor(Date.now() / 1000);
const payload = {
  iss: apiKey,
  sub: 'test-user',
  iat: now,
  exp: now + 3600, // 1 hour
  room: 'test-room',
  video: {
    room: 'test-room',
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true
  }
};

// JWT header
const header = {
  alg: 'HS256',
  typ: 'JWT'
};

// Encode header and payload
const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');

// Create signature
const signature = crypto
  .createHmac('sha256', apiSecret)
  .update(encodedHeader + '.' + encodedPayload)
  .digest('base64url');

const token = encodedHeader + '.' + encodedPayload + '.' + signature;

console.log('🔑 Generated LiveKit Token:');
console.log('');
console.log(token);
console.log('');
console.log('📋 Use these values in /test-eye-contact:');
console.log('Server URL:', serverUrl);
console.log('Room Name: test-room');
console.log('Access Token:', token);

