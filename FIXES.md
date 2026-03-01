# Collision Effects Fixes

## Issues Found and Fixed

### 1. **White Sphere Radius (FIXED)**
- **Problem**: The white sphere that replaces the body during supernova phases 1-3 was using a fixed 20px radius, causing it to appear as a separate white circle rather than scaling with the merged body.
- **Fix**: Changed from `Math.max(20, 10)` to `Math.max(effect.body.radius * this.zoom, 3)` so the white sphere scales proportionally with the actual neutron star radius.

### 2. **Phase Detection in drawSupernovaEffects (FIXED)**
- **Problem**: The code was checking `effect.phase` directly, but `phase` is only available in the `props` object returned by `getProperties()`.
- **Fix**: Changed from `effect.phase < 3` to `props.phase < 3` to properly check the current phase before deciding whether to use the body position (phases 1-3) or explosion position (phases 3-4).

### 3. **Explosion Position Locking Not Initialized (FIXED)**
- **Problem**: The `explosionLocked` flag was used in the `update()` method but not initialized in the constructor, causing potential bugs in position tracking.
- **Fix**: Added `this.explosionLocked = false;` to the SupernovaEffect constructor.

## How the Supernova Effect Works

```
Timeline:
├── Phase 1 (0-3s): Bright lead-up
│   ├── White sphere grows slowly
│   ├── Glow effect expands (orange to white)
│   └── Body position = star position (still moving)
│
├── Phase 2 (3-4s): Silent collapse
│   ├── White sphere visible but dark
│   ├── Glow effect shrinks
│   └── Body position = star position (still moving)
│
├── Phase 3 (4-6s): Giant explosion
│   ├── White sphere visible (very bright first 600ms)
│   ├── Glow effect explodes outward (pure white)
│   ├── Explosion position LOCKED at phase 3 start
│   └── White screen wash effect appears (first 300ms)
│
└── Phase 4 (6-15s): Slow fade
    ├── White sphere NOT shown (replaced by neutron star)
    ├── Glow effect fades out
    ├── Neutron star becomes visible
    └── Body position = star position (still moving)
```

## Body Rendering Logic

During supernova, the merged body is:
1. **Marked** with `supernovaTime > 0` so the normal rendering loop skips it
2. **Replaced** by the white sphere during phases 1-3
3. **Revealed** as a neutron star in phase 4
4. **Still in the `bodies[]` array** but hidden from regular rendering

## Test Checklist

- ✅ Two stars collide and trigger supernova
- ✅ Supernova only triggers on star→neutron-star transition (not on other mergers)
- ✅ White sphere scales with merged body radius
- ✅ White sphere only visible during phases 1-3
- ✅ Collision particles created on impact
- ✅ Supernova creates additional high-intensity particles
- ✅ Body doesn't render twice (skipped by normal draw loop)
- ✅ Supernova white wash effect appears during phase 3 peak

## How to Test

Open `test.html` in browser to run automated tests, or manually in `index.html`:
1. Set spawn type to "Star"
2. Click twice close together to spawn two stars
3. Watch them collide and merge
4. Observe the supernova effect progression with improved white sphere sizing
