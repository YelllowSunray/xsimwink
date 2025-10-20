# LiveKit Deployment Guide (Vercel)

This app is configured to **always use LiveKit** for video calls. Follow this guide to deploy successfully.

## 🎯 Quick Setup (5 Minutes)

### Step 1: Get LiveKit Credentials

1. **Sign up for LiveKit Cloud** (FREE)
   - Go to: https://cloud.livekit.io/
   - Create an account (no credit card required)
   - Create a new project

2. **Get Your Credentials**
   - In LiveKit dashboard, go to **Settings** → **Keys**
   - Click **Create Key**
   - Copy these 3 values (you'll need them in Step 2):
     - ✅ **API Key** (starts with `API...`)
     - ✅ **API Secret** (long string - shown only once!)
     - ✅ **WebSocket URL** (looks like `wss://your-project-xxxxxx.livekit.cloud`)

### Step 2: Configure Vercel Environment Variables

1. **Go to your Vercel project:**
   - Open https://vercel.com/dashboard
   - Select your project
   - Go to **Settings** → **Environment Variables**

2. **Add these variables:**

```env
# Firebase (already has defaults, but set explicitly for production)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDl7J_X8jHinJrsS8_lqbwW5GNuhCoWeuo
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xoxo-53066.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xoxo-53066
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=xoxo-53066.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=832070586009
NEXT_PUBLIC_FIREBASE_APP_ID=1:832070586009:web:f30ef934d04538ecfb3208
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-17Z126NS7J

# LiveKit (REQUIRED - use your credentials from Step 1)
LIVEKIT_API_KEY=APIxxxxxxxxxxxxxxxxx
LIVEKIT_API_SECRET=your_secret_from_livekit
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project-xxxxxx.livekit.cloud

# Video Provider (already defaults to livekit in next.config.ts)
NEXT_PUBLIC_VC_PROVIDER=livekit
```

3. **Important:** Set environment for **All** (Production, Preview, Development)

### Step 3: Redeploy

1. Go to **Deployments** tab in Vercel
2. Click **⋯** menu on latest deployment
3. Click **Redeploy**
4. Wait ~2 minutes for deployment to complete

### Step 4: Test It!

1. Open your deployed URL
2. Sign in or create an account
3. Try starting a video call
4. Should connect in 1-2 seconds! 🎉

## 📊 LiveKit Free Tier

- **5,000 participant-minutes/month**
- ~83 half-hour 1-on-1 calls
- Works perfectly on mobile Safari
- Multiple simultaneous calls supported

## 🐛 Troubleshooting

### "404 NOT_FOUND" Error
- **Cause:** Missing environment variables
- **Fix:** Double-check all variables are set in Vercel (especially LIVEKIT_API_KEY and LIVEKIT_API_SECRET)
- **Verify:** Redeploy after adding variables

### "Cannot generate token" Error
- **Cause:** Invalid API key or secret
- **Fix:** Copy-paste credentials carefully from LiveKit dashboard
- **Note:** API secret is shown only once - if lost, create a new key

### Video call doesn't connect
- **Check:** Browser console for errors
- **Verify:** NEXT_PUBLIC_LIVEKIT_URL is correct (starts with `wss://`)
- **Test:** Try in incognito mode to rule out browser extensions

## 💻 Local Development Setup

Create `.env.local` in your project root:

```env
# Copy these from your LiveKit dashboard
LIVEKIT_API_KEY=APIxxxxxxxxxxxxxxxxx
LIVEKIT_API_SECRET=your_secret_here
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project-xxxxxx.livekit.cloud
NEXT_PUBLIC_VC_PROVIDER=livekit

# Firebase (already has defaults)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDl7J_X8jHinJrsS8_lqbwW5GNuhCoWeuo
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xoxo-53066.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xoxo-53066
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=xoxo-53066.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=832070586009
NEXT_PUBLIC_FIREBASE_APP_ID=1:832070586009:web:f30ef934d04538ecfb3208
```

Then run:
```bash
npm run dev
```

## 🔐 Security Notes

- ✅ `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` are **server-side only** (never exposed to client)
- ✅ `NEXT_PUBLIC_LIVEKIT_URL` is safe to expose (it's the WebSocket connection URL)
- ✅ Tokens are generated server-side in `/api/livekit-token`
- ✅ Tokens expire after 1 hour (configurable)

## 📚 Additional Resources

- LiveKit Documentation: https://docs.livekit.io/
- LiveKit Cloud Dashboard: https://cloud.livekit.io/
- React Components Guide: https://docs.livekit.io/guides/room/react/

## ✅ Checklist

Before deployment, ensure:
- [ ] LiveKit account created
- [ ] API Key obtained
- [ ] API Secret obtained (and saved securely!)
- [ ] WebSocket URL copied
- [ ] All 3 LiveKit variables added to Vercel
- [ ] Firebase variables added to Vercel
- [ ] Redeployed after adding variables
- [ ] Tested video call works

---

**Need help?** Check the Vercel deployment logs for specific error messages.

