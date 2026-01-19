# Controls Updated ✅

## What Changed

### Altitude Control: Slider → Buttons

**Before (Slider):**
- Drag slider up/down (0-100cm)
- Release to execute

**Now (Buttons):**
- **Go Up** button → Rise 20cm
- **Go Down** button → Descend 20cm
- Each click = fixed 20cm movement

### Rotation Control: Unchanged

**Still using slider:**
- Drag left/right (0-100°)
- Release to execute rotation
- More precise for camera positioning

## Current Setup

```
┌─────────────────────────────────────────────────┐
│           🚁 Flight Controls                     │
├─────────────┬─────────────┬─────────────────────┤
│ Takeoff/Land│  Altitude   │  Camera Rotation    │
│  [Takeoff]  │  [Go Up]    │  Left [===|===] Right│
│  [Land]     │  [Go Down]  │                     │
│             │ Each=20cm   │  Slide & release    │
└─────────────┴─────────────┴─────────────────────┘
```

## Takeoff Height: 30cm (Default Tello)

The Tello's default takeoff height is approximately **30cm** (not 30m!). This is built into the Tello firmware and cannot be changed via the API.

**After Takeoff:**
- Drone is at ~30cm altitude
- Use "Go Up" to rise higher
- 1 click = 50cm, 2 clicks = 70cm, etc.

## Hovering Tips

### Problem
Drone drifts or tries to land after takeoff.

### Quick Fix
**Immediately after clicking "Takeoff", click "Go Up"** (20cm)

This:
- Keeps motors engaged
- Prevents auto-land
- Stabilizes hovering

### Workflow
```
1. Click "Takeoff"
   → Rises to ~30cm

2. IMMEDIATELY click "Go Up"
   → Now at ~50cm
   → Much more stable

3. Take photos, rotate, etc.
   → Keep drone active
   → Don't let it sit idle >5 seconds

4. Click "Land" when done
```

## Why Buttons for Altitude?

**Reasons:**
1. **Consistent movements** - 20cm is predictable
2. **Quick taps** - Faster than dragging slider
3. **Less error-prone** - Can't accidentally overshoot
4. **Battery-friendly** - Smaller movements = longer flight time

**20cm per click is ideal because:**
- Small enough for fine adjustments
- Large enough to be meaningful
- 5 clicks = 1 meter (easy math!)

## Why Keep Slider for Rotation?

**Reasons:**
1. **Variable precision** - Sometimes need 5°, sometimes 90°
2. **Visual feedback** - See angle before executing
3. **Smooth control** - Natural gesture for camera positioning

## Safety Tips Updated

New tips displayed in UI:
- Fly in open space (2m clearance)
- Battery >20%
- **Altitude: 20cm per click**
- **If drone drifts, send small up/down command to stabilize**

## Usage Examples

### Basic Flight
```
1. Connect → Start Camera → Takeoff
2. Go Up (stabilize at 50cm)
3. Go Up again (now at 70cm)
4. Take photos
5. Land
```

### Photo Panorama
```
1. Takeoff → Go Up to 70cm
2. Take Photo 1
3. Rotate 30° right
4. Take Photo 2
5. Rotate 30° right
6. Take Photo 3
... (repeat for full 360°)
7. Land
```

### Height Comparison
```
1. Takeoff → Go Up to 50cm
2. Take Photo 1 (low angle)
3. Go Up → Go Up (now at 90cm)
4. Take Photo 2 (high angle)
5. Compare photos → See perspective difference
6. Land
```

## Files Modified

- **`src/App.js`**:
  - Replaced altitude slider with buttons
  - Updated to 20cm per click
  - Updated safety tips
  - Added hovering guidance

## Try It!

```bash
# Start backend
cd ~/src/github.com/linsun/tello-backend
./run_server.sh

# Start frontend
cd ~/src/github.com/linsun/tello-frontend
npm start
```

**Test sequence:**
1. Connect to Tello
2. Start Camera
3. Click "Takeoff"
4. **Immediately click "Go Up"** (this stabilizes it!)
5. Drone should now hover steadily
6. Try rotating with slider
7. Take some photos
8. Land

## Summary

✅ **Altitude: Button-based** (20cm per click)
✅ **Rotation: Slider-based** (variable angle)
✅ **Takeoff height: ~30cm** (Tello default)
✅ **Hovering fix: Click "Go Up" immediately after takeoff**

Your controls are now optimized for reliable Tello flight! 🚁
