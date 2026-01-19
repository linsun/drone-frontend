# Tello Hovering Tips 🚁

## The Hovering Issue

You mentioned the drone has trouble hovering in place and often tries to land. This is a common issue with Tello drones, especially indoors.

## Why It Happens

The Tello uses:
- **Downward-facing camera** for position tracking
- **Barometer** for altitude
- **IMU sensors** for stability

When the drone can't get good visual tracking (poor lighting, plain floors, moving too soon after takeoff), it may:
- Drift horizontally
- Slowly descend
- Try to auto-land as a safety measure

## Solutions

### 1. **Immediate Stabilization After Takeoff**
After clicking "Takeoff", immediately send a small command to keep motors engaged:

**Best Practice:**
```
1. Click "Takeoff" → Drone rises to ~30cm
2. IMMEDIATELY click "Go Up" (20cm) → Stabilizes at ~50cm
3. Now it should hover more steadily
```

This keeps the flight controller active and prevents the auto-land safety feature.

### 2. **Surface Matters**
The Tello's downward camera needs visual features to track position.

**Good Surfaces:**
- ✅ Textured carpet
- ✅ Wood flooring with grain
- ✅ Tile with grout lines
- ✅ Patterned rugs

**Bad Surfaces:**
- ❌ Plain white/solid color floors
- ❌ Very shiny/reflective surfaces
- ❌ Glass or mirrors
- ❌ Moving surfaces (blanket on bed)

**Quick Fix:** Place a patterned rug or textured mat under the flight area.

### 3. **Lighting**
**Good:** Bright, even lighting
**Bad:** Dim lighting, harsh shadows, direct sunlight causing glare

### 4. **Wait After Takeoff**
Give the drone 2-3 seconds after takeoff to stabilize before sending commands.

**Workflow:**
```
1. Click "Takeoff"
2. Count 1... 2... 3...
3. Click "Go Up" 20cm (stabilizes)
4. Now ready for rotation/photos
```

### 5. **Keep It Busy**
The Tello motors need to stay engaged. If idle too long (>5 seconds), it may try to auto-land.

**During Photo Sessions:**
```
Good:
- Take Photo 1
- Rotate 15° (keeps motors active)
- Take Photo 2
- Rotate 15° again
- Continue...

Bad:
- Take Photo 1
- Wait 10 seconds reviewing photo
- Drone tries to land 😫
```

### 6. **Battery Level**
Low battery (<30%) makes hovering worse.
- Motors can't maintain full power
- Flight controller becomes more conservative
- Auto-land activates more aggressively

**Solution:** Fly with battery >50% for best stability.

### 7. **Air Movement**
Avoid:
- Open windows (wind)
- Air conditioning vents
- Fans running
- People walking nearby (air turbulence)

## Your Setup (20cm Default)

With your **20cm altitude buttons**, here's the recommended workflow:

### Takeoff Sequence:
```
1. Click "Takeoff"
   → Drone rises to ~30cm (default Tello takeoff height)

2. IMMEDIATELY click "Go Up"
   → Rises 20cm more to ~50cm
   → Motors stay engaged
   → Hovering stabilizes

3. Optional: Click "Go Up" again
   → Now at ~70cm
   → Better camera view
   → More stable hover
```

### Photo Mission Workflow:
```
1. Takeoff + Go Up to 50-70cm
2. Take Photo 1
3. Rotate 15° right (keeps active)
4. Take Photo 2
5. Rotate 15° right
6. Take Photo 3
... continue
8. Land when done
```

## Emergency Recovery

If drone starts drifting badly:

**Option 1: Quick Up Command**
- Click "Go Up" → Often stabilizes

**Option 2: Land and Retry**
- Click "Land" → Let it land
- Click "Takeoff" → Try again
- Different spot might work better

**Option 3: Manual Controller**
- Have a physical Tello controller as backup
- Can take over if needed

## Code-Level Solutions

### Backend Enhancement (Optional)
I can add a "keep-alive" command that sends tiny altitude adjustments every few seconds to prevent auto-land:

```python
@app.route('/api/keep-alive', methods=['POST'])
def keep_alive():
    """Send tiny up command to keep motors active"""
    tello.send_rc_control(0, 0, 5, 0)  # Tiny upward thrust
    time.sleep(0.1)
    tello.send_rc_control(0, 0, 0, 0)  # Stop
```

Let me know if you want this feature!

## Summary

**Your hovering issue is normal** for Tello drones. Here's your action plan:

✅ **Immediate Fix:**
1. After "Takeoff", immediately click "Go Up" (20cm)
2. This stabilizes the hover

✅ **Better Surface:**
- Add textured mat/rug under flight area
- Avoid plain/shiny floors

✅ **Workflow:**
- Keep drone busy with small commands
- Don't let it sit idle >5 seconds
- Rotate between photos to keep active

✅ **Environment:**
- Good lighting
- No wind/AC
- Battery >50%

With these tips, your Tello should hover much more reliably! 🚁✨
