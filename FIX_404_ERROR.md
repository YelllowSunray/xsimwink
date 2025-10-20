# 🚨 Fix 404 Error - Step by Step

Your app is deployed but returning 404 because **environment variables are missing in Vercel**.

## ✅ Follow These Steps EXACTLY:

### Step 1: Get LiveKit Credentials (If You Haven't Already)

**Option A: Already have LiveKit credentials?**
- Skip to Step 2

**Option B: Need LiveKit credentials?**
1. Go to: **https://cloud.livekit.io/**
2. Click **Sign Up** (FREE, no credit card)
3. Create a new project
4. Go to **Settings** → **Keys**
5. Click **Create Key**
6. **Copy these 3 values** (keep this tab open):
   ```
   LIVEKIT_API_KEY=APIxxxxxxxxx
   LIVEKIT_API_SECRET=xxxxxxxxxxxxxxx
   NEXT_PUBLIC_LIVEKIT_URL=wss://your-project-xxxx.livekit.cloud
   ```

### Step 2: Add Environment Variables to Vercel

1. **Go to Vercel Dashboard:**
   - Open: https://vercel.com/dashboard
   - Click on your project

2. **Go to Settings:**
   - Click **Settings** tab (top menu)
   - Click **Environment Variables** (left sidebar)

3. **Add EACH Variable ONE BY ONE:**

   Click **Add New** for each:

   ```
   Variable: NEXT_PUBLIC_FIREBASE_API_KEY
   Value: AIzaSyDl7J_X8jHinJrsS8_lqbwW5GNuhCoWeuo
   Environment: ✅ Production ✅ Preview ✅ Development
   ```

   ```
   Variable: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
   Value: xoxo-53066.firebaseapp.com
   Environment: ✅ Production ✅ Preview ✅ Development
   ```

   ```
   Variable: NEXT_PUBLIC_FIREBASE_PROJECT_ID
   Value: xoxo-53066
   Environment: ✅ Production ✅ Preview ✅ Development
   ```

   ```
   Variable: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
   Value: xoxo-53066.firebasestorage.app
   Environment: ✅ Production ✅ Preview ✅ Development
   ```

   ```
   Variable: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
   Value: 832070586009
   Environment: ✅ Production ✅ Preview ✅ Development
   ```

   ```
   Variable: NEXT_PUBLIC_FIREBASE_APP_ID
   Value: 1:832070586009:web:f30ef934d04538ecfb3208
   Environment: ✅ Production ✅ Preview ✅ Development
   ```

   ```
   Variable: NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
   Value: G-17Z126NS7J
   Environment: ✅ Production ✅ Preview ✅ Development
   ```

   ```
   Variable: LIVEKIT_API_KEY
   Value: [YOUR KEY FROM STEP 1]
   Environment: ✅ Production ✅ Preview ✅ Development
   ```

   ```
   Variable: LIVEKIT_API_SECRET
   Value: [YOUR SECRET FROM STEP 1]
   Environment: ✅ Production ✅ Preview ✅ Development
   ```

   ```
   Variable: NEXT_PUBLIC_LIVEKIT_URL
   Value: [YOUR URL FROM STEP 1]
   Environment: ✅ Production ✅ Preview ✅ Development
   ```

   ```
   Variable: NEXT_PUBLIC_VC_PROVIDER
   Value: livekit
   Environment: ✅ Production ✅ Preview ✅ Development
   ```

4. **Verify:** You should have **11 variables** total

### Step 3: Redeploy

1. Go to **Deployments** tab (top menu)
2. Find the latest deployment
3. Click the **⋯** (three dots) on the right
4. Click **Redeploy**
5. Click **Redeploy** again to confirm
6. Wait 2-3 minutes

### Step 4: Test

1. Click **Visit** button when deployment completes
2. Your app should now load! 🎉

---

## 🐛 Still Getting 404?

### Check #1: All Variables Added?
- Go back to **Settings** → **Environment Variables**
- Count them: Should be **11 variables**
- Each should have ✅ for all 3 environments

### Check #2: LiveKit Credentials Correct?
- `LIVEKIT_API_KEY` should start with `API`
- `LIVEKIT_API_SECRET` should be a long string
- `NEXT_PUBLIC_LIVEKIT_URL` should start with `wss://`

### Check #3: Check Vercel Logs
1. Go to **Deployments** tab
2. Click on the latest deployment
3. Click **Building** or **Function Logs**
4. Look for error messages
5. Share the error with me if you see one

---

## 📸 Screenshot Guide

If you're still stuck, share a screenshot of:
1. Your Vercel Environment Variables page (blur the LIVEKIT_API_SECRET)
2. The deployment logs
3. The exact error you're seeing

---

## ⚡ Quick Test (While You Wait)

After redeploying, check:
- Homepage: Should load
- Sign In: Should work
- Video call: Should connect

That's it! Your 404 error will be gone once the environment variables are added. 🚀

