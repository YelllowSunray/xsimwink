# Group Call Feature (Up to 20 People) 🎉

## Overview
Your app now supports group video calls with up to 20 participants using LiveKit! Users can select multiple performers and start a group call with everyone at once.

## Features Implemented

### 1. **Multi-Select Mode**
- Click "👥 Start Group Call" button on the main page
- Cards show checkboxes in selection mode
- Select up to 19 people (20 including yourself)
- Green border and checkmark show selected performers

### 2. **Group Call UI**
- **Responsive Grid Layout**: Automatically adjusts based on participant count
  - 1-2 people: Large tiles
  - 3-4 people: 2x2 grid
  - 5-6 people: 2x3 or 3x2 grid
  - 7-9 people: 3x3 grid
  - 10-12 people: 3x4 or 4x3 grid
  - 13-20 people: 4x5 or 5x4 grid
- **Each tile shows**:
  - Participant's video feed
  - Name label at bottom
  - Avatar placeholder if video is off
  - "You" label for your own video

### 3. **Group Call Invitations**
- When you start a group call, everyone gets an invite
- Incoming call toast shows: "👥 Incoming Group Call"
- Message: "{Caller} is inviting you to a group call with X people"
- Accept/Decline buttons

### 4. **Connection Fee**
- Each selected performer's connection fee is added up
- Total fee is shown before calling
- Balance check ensures you have enough funds
- Fee is deducted when call starts

### 5. **Call Management**
- Room ID format: `group_{callerId}_{timestamp}`
- Everyone joins the same LiveKit room
- Participants can join at different times
- Top bar shows participant count: "Group Call (5 people)"
- Status shows: "connected • 4 joined"

## How to Use

### Starting a Group Call

1. **Click "👥 Start Group Call"** button on main page
2. Cards enter selection mode (checkboxes appear)
3. **Click on performers** to select them (green border = selected)
4. **Counter shows**: "3 / 19 selected"
5. **Click "Call 3 people"** button (or however many you selected)
6. System checks your balance
7. Deducts total fee
8. Sends invites to all selected performers
9. Opens group call room

### Accepting a Group Call

1. You receive an incoming call toast
2. Shows caller name and participant count
3. Click **"Accept"** to join
4. You enter the group call room with everyone

### During the Call

- **Grid Layout**: See everyone in a responsive grid
- **Your Video**: Labeled "You" (horizontally flipped)
- **Others' Videos**: Labeled with their names
- **Top Bar**: Shows total participant count and connection status
- **Controls**: Record button and End Call button
- **Duration Timer**: Shows call duration

### Ending a Group Call

- Click **"End Call"** button
- You leave the room
- Others can continue the call
- Session saved to your history

## Technical Details

### Files Modified

1. **`src/services/CallService.ts`**
   - Added `createGroupCall()` method
   - Support for multiple participants
   - Group room ID generation

2. **`src/components/PerformerCard.tsx`**
   - Selection mode support
   - Checkbox indicator
   - Click handler for selection

3. **`src/app/page.tsx`**
   - Selection state management
   - Group call button
   - Multi-select logic
   - Connection fee calculation
   - Group call initiation

4. **`src/components/VideoChatLiveKit.tsx`**
   - Responsive grid layout
   - Group call detection
   - Participant tile rendering
   - Grid class calculation (1-20 people)

5. **`src/components/IncomingCallToast.tsx`**
   - Group call indicator
   - Participant count display

### LiveKit Integration

- **1-on-1 calls**: Room name = `{uid1}_{uid2}` (sorted)
- **Group calls**: Room name = `group_{callerId}_{timestamp}`
- All participants join the same room
- LiveKit handles all media routing automatically

### Participant Limits

- **Minimum**: 1 person (becomes a 1-on-1 call)
- **Maximum**: 19 invites + yourself = 20 total
- LiveKit free tier: 5,000 participant-minutes/month
- Group call cost = `participants × duration`

### Example Costs

**Free Tier (5,000 min/month)**
- 5-person call for 30 min = 150 participant-minutes
- ~33 half-hour 5-person calls/month free

**After Free Tier ($0.004/participant-min)**
- 5-person call for 30 min = 150 × $0.004 = **$0.60**
- 10-person call for 30 min = 300 × $0.004 = **$1.20**
- 20-person call for 30 min = 600 × $0.004 = **$2.40**

## Testing Instructions

### Test 1: Basic Group Call

1. Open app in 3+ browsers (or use multiple devices)
2. Sign in as different users in each
3. In Browser 1: Click "👥 Start Group Call"
4. Select 2-3 performers
5. Click "Call X people"
6. In other browsers: Accept the incoming call
7. **Verify**: Everyone sees each other in a grid

### Test 2: Selection Limits

1. Try selecting 20+ people
2. **Verify**: Error message at 19 selections
3. Deselect some people
4. **Verify**: Can select again

### Test 3: Insufficient Balance

1. Create user with low balance (< total fee)
2. Select multiple performers
3. Try to start call
4. **Verify**: Error message about insufficient balance

### Test 4: Grid Layouts

- **2 people**: Side-by-side layout
- **4 people**: 2x2 grid
- **6 people**: 2x3 grid
- **9 people**: 3x3 grid
- **12+ people**: Larger grids

### Test 5: Mobile Responsiveness

1. Test on mobile device
2. **Verify**: Grid adapts to screen size
3. **Verify**: Touch targets are large enough
4. **Verify**: Tiles stack properly on portrait

## Troubleshooting

### "Failed to join video call"
- Check LiveKit credentials in `.env.local`
- Verify `NEXT_PUBLIC_VC_PROVIDER=livekit`
- Check browser console for errors

### "Maximum reached" error
- You can only select 19 people
- Deselect some before adding more

### Grid layout looks wrong
- Clear browser cache
- Ensure Tailwind CSS is compiled
- Check for conflicting CSS styles

### Participants not seeing each other
- Ensure everyone accepted the call
- Check LiveKit room logs in dashboard
- Verify camera/mic permissions

### Audio echo or feedback
- Use headphones
- Mute when not speaking
- Check LiveKit echo cancellation settings

## Future Enhancements

### Possible Additions
- 🎤 **Mute/Unmute**: Individual audio controls
- 📹 **Camera On/Off**: Toggle video per participant
- 💬 **Group Chat**: Text messages during call
- 🖐️ **Raise Hand**: Request to speak indicator
- 👑 **Host Controls**: Mute others, remove participants
- 🎨 **Layout Options**: Gallery, spotlight, sidebar
- 📱 **Mobile Optimization**: Better mobile UI
- 🎬 **Group Recording**: Record entire group call
- 📊 **Stats**: Show network quality per participant

## Credits

Built with:
- **LiveKit**: WebRTC infrastructure
- **Next.js**: React framework
- **Tailwind CSS**: Styling
- **Firebase**: Firestore for signaling

---

**Status**: ✅ Fully implemented and ready to test!

**Last Updated**: October 17, 2025

