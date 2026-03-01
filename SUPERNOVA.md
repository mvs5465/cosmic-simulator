# Enhanced Supernova Effect

## Timeline (15 seconds total)

### Phase 1: Bright Lead-up (0-2 seconds)
- White sphere grows from small to medium
- Glow expands slowly (orange/white)
- Visual intensity builds up gradually
- **Body**: Still moving with physics

### Phase 2: Silent Collapse (2-2.5 seconds)
- White sphere visible but darkened (brightness = 0)
- Brief moment of darkness before explosion
- Creates dramatic pause effect
- **Body**: Still moving with physics

### Phase 3: BLINDING EXPLOSION (2.5-5.5 seconds)
- **First 1 second (ramp up)**: Brightness increases toward peak
  - Glow radius expands outward rapidly
  - White sphere intensifies

- **Middle 1 second (PEAK WHITE)**: Brightness = 3.0
  - Screen fills with pure white (100% wash effect at peak)
  - Literally drowns out the entire screen
  - Largest glow radius

- **Last 1 second (fade down)**: Brightness decreases from peak
  - White intensity fades
  - Screen wash effect reduces
  - Glow effect still large but dimming

- **Body**: Locked in place at start of phase 3

### Phase 4: VERY SLOW FADE (5.5-15 seconds) - 9.5 seconds
- Screen wash fades to black over 9.5 seconds
- Glow effect gradually becomes dimmer
- **Neutron star gradually becomes visible** as the glow fades
  - Creates effect of the explosion glow surrounding the new neutron star
  - Slow reveal of the dark pulsing object at the center
- **Body**: Renders normally (white sphere hidden), fading in as glow fades out

## Brightness Levels

```
Phase 1:  0.0 → 0.67  (ramp up)
Phase 2:  0.0          (dark collapse)
Phase 3:  0.5 → 3.0 → 0.9  (peak white at 3.0!)
Phase 4:  1.0 → 0.2   (slow fade over 9.5 seconds)
```

## Screen Wash Calculation

- Phase 3 brightness of 3.0 × 0.35 = 1.05 clamped to 1.0
- **Result**: At peak, screen is 100% white for ~1 second
- Gradually reduces as phase 3 ends
- Completely gone by end of phase 4

## Visual Effect

1. **Dramatic build**: Leading up to explosion
2. **Blinding peak**: Full-screen white wash overwhelms vision
3. **Grand reveal**: Neutron star slowly emerges from the fading glow
4. **Cinematic fade**: Takes ~10 seconds for neutron star to be clearly visible

## Physics Notes

- Particles continue spawning during phase 3 explosion
- Glow radius expands to 1200 pixels at peak
- Everything properly layered: glow → particles → body
