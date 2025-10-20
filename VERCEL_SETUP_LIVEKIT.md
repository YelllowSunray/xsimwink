# 🚀 Deploy to Vercel with LiveKit - Quick Guide

## ⚡ 3-Step Setup (Takes 5 Minutes)

### Step 1: Get LiveKit Credentials

1. Go to **https://cloud.livekit.io/** and sign up (FREE, no credit card)
2. Create a new project
3. Go to **Settings → Keys** → **Create Key**
4. **SAVE THESE 3 VALUES:**
   - `LIVEKIT_API_KEY` (starts with API...)
   - `LIVEKIT_API_SECRET` (⚠️ shown only once!)
   - `NEXT_PUBLIC_LIVEKIT_URL` (wss://your-project-xxx.livekit.cloud)

### Step 2: Add to Vercel

Go to your Vercel project → **Settings** → **Environment Variables**

Add these **10 variables** (copy-paste exactly):

| Variable Name | Value |
|--------------|-------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `AIzaSyDl7J_X8jHinJrsS8_lqbwW5GNuhCoWeuo` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `xoxo-53066.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `xoxo-53066` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `xoxo-53066.firebasestorage.app` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `832070586009` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:832070586009:web:f30ef934d04538ecfb3208` |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | `G-17Z126NS7J` |
| `LIVEKIT_API_KEY` | *Your key from Step 1* |
| `LIVEKIT_API_SECRET` | *Your secret from Step 1* |
| `NEXT_PUBLIC_LIVEKIT_URL` | *Your URL from Step 1* |

**Important:** Set environment for **All** (Production, Preview, Development)

### Step 3: Redeploy

1. Go to **Deployments** tab
2. Click **⋯** on latest deployment
3. Click **Redeploy**
4. Wait ~2 minutes

## ✅ Done! 

Your app will now:
- ✅ Use LiveKit for all video calls
- ✅ Work on mobile Safari
- ✅ Support multiple simultaneous calls
- ✅ Handle 5,000 participant-minutes/month (FREE)

## 🐛 If You Get 404 Error

**Cause:** Missing environment variables

**Fix:**
1. Double-check all 10 variables are added in Vercel
2. Make sure LIVEKIT_API_KEY and LIVEKIT_API_SECRET are correct
3. Redeploy again after adding variables

## 💻 Local Development

Create `.env.local` file:

```bash
# LiveKit
LIVEKIT_API_KEY=your_key_here
LIVEKIT_API_SECRET=your_secret_here
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
NEXT_PUBLIC_VC_PROVIDER=livekit

# Firebase (uses defaults if not set)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDl7J_X8jHinJrsS8_lqbwW5GNuhCoWeuo
```

Run:
```bash
npm run dev
```

---

**Questions?** See [LIVEKIT_DEPLOYMENT.md](./LIVEKIT_DEPLOYMENT.md) for detailed troubleshooting.

