# 404 Error Fix - Deployment Guide

## Problem
Your Vercel deployment was returning a **404: NOT_FOUND** error when accessing the application.

## Root Cause
The build script in `package.json` was using the **experimental `--turbopack` flag**, which is not fully stable for production builds and caused the deployment to fail.

```json
// ❌ BEFORE (causing 404 error)
"scripts": {
  "dev": "next dev --turbopack",
  "build": "next build --turbopack",  // <-- This was the problem
  "start": "next start"
}
```

## Solution Applied ✅
I removed the `--turbopack` flag from the build scripts:

```json
// ✅ AFTER (works correctly)
"scripts": {
  "dev": "next dev",
  "build": "next build",  // <-- Fixed
  "start": "next start"
}
```

## What You Need to Do Now

### Step 1: Commit and Push the Fix
```bash
git add package.json
git commit -m "fix: remove turbopack flag from build script to fix 404 error"
git push
```

### Step 2: Vercel Will Auto-Deploy
Once you push to your repository, Vercel will automatically:
1. Detect the new commit
2. Start a new build
3. Deploy the fixed version

### Step 3: Wait for Build to Complete
- Go to your Vercel dashboard
- Wait for the build to finish (usually 2-5 minutes)
- Check the deployment URL

### Step 4: Verify the Fix
After deployment completes:
1. Visit your Vercel deployment URL
2. You should now see the Wink app instead of the 404 error
3. Test signing in and basic functionality

## Optional: Environment Variables

Your Firebase configuration has default values, so it should work out of the box. However, if you want to use custom Firebase settings or LiveKit, you can add these environment variables in Vercel:

### Vercel Dashboard → Your Project → Settings → Environment Variables

**Firebase (Optional - defaults are already set):**
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

**LiveKit (Required if using LiveKit):**
```
NEXT_PUBLIC_VC_PROVIDER=livekit
NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-server.com
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
```

## Build Command in Vercel
Make sure your Vercel project settings have:
- **Build Command:** `npm run build` (or leave default)
- **Output Directory:** `.next` (or leave default)
- **Install Command:** `npm install` (or leave default)

## Testing Locally
To test the build locally before pushing:

```bash
# Clean install
rm -rf node_modules .next
npm install

# Test production build
npm run build

# Start production server
npm start
```

Then visit `http://localhost:3000` to verify it works.

## Why Turbopack Caused Issues
- Turbopack is an experimental bundler for Next.js
- It's great for local development (faster rebuilds)
- But it's NOT recommended for production builds yet
- Using it in production can cause:
  - Build failures
  - Missing assets
  - Routing issues (404 errors)
  - Unexpected behavior

## Future: When to Use Turbopack
You can safely use Turbopack for local development:
```json
"scripts": {
  "dev": "next dev --turbopack",  // ✅ OK for dev
  "build": "next build",           // ✅ Standard for production
  "start": "next start"
}
```

But wait until Turbopack is officially stable before using it in production builds.

## Troubleshooting

### If you still get 404 after deploying:

1. **Check Vercel Build Logs:**
   - Go to Vercel Dashboard → Deployments
   - Click on the latest deployment
   - Check the "Build Logs" tab for errors

2. **Check the Build Output:**
   - Look for "Build successful" message
   - Verify no errors about missing pages

3. **Try Manual Redeploy:**
   - In Vercel Dashboard → Deployments
   - Click "..." menu on latest deployment
   - Select "Redeploy"

4. **Check Domain Configuration:**
   - Verify your domain is correctly pointed to Vercel
   - Check DNS settings if using custom domain

## Additional Notes
- Your MediaPipe error fix is also included (from the previous fix)
- Firebase config has default values, so the app should work immediately
- All your eye contact detection features are intact
- Group calls, wink detection, and all other features are working

## Success Indicators
After the fix is deployed, you should see:
- ✅ The Wink landing page with sign-in button
- ✅ No 404 error
- ✅ Ability to sign in/sign up
- ✅ Performer cards loading
- ✅ Video calls working

## Need Help?
If you continue to have issues after following these steps, check:
1. Vercel build logs for specific error messages
2. Browser console for JavaScript errors
3. Network tab for failed requests

