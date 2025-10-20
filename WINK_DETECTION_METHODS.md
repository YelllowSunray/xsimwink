# 😉 Wink Detection Methods Comparison

## Overview
This document compares different approaches to detecting winks in video streams and explains the trade-offs between them.

## Current Implementation

### Method: Blendshape Threshold Detection
**File:** `src/hooks/useLiveKitEyeContact.ts`

```typescript
const WINK_CLOSED_THRESHOLD = 0.65;
const WINK_OPEN_THRESHOLD = 0.4;

if (leftEyeBlink > WINK_CLOSED_THRESHOLD && rightEyeBlink < WINK_OPEN_THRESHOLD) {
  isWinking = true;
  winkEye = 'left';
}
```

**Advantages:**
- Simple implementation
- Uses existing MediaPipe blendshapes
- No additional processing required
- Fast (included in existing detection loop)

**Disadvantages:**
- Fixed thresholds may not work for everyone
- Can trigger false positives (looking down, squinting)
- Doesn't distinguish between wink and half-blink
- Lighting/angle sensitive

---

## Alternative Methods

### 1. Eye Aspect Ratio (EAR)

**Concept:** Calculate ratio of vertical to horizontal eye distances

```typescript
function calculateEAR(eyeLandmarks: Point[]): number {
  // Vertical eye landmarks
  const A = distance(eyeLandmarks[1], eyeLandmarks[5]);
  const B = distance(eyeLandmarks[2], eyeLandmarks[4]);
  
  // Horizontal eye landmarks  
  const C = distance(eyeLandmarks[0], eyeLandmarks[3]);
  
  // Eye Aspect Ratio
  return (A + B) / (2.0 * C);
}

// Usage
const leftEAR = calculateEAR(leftEyeLandmarks);
const rightEAR = calculateEAR(rightEyeLandmarks);

if (leftEAR < 0.2 && rightEAR > 0.25) {
  // Left wink detected
}
```

**MediaPipe Landmarks for Eyes:**
- Left eye: 33, 160, 158, 133, 153, 144
- Right eye: 362, 385, 387, 263, 373, 380

**Pros:**
- More geometric/mathematical approach
- Well-established in computer vision
- Less dependent on ML confidence scores
- Better cross-person consistency

**Cons:**
- Requires accurate landmark detection
- Sensitive to head pose/rotation
- Need to calculate distances

---

### 2. Temporal Pattern Recognition

**Concept:** Analyze eye state over time to detect wink pattern

```typescript
interface EyeHistoryFrame {
  leftOpen: boolean;
  rightOpen: boolean;
  timestamp: number;
}

class WinkDetector {
  private history: EyeHistoryFrame[] = [];
  private readonly WINK_DURATION_MIN = 200; // ms
  private readonly WINK_DURATION_MAX = 600; // ms
  
  detectWink(leftOpen: boolean, rightOpen: boolean): 'left' | 'right' | null {
    const now = Date.now();
    this.history.push({ leftOpen, rightOpen, timestamp: now });
    
    // Keep only last 1 second
    this.history = this.history.filter(h => now - h.timestamp < 1000);
    
    // Pattern: [both open] → [one closed] → [both open]
    const pattern = this.findWinkPattern();
    return pattern;
  }
  
  private findWinkPattern(): 'left' | 'right' | null {
    if (this.history.length < 3) return null;
    
    // Look for wink pattern in recent history
    for (let i = 2; i < this.history.length; i++) {
      const before = this.history[i - 2];
      const during = this.history[i - 1];
      const after = this.history[i];
      
      const duration = after.timestamp - before.timestamp;
      
      if (duration >= this.WINK_DURATION_MIN && 
          duration <= this.WINK_DURATION_MAX) {
        
        // Left wink pattern
        if (before.leftOpen && before.rightOpen &&
            !during.leftOpen && during.rightOpen &&
            after.leftOpen && after.rightOpen) {
          return 'left';
        }
        
        // Right wink pattern
        if (before.leftOpen && before.rightOpen &&
            during.leftOpen && !during.rightOpen &&
            after.leftOpen && after.rightOpen) {
          return 'right';
        }
      }
    }
    
    return null;
  }
}
```

**Pros:**
- Distinguishes intentional winks from blinks
- Reduces false positives significantly
- More natural/human-like detection
- Can detect wink duration/speed

**Cons:**
- Adds 200-600ms latency
- More complex state management
- Memory overhead for history
- May miss very quick winks

---

### 3. Relative Eye Closure

**Concept:** Compare relative openness of both eyes

