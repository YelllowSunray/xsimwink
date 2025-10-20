# Wink Detection Threshold Update

## ✅ Simple 0.3 Threshold Implemented

I've updated the wink detection to use a clear, simple threshold:

### **New Rule:**
- **0 to 0.3**: No wink detected
- **Above 0.3**: Wink detected! 😉

## Changes Made:

### 1. **Simplified Threshold Logic**
```typescript
// Before: Multiple thresholds (0.60 closed, 0.45 open)
const WINK_CLOSED_THRESHOLD = 0.60;
const WINK_OPEN_THRESHOLD = 0.45;

// After: Single clear threshold at 0.3
const WINK_THRESHOLD = 0.3; // Clear cutoff
```

### 2. **Updated Detection Logic**

**Left Wink:**
```typescript
// Left eye > 0.3, Right eye < 0.3, significant difference
if (leftEyeBlink > WINK_THRESHOLD && 
    rightEyeBlink < WINK_THRESHOLD && 
    hasSignificantDifference) {
  // WINK DETECTED!
}
```

**Right Wink:**
```typescript
// Right eye > 0.3, Left eye < 0.3, significant difference
if (rightEyeBlink > WINK_THRESHOLD && 
    leftEyeBlink < WINK_THRESHOLD && 
    hasSignificantDifference) {
  // WINK DETECTED!
}
```

### 3. **Applied to Both Methods**
- ✅ **MediaPipe Blendshapes** (primary method)
- ✅ **Eye Aspect Ratio (EAR)** (fallback method)

### 4. **Additional Safeguards**
- **Significant Difference**: Eyes must differ by > 0.15
- **Not Blinking**: Average must be < 0.75 (prevents both eyes closed)
- **Duration Validation**: Wink must last 150-800ms
- **Rate Limiting**: Max 1 wink per 800ms

## How It Works:

### Example Values:

**No Wink (Both Eyes Open):**
```
Left: 0.05, Right: 0.08
→ Both below 0.3 → No wink
```

**Left Wink:**
```
Left: 0.45, Right: 0.10
→ Left above 0.3, Right below 0.3 → LEFT WINK! 😉
```

**Right Wink:**
```
Left: 0.08, Right: 0.52
→ Right above 0.3, Left below 0.3 → RIGHT WINK! 😉
```

**Both Eyes Closed (Blink):**
```
Left: 0.80, Right: 0.85
→ Average too high → Not a wink, just a blink
```

## Console Logs You'll See:

When winking is detected:
```
👁️ BLINK VALUES - Left: 0.45 Right: 0.10 Diff: 0.35
😉 LEFT WINK started! Left: 0.45 Right: 0.10 Diff: 0.35
😉✅ CONFIRMED WINK! left eye - Duration: 250ms
📤 Sending wink data: left eye
```

## Testing:

1. **Open Call**: Start a LiveKit video call
2. **Wink**: Close one eye (blink value should go above 0.3)
3. **Watch Console**: You'll see the blink values and wink detection
4. **See Effect**: Wink animation should appear on screen

## Tuning:

If winks are:
- **Too sensitive**: Increase `WINK_THRESHOLD` (e.g., 0.35 or 0.4)
- **Not sensitive enough**: Decrease `WINK_THRESHOLD` (e.g., 0.25 or 0.2)
- **Too many false positives**: Increase `hasSignificantDifference` threshold (currently 0.15)

## Current Settings:

```typescript
const WINK_THRESHOLD = 0.3;                    // Main threshold
const hasSignificantDifference = diff > 0.15;  // Eye difference required
const notBlinking = average < 0.75;             // Both eyes threshold
const validDuration = 150ms - 800ms;            // Temporal validation
const rateLimit = 800ms;                        // Between winks
```

## Files Modified:

- `src/hooks/useLiveKitEyeContact.ts` - Updated wink detection thresholds

## Summary:

✅ Simple rule: **Above 0.3 = Wink**
✅ Applied to both detection methods
✅ Temporal validation (150-800ms)
✅ Rate limited (max 1 per 800ms)
✅ Prevents false positives from blinking
✅ Requires significant eye difference

**Try winking now - it should detect at 0.3 and above!** 😉
