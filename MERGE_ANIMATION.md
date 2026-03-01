# Merge Animation System

## Overview
When two bodies collide, instead of instantly becoming one merged body, they now animate merging together over 0.5-1 second with smooth scaling and fading.

## How It Works

### 1. **MergeEffect Class** (New)
- Tracks two colliding bodies and their target merged body
- Animates over a configurable duration (0.5s for black holes, 1.0s for others)
- Uses quadratic ease-in for smooth movement toward merge point
- Controls both `mergeScale` (0→1) and `mergeAlpha` (0→1) for smooth blending

### 2. **Collision Detection Changes**
When bodies collide:
1. Calculate merged body properties (mass, radius, velocity, angular momentum)
2. Create new `Body` object with merged properties (not added to array yet)
3. Generate texture for merged body
4. **Add merged body to bodies array immediately** (but invisible at mergeScale=0)
5. Create `MergeEffect` to animate the merge
6. Mark both original bodies as `isMerging = true`
7. Create explosion particles (except for black holes)

### 3. **Physics Skipping**
Bodies marked with `isMerging = true` skip:
- Gravity calculations
- Position updates
- Physics processing

Instead, their position/scale are controlled by the `MergeEffect` instance.

### 4. **Rendering**
- Bodies get `mergeScale` and `mergeAlpha` properties during animation
- Screen radius scales by `mergeScale`: `screenRadius *= mergeScale`
- Entire body rendering applies `globalAlpha = mergeAlpha`
- After animation, bodies are cleaned up and removed from array

### 5. **Animation Timeline**

**For 1.0 second merge (planets, stars, etc):**
- t=0.00-1.00s: Bodies move toward center while shrinking
  - Body 1 position: lerp from start to merge point
  - Body 2 position: lerp from start to merge point
  - Both bodies: scale from 1.0 → 0.0
  - Both bodies: alpha from 1.0 → 0.0
  - Merged body: scale from 0.0 → 1.0
  - Merged body: alpha from 0.0 → 1.0

**For 0.5 second merge (black holes):**
- Same as above but 2x faster
- Realistic for silent black hole mergers

### 6. **Special Cases**

**Star → Neutron Star:**
- Merge animation plays
- At completion, supernova effect triggers on merged body
- Creates cinematic supernova bloom

**Black Holes:**
- 0.5s merge duration (faster, quieter)
- No explosion particles
- Just silent gravitational merger

## Technical Details

### Body Properties Added
- `isMerging`: boolean flag, skips physics when true
- `mergeScale`: 0-1, scales body size during animation
- `mergeAlpha`: 0-1, fades body out during animation

### MergeEffect State
- `body1`, `body2`: original colliding bodies
- `mergedBody`: new body that fades in
- `time`, `duration`: animation progress
- Start positions stored for interpolation
- Uses quadratic easing: `phase = (t/duration)²`

### Cleanup
When merge animation completes:
1. `finish()` called on MergeEffect
2. `isMerging` flag cleared on original bodies
3. merged body `mergeScale` and `mergeAlpha` set to 1
4. Original bodies removed from bodies array
5. MergeEffect removed from mergeEffects array

## Visual Result
- Two bodies smoothly move toward each other
- They shrink and fade away
- Merged body grows and fades in at merge point
- Looks organic and satisfying instead of abrupt "blip"
- Matches physics realism (gradual accretion)

## Performance
- Minimal overhead (just position interpolation + scale/alpha)
- Merge effects array separate from bodies array
- No extra physics calculations during merge
- Clean removal of merged bodies prevents memory leaks
