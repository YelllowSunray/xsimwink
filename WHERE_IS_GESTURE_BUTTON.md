# 🔍 Where is the Gesture Toggle Button?

## 📍 Button Location

The **😉/🚫 gesture toggle button** is located in the **bottom control bar** (center of screen) during video calls.

## ✅ Which Page to Use?

The button is **ONLY available** on:
- `/test-eye-contact` page (test page)

The button is **NOT on**:
- Main app pages (homepage dashboard)
- Regular video call pages

## 🎯 How to See It:

### Step 1: Go to Test Page
Open: `http://localhost:3000/test-eye-contact`

### Step 2: Enter LiveKit Credentials
You need:
- LiveKit token
- Server URL (wss://...)
- Room name

### Step 3: Join Call
Click "Join Call" button

### Step 4: Look for Control Bar
**Bottom center of screen**, you'll see buttons in this order:
```
[👁️ Pink]  [😉 Yellow]  [ℹ️ Gray]  [😉 Me]  [😉 Them]  [X people]
   ↑            ↑
 Wink       Gesture      
Detection   Toggle      
            (THIS ONE!)
```

## 🎨 Button Appearance:

**When ENABLED (gestures showing):**
- 😉 emoji
- Yellow/orange background
- Animations will display when you wink

**When DISABLED (gestures hidden):**
- 🚫 emoji  
- Gray background
- Winks detect but animations don't show

## ❓ Still Don't See It?

### Check These:
1. **Are you on `/test-eye-contact` page?** (Not the main app)
2. **Did you join the call?** (Button only shows during active call)
3. **Check browser console** (F12) for errors
4. **Try refreshing** the page after deployment

### Alternative: Add to Main App

If you want this button on your main video chat pages, you need to:
1. Replace `VideoChatLiveKit` component
2. With `LiveKitVideoWithEyeContact` component
3. Or manually add the button to your existing component

Want me to add it to your main app pages? Let me know! 😊

---

## 📱 Mobile vs Desktop

- **Desktop:** Button shows in control bar at bottom
- **Mobile:** Same location, might need to tap screen to show controls

---

## 🐛 Troubleshooting:

**If button is still missing:**
1. Clear browser cache (Ctrl+Shift+R)
2. Check if using correct component (LiveKitVideoWithEyeContact)
3. Verify deployment finished on Vercel
4. Try incognito window
5. Check browser console for JavaScript errors

**If button is there but not working:**
1. Click it - should toggle between 😉 and 🚫
2. Try winking - animations should show/hide based on button state
3. Check console logs for gesture detection messages

---

Need help adding this button to a different page? Let me know which page you're testing on! 🚀