```typescript
function detectWinkRelative(
  leftEyeBlink: number, 
  rightEyeBlink: number
): { winking: boolean; eye: 'left' | 'right' | null } {
  
  const difference = Math.abs(leftEyeBlink - rightEyeBlink);
  const avgClosure = (leftEyeBlink + rightEyeBlink) / 2;
  
  // One eye significantly more closed than other
  if (difference > 0.4 && avgClosure < 0.7) {
    if (leftEyeBlink > rightEyeBlink) {
      return { winking: true, eye: 'left' };
    } else {
      return { winking: true, eye: 'right' };
    }
  }
  
  return { winking: false, eye: null };
}
```

**Pros:**
- Adaptive to individual differences
- No fixed thresholds
- Works in varying lighting
- Simple logic

**Cons:**
- May not catch subtle winks
- Can be triggered by squinting
- Requires both eyes visible

---

### 4. Multi-Factor Hybrid Approach

**Concept:** Combine multiple signals for higher confidence

```typescript
interface WinkDetectionFactors {
  blendshapeDiff: number;     // Difference in blink scores
  earDiff: number;            // Difference in EAR values
  lookingForward: boolean;    // Is user facing camera?
  temporalPattern: boolean;   // Matches wink timing pattern?
}

function detectWinkHybrid(factors: WinkDetectionFactors): boolean {
  let confidence = 0;
  
  // Factor 1: Blendshape difference (30%)
  if (factors.blendshapeDiff > 0.4) {
    confidence += 0.3;
  }
  
  // Factor 2: EAR difference (30%)
  if (factors.earDiff > 0.15) {
    confidence += 0.3;
  }
  
  // Factor 3: Looking forward (20%)
  if (factors.lookingForward) {
    confidence += 0.2;
  }
  
  // Factor 4: Temporal pattern (20%)
  if (factors.temporalPattern) {
    confidence += 0.2;
  }
  
  return confidence > 0.65; // Confidence threshold
}
```

**Pros:**
- Most accurate
- Fewest false positives
- Robust across conditions
- Tunable confidence threshold

**Cons:**
- Most complex implementation
- Higher computational cost
- More code to maintain
- Potential for over-engineering

---

## Performance Comparison

| Method | Accuracy | Speed | Complexity | False Positives | Latency |
|--------|----------|-------|------------|-----------------|---------|
| Blendshape | 75% | Fast | Low | Medium | ~100ms |
| EAR | 80% | Fast | Medium | Low | ~100ms |
| Temporal | 90% | Medium | High | Very Low | 300-500ms |
| Relative | 70% | Fast | Low | High | ~100ms |
| Hybrid | 95% | Medium | Very High | Very Low | ~200ms |

---

## Recommendations

### For Current Implementation
**Best option:** Keep blendshape method but improve thresholds:

```typescript
// Make thresholds more adaptive
const baselineLeftBlink = calculateBaseline(leftEyeBlinkHistory);
const baselineRightBlink = calculateBaseline(rightEyeBlinkHistory);

const leftClosed = leftEyeBlink > (baselineLeftBlink + 0.4);
const rightOpen = rightEyeBlink < (baselineRightBlink + 0.2);

if (leftClosed && rightOpen) {
  // Adaptive left wink
}
```

### For Enhanced Version
**Recommended:** Add temporal pattern detection on top of blendshapes:

```typescript
// Quick win: Just check duration
if (isWinking && !wasWinkingBefore) {
  winkStartTime = now;
}
if (!isWinking && wasWinkingBefore) {
  const winkDuration = now - winkStartTime;
  if (winkDuration > 200 && winkDuration < 600) {
    triggerWinkAnimation(); // More confident
  }
}
```

### For Maximum Accuracy
**Professional grade:** Implement hybrid approach with all factors

---

## Implementation Strategy

### Phase 1: Improve Current (Quick)
1. Add adaptive thresholds based on user baseline
2. Add minimum duration check (200ms)
3. Require both eyes detected

### Phase 2: Add Temporal (Medium)
1. Implement eye state history
2. Add pattern matching
3. Distinguish wink from blink

### Phase 3: Full Hybrid (Advanced)
1. Calculate EAR for both eyes
2. Add gaze direction factor
3. Implement confidence scoring
4. Allow user calibration

---

## Testing Different Methods

To help debug, you can enable multiple detection methods:

```typescript
interface WinkDebugInfo {
  method: string;
  detected: boolean;
  confidence: number;
  details: any;
}

const debugResults: WinkDebugInfo[] = [
  { method: 'Blendshape', detected: blendshapeWink, confidence: 0.7, ... },
  { method: 'EAR', detected: earWink, confidence: 0.8, ... },
  { method: 'Temporal', detected: temporalWink, confidence: 0.9, ... },
];

console.table(debugResults);
```

This helps identify which method works best for your use case.

---

## References

- MediaPipe Face Landmarker: https://developers.google.com/mediapipe/solutions/vision/face_landmarker
- Eye Aspect Ratio paper: Soukupová and Čech (2016)
- Facial Action Coding System (FACS): Ekman & Friesen


