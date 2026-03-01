# Cosmic Simulator

**Live Demo:** https://mvs5465.github.io/cosmic-simulator/

A 2D gravity-based particle system simulator with real-time physics, collision mechanics, and cinematic effects.

## Project Structure

- `sim-core.js` - Shared simulation core used by both the browser runtime and Node tests
- `sim.js` - Browser rendering, textures, UI wiring, and app bootstrap
- `run-tests.js` - Node regression suite for the shared core
- `test.html` / `test.js` - Browser smoke tests for the runtime adapter

## Features

- **N-body Gravity Physics** - Realistic gravitational interactions between all bodies
- **Diverse Celestial Bodies** - Asteroids, planets, gas giants, stars, neutron stars, and black holes
- **Collision & Merging** - Bodies collide with animated merge sequences
- **Supernova Effects** - Stars transitioning to neutron stars create cinematic explosions
- **Dark Matter Visualization** - Invisible attractor visualized as nebula cloud swirl
- **Gas Giant Rings** - Randomized concentric ring systems with per-ring variation
- **Asteroid Shapes** - Irregular polygonal asteroids instead of circles
- **Pulsating Neutron Stars** - Randomized pulsation per star to avoid strobe effects
- **Zoom Controls** - Click to spawn, scroll to zoom, reset view with the sidebar button
- **Particle Pooling** - Optimized particle management for smooth collisions

## Controls

- **Click** - Spawn selected body type
- **Scroll** - Zoom in/out
- **Reset Zoom** - Recenter and reset zoom
- **Pause** - Toggle simulation
- **Clear All** - Remove all bodies
- **Sliders** - Adjust time speed, gravity, and dark matter strength

## Physics

- Angular momentum conservation with realistic moment of inertia
- Elastic collisions with momentum transfer
- Dark matter attractor pulling everything toward center
- Accurate mass-based body type classification

## Testing

- `node run-tests.js` runs the shared-core regression suite
- `test.html` runs lightweight browser smoke tests without auto-booting the full app
