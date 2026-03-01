// ==================== PHYSICS ENGINE ====================

class Body {
    constructor(x, y, vx, vy, mass, radius, color, bodyType = 'planet') {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.mass = mass;
        this.radius = radius;
        this.color = color;
        this.ax = 0;
        this.ay = 0;
        this.bodyType = bodyType; // 'asteroid', 'planet', 'gas-giant', 'star', 'black-hole'
        this.texture = null;
        this.rotationAngle = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.15;
        this.pulseTime = 0; // For neutron star pulsation
        this.supernovaTime = 0; // For tracking supernova effect duration
        this.ringScale = 1.0; // For gas giant ring size variation
        this.ringCount = 3; // Number of rings for this gas giant
        this.ringOpacities = [0.85, 0.85, 0.85]; // Per-ring opacity variation
        this.ringVisible = [true, true, true]; // Per-ring visibility
        this.ringHueShift = 0; // For gas giant ring color variation
        this.ringLightness = 50; // For gas giant ring brightness variation
        this.asteroidVertices = null; // For asteroid shapes

        if (bodyType === 'planet') {
            this.texture = this.generateEarthTexture(radius);
        } else if (bodyType === 'gas-giant') {
            this.texture = this.generateGasGiantTexture(radius);
            // Randomize all ring properties for every gas giant (biased towards fainter)
            this.ringScale = 0.5 + Math.random() * 1.0; // 0.5 to 1.5
            // Random number of rings: 1-5
            this.ringCount = Math.floor(Math.random() * 5) + 1;
            // Randomize opacity per ring independently
            this.ringOpacities = [];
            this.ringVisible = [];
            for (let i = 0; i < this.ringCount; i++) {
                this.ringOpacities.push(0.1 + Math.random() * Math.random() * 0.25);
                this.ringVisible.push(Math.random() < 0.5); // 50% chance each ring is visible
            }
            this.ringHueShift = Math.random() * 40 - 20; // -20 to +20 hue shift
            this.ringLightness = 35 + Math.random() * 20; // 35 to 55 lightness
        } else if (bodyType === 'star') {
            this.texture = this.generateStarTexture(radius, mass);
        } else if (bodyType === 'asteroid') {
            this.texture = this.generateAsteroidTexture(radius);
            // Generate irregular asteroid shape
            this.asteroidVertices = this.generateAsteroidShape(radius);
        } else if (bodyType === 'neutron-star') {
            this.texture = this.generateNeutronStarTexture(radius);
        } else if (bodyType === 'black-hole') {
            this.texture = this.generateBlackHoleTexture(radius);
        }
    }

    generateEarthTexture(radius = this.radius) {
        const size = Math.ceil(radius * 4);
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Water base
        ctx.fillStyle = '#1a5490';
        ctx.fillRect(0, 0, size, size);

        // Generate random continents with Perlin-like noise (simplified)
        for (let i = 0; i < 5; i++) {
            const continentX = Math.random() * size;
            const continentY = Math.random() * size;
            const continentSize = Math.random() * (size * 0.4) + size * 0.15;

            ctx.fillStyle = `hsl(${Math.random() * 40 + 100}, 60%, 35%)`; // Green tones
            ctx.beginPath();
            ctx.ellipse(continentX, continentY, continentSize, continentSize * 0.7, Math.random() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
        }

        // Add some cloud wisps
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        for (let i = 0; i < 3; i++) {
            const cloudX = Math.random() * size;
            const cloudY = Math.random() * size;
            const cloudWidth = Math.random() * size * 0.3 + size * 0.1;

            ctx.beginPath();
            ctx.ellipse(cloudX, cloudY, cloudWidth, cloudWidth * 0.3, Math.random() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
        }

        return canvas;
    }

    generateGasGiantTexture(radius = this.radius) {
        const size = Math.ceil(radius * 4);
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Base color (orange, purple, or blue tones)
        const hue = Math.random() * 60 + 20; // Orange to purple range
        ctx.fillStyle = `hsl(${hue}, 80%, 45%)`;
        ctx.fillRect(0, 0, size, size);

        // Band patterns
        for (let i = 0; i < 5; i++) {
            const bandY = (i / 5) * size;
            const bandHeight = size / 6;
            ctx.fillStyle = `hsl(${hue + (i % 2) * 20}, 70%, ${40 + (i % 3) * 5}%)`;
            ctx.fillRect(0, bandY, size, bandHeight);

            // Wavy distortion on bands
            ctx.fillStyle = `hsl(${hue + 10}, 60%, 35%)`;
            for (let x = 0; x < size; x += 20) {
                const waveY = bandY + Math.sin(x * 0.05 + i) * 5;
                ctx.fillRect(x, waveY, 20, 3);
            }
        }

        return canvas;
    }

    generateStarTexture(radius = this.radius, mass = this.mass) {
        const size = Math.ceil(radius * 4);
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Color based on mass: red (just above gas giant) to blue (just below black hole)
        // Range: 60 (gas giant threshold) to 1500 (black hole threshold)
        const massRange = 1500 - 60;
        const massFraction = Math.max(0, Math.min((mass - 60) / massRange, 1)); // 0 to 1

        // Smooth color sequence: red → orange → yellow → white → blue
        let red, green, blue;

        if (massFraction < 0.25) {
            // Red to orange (0 to 0.25)
            const t = massFraction / 0.25;
            red = 255;
            green = Math.round(100 * t);
            blue = 0;
        } else if (massFraction < 0.5) {
            // Orange to yellow (0.25 to 0.5)
            const t = (massFraction - 0.25) / 0.25;
            red = 255;
            green = Math.round(100 + 155 * t);
            blue = 0;
        } else if (massFraction < 0.75) {
            // Yellow to white (0.5 to 0.75)
            const t = (massFraction - 0.5) / 0.25;
            red = 255;
            green = 255;
            blue = Math.round(0 + 255 * t);
        } else {
            // White to blue (0.75 to 1)
            const t = (massFraction - 0.75) / 0.25;
            red = Math.round(255 * (1 - t * 0.8));
            green = Math.round(255 * (1 - t * 0.6));
            blue = 255;
        }

        const centerColor = `rgb(${red}, ${green}, ${blue})`;
        const outerColor = `rgb(${Math.round(red * 0.6)}, ${Math.round(green * 0.6)}, ${Math.round(blue * 0.6)})`;

        // Radial gradient with mass-dependent color
        const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.5, centerColor);
        gradient.addColorStop(1, outerColor);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        // Add some flare/bright spots
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        for (let i = 0; i < 3; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const flareSize = Math.random() * 5 + 2;
            ctx.beginPath();
            ctx.arc(x, y, flareSize, 0, Math.PI * 2);
            ctx.fill();
        }

        return canvas;
    }

    generateAsteroidTexture(radius = this.radius) {
        const size = Math.ceil(radius * 4);
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Gray base
        ctx.fillStyle = '#999999';
        ctx.fillRect(0, 0, size, size);

        // Add craters (deterministic based on position)
        ctx.fillStyle = '#666666';
        for (let i = 0; i < 2; i++) {
            const craterX = (size * 0.3) + (i * size * 0.4);
            const craterY = size * 0.5;
            const craterSize = size * 0.15;
            ctx.beginPath();
            ctx.arc(craterX, craterY, craterSize, 0, Math.PI * 2);
            ctx.fill();
        }

        return canvas;
    }

    generateAsteroidShape(radius = this.radius) {
        // Generate an irregular polygon for asteroid shape
        const numVertices = Math.floor(Math.random() * 4) + 6; // 6-9 vertices
        const vertices = [];

        for (let i = 0; i < numVertices; i++) {
            const angle = (i / numVertices) * Math.PI * 2;
            // Randomize radius at each vertex for irregular shape
            const randomRadius = radius * (0.7 + Math.random() * 0.6); // 0.7 to 1.3x radius
            const x = Math.cos(angle) * randomRadius;
            const y = Math.sin(angle) * randomRadius;
            vertices.push({ x, y });
        }

        return vertices;
    }

    generateNeutronStarTexture(radius = this.radius) {
        const size = Math.ceil(radius * 4);
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Neutron star: ultra-dense compact object with intense magnetic field effect
        const centerX = size / 2;
        const centerY = size / 2;

        // Dark background
        ctx.fillStyle = '#001a33';
        ctx.fillRect(0, 0, size, size);

        // Super bright white-hot core (ultra-compressed matter)
        const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, size * 0.45);
        coreGradient.addColorStop(0, '#ffffff');
        coreGradient.addColorStop(0.15, '#ffeecc');
        coreGradient.addColorStop(0.4, '#64d9ff');
        coreGradient.addColorStop(1, '#003366');
        ctx.fillStyle = coreGradient;
        ctx.fillRect(0, 0, size, size);

        // Magnetic field lines radiating from surface
        ctx.strokeStyle = 'rgba(100, 220, 255, 0.4)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const startX = centerX + Math.cos(angle) * (size * 0.25);
            const startY = centerY + Math.sin(angle) * (size * 0.25);
            const endX = centerX + Math.cos(angle) * (size * 0.45);
            const endY = centerY + Math.sin(angle) * (size * 0.45);
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }

        return canvas;
    }

    generateBlackHoleTexture(radius = this.radius) {
        // Cap texture size to prevent lag on large black holes
        const maxSize = 128;
        const uncappedSize = Math.ceil(radius * 4);
        const size = Math.min(maxSize, uncappedSize);
        if (uncappedSize > maxSize) {
            console.log(`[TEXTURE] Black hole texture capped: ${uncappedSize} → ${size}`);
        }
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Black hole: dark center, empty space, then fiery accretion donut
        const centerX = size / 2;
        const centerY = size / 2;

        // Inner radius of disk, outer radius of disk
        const innerDiskRadius = size * 0.25; // Empty space inside the donut
        const outerDiskRadius = size * 0.5;  // Outer edge of disk

        // Draw the accretion disk as a ring using a clipping path
        ctx.save();

        // Create a ring-shaped clipping region
        ctx.beginPath();
        ctx.arc(centerX, centerY, outerDiskRadius, 0, Math.PI * 2); // Outer circle
        ctx.arc(centerX, centerY, innerDiskRadius, 0, Math.PI * 2, true); // Inner circle (hole)
        ctx.clip();

        // Now draw the disk gradient (it will only appear in the ring)
        const diskGradient = ctx.createRadialGradient(centerX, centerY, innerDiskRadius, centerX, centerY, outerDiskRadius);
        diskGradient.addColorStop(0, 'rgba(255, 200, 100, 0.9)'); // Bright inner edge of disk
        diskGradient.addColorStop(0.3, 'rgba(255, 150, 80, 0.8)');
        diskGradient.addColorStop(0.6, 'rgba(255, 100, 50, 0.5)');
        diskGradient.addColorStop(1, 'rgba(200, 50, 0, 0)'); // Fade to transparent at outer edge

        ctx.fillStyle = diskGradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, outerDiskRadius, 0, Math.PI * 2);
        ctx.fill();

        // Add turbulent texture with noise/flare patterns on the disk only (reduced from 20 to 8)
        const flareCount = Math.max(4, Math.ceil(size / 16)); // Scale flare count with texture size, min 4
        for (let i = 0; i < flareCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = size * (0.25 + Math.random() * 0.25); // Only in the disk zone
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;

            // Bright flares
            const flareSize = size * (0.02 + Math.random() * 0.04);
            const flareGradient = ctx.createRadialGradient(x, y, 0, x, y, flareSize);
            flareGradient.addColorStop(0, 'rgba(255, 255, 200, 0.8)');
            flareGradient.addColorStop(1, 'rgba(255, 150, 50, 0)');
            ctx.fillStyle = flareGradient;
            ctx.beginPath();
            ctx.arc(x, y, flareSize, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        // Black inner core (event horizon)
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(centerX, centerY, size * 0.12, 0, Math.PI * 2);
        ctx.fill();

        // Subtle event horizon border (faint white glow)
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centerX, centerY, size * 0.12, 0, Math.PI * 2);
        ctx.stroke();

        return canvas;
    }

    applyForce(fx, fy) {
        this.ax += fx / this.mass;
        this.ay += fy / this.mass;
    }

    update(dt) {
        this.vx += this.ax * dt;
        this.vy += this.ay * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.ax = 0;
        this.ay = 0;

        // Rotate all bodies
        this.rotationAngle += this.rotationSpeed;

        // Update pulsation time for neutron stars
        this.pulseTime += dt;
    }
}

class Particle {
    constructor(x, y, vx, vy, lifetime) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.lifetime = lifetime;
        this.maxLifetime = lifetime;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.lifetime -= dt;
    }

    getAlpha() {
        return Math.max(0, this.lifetime / this.maxLifetime);
    }
}

// ==================== PARTICLE POOL ====================
// Reuse particle objects instead of creating/destroying them

class ParticlePool {
    constructor(initialSize = 500) {
        this.available = [];
        this.active = [];

        // Pre-allocate particles
        for (let i = 0; i < initialSize; i++) {
            this.available.push(new Particle(0, 0, 0, 0, 0));
        }
    }

    acquire(x, y, vx, vy, lifetime) {
        let particle;

        if (this.available.length > 0) {
            // Reuse from pool
            particle = this.available.pop();
            particle.x = x;
            particle.y = y;
            particle.vx = vx;
            particle.vy = vy;
            particle.lifetime = lifetime;
            particle.maxLifetime = lifetime;
        } else {
            // Pool exhausted, create new (shouldn't happen with good sizing)
            particle = new Particle(x, y, vx, vy, lifetime);
        }

        this.active.push(particle);
        return particle;
    }

    update(dt) {
        // Update all active particles and move dead ones back to pool
        for (let i = this.active.length - 1; i >= 0; i--) {
            const particle = this.active[i];
            particle.update(dt);

            if (particle.lifetime <= 0) {
                // Move back to available pool
                this.active.splice(i, 1);
                this.available.push(particle);
            }
        }
    }

    getActive() {
        return this.active;
    }

    clear() {
        this.available.push(...this.active);
        this.active = [];
    }
}

class SupernovaEffect {
    constructor(x, y, body = null, duration = 15.0) {
        this.x = x;
        this.y = y;
        this.body = body;
        this.time = 0;
        this.duration = duration;
        this.explosionX = x;  // Explosion stays at initial location
        this.explosionY = y;
        this.explosionLocked = false;

        // Phase timings
        this.phase1Duration = 2.0;  // Bright leadup
        this.phase2Duration = 0.5;  // Silent collapse
        this.phase3Start = this.phase1Duration + this.phase2Duration;
        this.phase3Duration = 3.0;  // Giant explosion with peak white (1s blinding white)
        this.phase4Duration = this.duration - this.phase3Start - this.phase3Duration; // Very slow fade (9s)

        // Mark body as in supernova
        if (this.body) {
            this.body.supernovaTime = this.duration;
        }
    }

    update(dt) {
        this.time += dt;

        // Follow the star during phases 1-3, freeze during explosion and fade
        if (this.body && this.time < this.phase3Start) {
            this.x = this.body.x;
            this.y = this.body.y;
        } else if (!this.explosionLocked) {
            // Lock explosion position at start of phase 3
            this.explosionLocked = true;
            this.explosionX = this.x;
            this.explosionY = this.y;
        }
    }

    getProperties() {
        const t = this.time;

        if (t < this.phase1Duration) {
            // Phase 1: Bright leadup (pulsing glow)
            const phase = t / this.phase1Duration;
            return {
                radius: 50 * phase,
                brightness: 0.8 * phase,
                color: 'rgba(255, 200, 100, ',
                particles: 0,
                showWhiteSphere: true,
                phase: 1
            };
        } else if (t < this.phase1Duration + this.phase2Duration) {
            // Phase 2: Silent collapse (dark)
            return {
                radius: 50 * 0.8,
                brightness: 0,
                color: 'rgba(0, 0, 0, ',
                particles: 0,
                showWhiteSphere: true,
                phase: 2
            };
        } else if (t < this.phase3Start + this.phase3Duration) {
            // Phase 3: Giant explosion with blinding white peak
            const phase = (t - this.phase3Start) / this.phase3Duration;

            // Peak white for middle 1 second (roughly phase 0.33-0.66)
            let brightness;
            if (phase < 0.33) {
                // Ramp up to peak white
                brightness = 0.5 + (phase / 0.33) * 2.5; // 0.5 → 3.0
            } else if (phase < 0.66) {
                // Hold at blinding white
                brightness = 3.0;
            } else {
                // Fade from peak
                brightness = 3.0 * (1 - (phase - 0.66) / 0.34);
            }

            return {
                radius: Math.min(1200, 100 + 1100 * phase),
                brightness: brightness,
                color: 'rgba(255, 255, 255, ',
                particles: Math.floor(150 * (1 - phase)),
                showWhiteSphere: true,
                phase: 3
            };
        } else {
            // Phase 4: Very slow fade (9 seconds) - neutron star gradually appears
            const phase = (t - (this.phase3Start + this.phase3Duration)) / this.phase4Duration;
            // Fade brightness from 1.0 to 0.0, revealing neutron star underneath
            const brightness = Math.max(0, 1.0 - phase * 0.8);
            return {
                radius: 1200,
                brightness: brightness,
                color: 'rgba(255, 150, 100, ',
                particles: 0,
                showWhiteSphere: false,
                phase: 4
            };
        }
    }

    isDone() {
        return this.time >= this.duration;
    }
}

class MergeEffect {
    constructor(body1, body2, mergedBody, duration = 1.0) {
        this.body1 = body1;
        this.body2 = body2;
        this.mergedBody = mergedBody;
        this.time = 0;
        this.duration = duration;

        // Store initial positions for interpolation
        this.body1StartX = body1.x;
        this.body1StartY = body1.y;
        this.body2StartX = body2.x;
        this.body2StartY = body2.y;

        // Merged body spawn position
        this.mergeX = mergedBody.x;
        this.mergeY = mergedBody.y;

        // Mark bodies as merging (skip physics)
        this.body1.isMerging = true;
        this.body2.isMerging = true;
    }

    update(dt) {
        this.time += dt;

        // Animation phase (0 to 1)
        const phase = Math.min(1, this.time / this.duration);

        // Move bodies toward merge point (easing: ease-in)
        const easePhase = phase * phase; // Quadratic ease-in
        this.body1.x = this.body1StartX + (this.mergeX - this.body1StartX) * easePhase;
        this.body1.y = this.body1StartY + (this.mergeY - this.body1StartY) * easePhase;
        this.body2.x = this.body2StartX + (this.mergeX - this.body2StartX) * easePhase;
        this.body2.y = this.body2StartY + (this.mergeY - this.body2StartY) * easePhase;

        // Scale down bodies as they merge
        this.body1.mergeScale = 1 - easePhase;
        this.body2.mergeScale = 1 - easePhase;

        // Fade bodies out
        this.body1.mergeAlpha = 1 - easePhase;
        this.body2.mergeAlpha = 1 - easePhase;

        // Scale merged body in from center
        this.mergedBody.mergeScale = easePhase;
        this.mergedBody.mergeAlpha = easePhase;
    }

    isDone() {
        return this.time >= this.duration;
    }

    finish() {
        // Clean up
        this.body1.isMerging = false;
        this.body2.isMerging = false;
        this.mergedBody.mergeScale = 1;
        this.mergedBody.mergeAlpha = 1;
    }
}

class Simulator {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.bodies = [];
        this.particlePool = new ParticlePool(1000); // Pre-allocate 1000 particles
        this.supernovaEffects = [];
        this.mergeEffects = [];
        this.running = true;
        this.gravityConstant = 2;
        this.timeScale = 2; // Speed up by default
        this.lastTime = Date.now();
        this.frameCount = 0;
        this.fps = 60;
        this.cameraX = 0; // Will be set properly after canvas resize
        this.cameraY = 0;
        this.zoom = 1;

        // Dark matter attractor at origin (invisible)
        this.darkMatterX = 0;
        this.darkMatterY = 0;
        this.darkMatterMass = 50; // Strong, hidden influence
        this.darkMatterStrength = 1.5; // Multiplier for the attractor force

        // Mass thresholds for body types (global unified system)
        this.massThresholds = {
            asteroid: 5,
            planet: 20,
            gasGiant: 60,
            star: 150,
            neutronStar: 1500,
            blackHole: 3000,
        };

        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        this.setupInputControls();
    }

    getBodyType(mass) {
        if (mass < this.massThresholds.asteroid) return 'debris';
        if (mass < this.massThresholds.planet) return 'asteroid';
        if (mass < this.massThresholds.gasGiant) return 'planet';
        if (mass < this.massThresholds.star) return 'gas-giant';
        if (mass < this.massThresholds.neutronStar) return 'star';
        if (mass < this.massThresholds.blackHole) return 'neutron-star';
        return 'black-hole';
    }

    getRadiusFromMass(mass) {
        // Black holes are special: very small despite massive weight
        if (mass >= this.massThresholds.blackHole) {
            return Math.cbrt(mass) * 0.8; // Compact but visibly impressive
        }
        // Neutron stars are also special: small but not as small as black holes
        if (mass >= this.massThresholds.neutronStar) {
            return Math.cbrt(mass) * 0.6; // Small radius for neutron stars
        }
        // Universal formula for other bodies: radius = cbrt(mass) * scale
        return Math.cbrt(mass) * 2;
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth - 250;
        this.canvas.height = window.innerHeight;
        // Center camera on origin (0,0) - the camera position is the TOP-LEFT corner of the view
        // So to center view on (0,0), we need to show from -width/2 to +width/2
        this.cameraX = -this.canvas.width / (2 * this.zoom);
        this.cameraY = -this.canvas.height / (2 * this.zoom);
    }

    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;

        // Convert screen coords to world coords
        const worldX = (canvasX / this.zoom) + this.cameraX;
        const worldY = (canvasY / this.zoom) + this.cameraY;

        // Spawn based on dropdown selection
        const spawnType = document.getElementById('spawn-type').value;
        switch (spawnType) {
            case 'random':
                this.spawnPlanet(worldX, worldY, Math.random() * 140 + 5);
                break;
            case 'asteroid':
                this.spawnPlanet(worldX, worldY, Math.random() * 15 + 5);
                break;
            case 'planet':
                this.spawnPlanet(worldX, worldY, Math.random() * 40 + 20);
                break;
            case 'gas-giant':
                this.spawnPlanet(worldX, worldY, Math.random() * 90 + 60);
                break;
            case 'star':
                this.spawnPlanet(worldX, worldY, Math.random() * 1350 + 150);
                break;
            case 'neutron-star':
                this.spawnPlanet(worldX, worldY, Math.random() * 1500 + 1500);
                break;
            case 'black-hole':
                this.spawnPlanet(worldX, worldY, Math.random() * 3000 + 3000);
                break;
        }
    }

    setupInputControls() {
        let isPanning = false;
        let panStartX = 0;
        let panStartY = 0;

        this.canvas.addEventListener('mousedown', (e) => {
            isPanning = true;
            panStartX = e.clientX;
            panStartY = e.clientY;
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (isPanning) {
                const deltaX = e.clientX - panStartX;
                const deltaY = e.clientY - panStartY;
                this.cameraX -= deltaX / this.zoom;
                this.cameraY -= deltaY / this.zoom;
                panStartX = e.clientX;
                panStartY = e.clientY;
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            isPanning = false;
        });

        // Scroll wheel zoom
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            this.zoom *= zoomFactor;
            this.zoom = Math.max(0.1, Math.min(this.zoom, 10)); // Clamp zoom 0.1 to 10
        });

        // Click to spawn (use regular click event on canvas)
        this.canvas.addEventListener('click', (e) => {
            this.handleClick(e);
        });
    }

    spawnPlanet(x, y, mass = null) {
        if (mass === null) {
            mass = Math.random() * 145 + 5; // Asteroids to stars: 5-150
        }
        const radius = this.getRadiusFromMass(mass);
        const bodyType = this.getBodyType(mass);

        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 15 + 5; // Random momentum 5-20
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        const body = new Body(x, y, vx, vy, mass, radius, '#ffffff', bodyType);
        this.bodies.push(body);
    }

    spawnBlackHole(x, y) {
        const mass = Math.random() * 150 + 100; // Big random margin: 100-250
        const radius = this.getRadiusFromMass(mass);
        const bodyType = this.getBodyType(mass);

        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 15 + 5;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        const body = new Body(x, y, vx, vy, mass, radius, '#ffffff', bodyType);
        this.bodies.push(body);
    }

    spawnRandomCluster(x, y, count = 5) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 100 + 50;
            const px = x + Math.cos(angle) * distance;
            const py = y + Math.sin(angle) * distance;
            const vx = Math.random() * 200 - 100;
            const vy = Math.random() * 200 - 100;
            const mass = Math.random() * 145 + 5; // Asteroids to stars: 5-150
            const radius = this.getRadiusFromMass(mass);
            const bodyType = this.getBodyType(mass);

            const body = new Body(px, py, vx, vy, mass, radius, '#ffffff', bodyType);
            this.bodies.push(body);
        }
    }

    update(dt) {
        if (!this.running) return;

        dt *= this.timeScale;

        // Calculate gravitational forces between bodies
        for (let i = 0; i < this.bodies.length; i++) {
            for (let j = i + 1; j < this.bodies.length; j++) {
                const b1 = this.bodies[i];
                const b2 = this.bodies[j];

                const dx = b2.x - b1.x;
                const dy = b2.y - b1.y;
                const distSq = dx * dx + dy * dy + 100; // Add small epsilon to avoid singularities
                const dist = Math.sqrt(distSq);

                const force = (this.gravityConstant * b1.mass * b2.mass) / distSq;
                const fx = (force * dx) / dist;
                const fy = (force * dy) / dist;

                b1.applyForce(fx, fy);
                b2.applyForce(-fx, -fy);
            }
        }

        // Dark matter attractor pulls everything toward center (invisible force)
        for (const body of this.bodies) {
            // Skip physics for bodies that are merging
            if (body.isMerging) continue;

            const dx = this.darkMatterX - body.x;
            const dy = this.darkMatterY - body.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < 1) continue; // Skip if already at center

            const dist = Math.sqrt(distSq);
            // Pull toward center with strength proportional to distance
            const accelMagnitude = this.darkMatterStrength;
            const ax = (accelMagnitude * dx) / dist;
            const ay = (accelMagnitude * dy) / dist;

            body.applyForce(ax * body.mass, ay * body.mass);
        }

        // Update positions
        for (const body of this.bodies) {
            // Skip physics for bodies that are merging (they're controlled by MergeEffect)
            if (body.isMerging) continue;
            body.update(dt);
        }

        // Handle collisions
        this.handleCollisions();

        // Update particles using pool
        this.particlePool.update(dt);

        // Update supernova effects
        for (let i = this.supernovaEffects.length - 1; i >= 0; i--) {
            this.supernovaEffects[i].update(dt);
            if (this.supernovaEffects[i].isDone()) {
                // Reset the body's supernova flag so it renders again as a neutron star
                if (this.supernovaEffects[i].body) {
                    console.log(`[SUPERNOVA END] Revealing neutron star: type=${this.supernovaEffects[i].body.bodyType}, mass=${this.supernovaEffects[i].body.mass.toFixed(1)}`);
                    this.supernovaEffects[i].body.supernovaTime = 0;
                }
                this.supernovaEffects.splice(i, 1);
            }
        }

        // Update merge effects
        for (let i = this.mergeEffects.length - 1; i >= 0; i--) {
            this.mergeEffects[i].update(dt);
            if (this.mergeEffects[i].isDone()) {
                const effect = this.mergeEffects[i];
                effect.finish();
                // Remove the original bodies from the array
                this.bodies = this.bodies.filter(b => b !== effect.body1 && b !== effect.body2);
                this.mergeEffects.splice(i, 1);
            }
        }

        // Remove bodies that go too far off-screen (performance optimization)
        this.bodies = this.bodies.filter(b => {
            const distance = Math.sqrt(b.x * b.x + b.y * b.y);
            return distance < 10000;
        });
    }

    handleCollisions() {
        // Mark which bodies have already merged this frame to prevent cascading
        const mergedThisFrame = new Set();

        for (let i = 0; i < this.bodies.length; i++) {
            // Skip if this body was already merged into another body
            if (mergedThisFrame.has(i)) continue;

            for (let j = i + 1; j < this.bodies.length; j++) {
                // Skip if either body was already merged
                if (mergedThisFrame.has(i) || mergedThisFrame.has(j)) continue;

                const b1 = this.bodies[i];
                const b2 = this.bodies[j];

                const dx = b2.x - b1.x;
                const dy = b2.y - b1.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // For black holes, use event horizon radius (12% of visual radius)
                const r1 = b1.bodyType === 'black-hole' ? b1.radius * 0.12 : b1.radius;
                const r2 = b2.bodyType === 'black-hole' ? b2.radius * 0.12 : b2.radius;
                const minDist = r1 + r2;

                if (dist < minDist) {
                    // Start merge animation instead of immediately merging
                    const totalMass = b1.mass + b2.mass;
                    const newVx = (b1.vx * b1.mass + b2.vx * b2.mass) / totalMass;
                    const newVy = (b1.vy * b1.mass + b2.vy * b2.mass) / totalMass;
                    const newX = (b1.x * b1.mass + b2.x * b2.mass) / totalMass;
                    const newY = (b1.y * b1.mass + b2.y * b2.mass) / totalMass;

                    // New radius using unified formula
                    const newRadius = this.getRadiusFromMass(totalMass);
                    const newBodyType = this.getBodyType(totalMass);
                    const oldBodyType = b1.bodyType; // Save old type before updating

                    // Conserve angular momentum (real calculation)
                    const I1 = (2/5) * b1.mass * b1.radius * b1.radius;
                    const I2 = (2/5) * b2.mass * b2.radius * b2.radius;
                    const L1 = I1 * b1.rotationSpeed;
                    const L2 = I2 * b2.rotationSpeed;
                    const L_total = L1 + L2;

                    const I_new = (2/5) * totalMass * newRadius * newRadius;
                    const newRotationSpeed = I_new > 0 ? L_total / I_new : 0;

                    // Create new merged body (not added to bodies array yet)
                    const mergedBody = new Body(newX, newY, newVx, newVy, totalMass, newRadius, '#fff', newBodyType);
                    mergedBody.rotationSpeed = newRotationSpeed;
                    mergedBody.mergeScale = 0;
                    mergedBody.mergeAlpha = 0;

                    // Generate texture for merged body based on type
                    if (newBodyType === 'planet') {
                        mergedBody.texture = mergedBody.generateEarthTexture(newRadius);
                    } else if (newBodyType === 'gas-giant') {
                        mergedBody.texture = mergedBody.generateGasGiantTexture(newRadius);
                        // Randomize all ring properties for merged gas giant (biased towards fainter)
                        mergedBody.ringScale = 0.5 + Math.random() * 1.0; // 0.5 to 1.5
                        // Random number of rings: 1-5
                        mergedBody.ringCount = Math.floor(Math.random() * 5) + 1;
                        // Randomize opacity per ring independently
                        mergedBody.ringOpacities = [];
                        mergedBody.ringVisible = [];
                        for (let i = 0; i < mergedBody.ringCount; i++) {
                            mergedBody.ringOpacities.push(0.1 + Math.random() * Math.random() * 0.25);
                            mergedBody.ringVisible.push(Math.random() < 0.5); // 50% chance each ring is visible
                        }
                        mergedBody.ringHueShift = Math.random() * 40 - 20; // -20 to +20 hue shift
                        mergedBody.ringLightness = 35 + Math.random() * 20; // 35 to 55 lightness
                    } else if (newBodyType === 'star') {
                        mergedBody.texture = mergedBody.generateStarTexture(newRadius, totalMass);
                    } else if (newBodyType === 'asteroid') {
                        mergedBody.texture = mergedBody.generateAsteroidTexture(newRadius);
                        // Generate irregular shape for merged asteroid
                        mergedBody.asteroidVertices = mergedBody.generateAsteroidShape(newRadius);
                    } else if (newBodyType === 'neutron-star') {
                        mergedBody.texture = mergedBody.generateNeutronStarTexture(newRadius);
                    } else if (newBodyType === 'black-hole') {
                        console.log(`[BLACK HOLE] Merged BH: mass=${totalMass.toFixed(0)}, radius=${newRadius.toFixed(2)}`);
                        mergedBody.texture = mergedBody.generateBlackHoleTexture(newRadius);
                    }

                    // Add merged body to bodies array
                    this.bodies.push(mergedBody);

                    // Create merge animation effect
                    const mergeDuration = newBodyType === 'black-hole' ? 0.25 : 0.5; // 2x faster merge, BH still faster
                    this.mergeEffects.push(new MergeEffect(b1, b2, mergedBody, mergeDuration));

                    // Create collision explosion (except for black holes)
                    if (newBodyType !== 'black-hole') {
                        const explosionIntensity = Math.min(2.0, totalMass / 50); // Scale intensity by mass
                        this.createExplosion(newX, newY, totalMass, explosionIntensity);
                    }

                    // Trigger supernova if star becomes neutron star
                    if (newBodyType === 'neutron-star' && oldBodyType === 'star') {
                        this.createSupernovaWithBody(newX, newY, newRadius, mergedBody);
                    }

                    // Mark both bodies as merged so they won't collide again
                    mergedThisFrame.add(i);
                    mergedThisFrame.add(j);
                }
            }
        }

        // Remove all bodies that were merged (in reverse order to maintain indices)
        for (let i = this.bodies.length - 1; i >= 0; i--) {
            if (mergedThisFrame.has(i)) {
                this.bodies.splice(i, 1);
            }
        }
    }

    draw() {
        // Black background
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw dark matter effect FIRST (lowest layer, behind everything)
        this.drawDarkMatterEffect();

        // Draw starfield background
        this.drawStarfield();

        // Draw grid (optional)
        this.drawGrid();

        // Draw bodies (before supernova so it renders on top)
        // Note: regular bodies drawn here, then supernova effects on top
        let drawCount = 0;
        for (const body of this.bodies) {
            // Skip bodies in supernova ONLY if they're showing the white sphere
            // (during phase 4, we want to show the neutron star behind the fading effect)
            let shouldSkip = false;
            if (body.supernovaTime > 0) {
                // Check if there's an active supernova effect for this body that's showing white sphere
                const activeEffect = this.supernovaEffects.find(e => e.body === body);
                if (activeEffect) {
                    const props = activeEffect.getProperties();
                    shouldSkip = props.showWhiteSphere;
                } else {
                    shouldSkip = true;
                }
            }

            if (shouldSkip) {
                continue;
            }

            const screenX = (body.x - this.cameraX) * this.zoom;
            const screenY = (body.y - this.cameraY) * this.zoom;
            let screenRadius = Math.max(body.radius * this.zoom, 1);

            // Apply merge animation scaling
            const mergeScale = body.mergeScale !== undefined ? body.mergeScale : 1;
            const mergeAlpha = body.mergeAlpha !== undefined ? body.mergeAlpha : 1;
            screenRadius *= mergeScale;

            // Safety check: skip if body has invalid properties
            if (!isFinite(body.x) || !isFinite(body.y) || !isFinite(screenRadius)) {
                continue;
            }

            // Skip if off-screen (with merge scale considered)
            if (screenRadius > 0.5 && (screenX < -50 || screenX > this.canvas.width + 50 ||
                screenY < -50 || screenY > this.canvas.height + 50)) {
                continue;
            }

            drawCount++;

            // Apply merge alpha to entire body drawing
            if (mergeAlpha < 1) {
                this.ctx.globalAlpha = mergeAlpha;
            }

            // Draw based on body type
            if (body.bodyType === 'debris') {
                // Tiny dust particles - always visible with minimum size
                this.ctx.fillStyle = '#cccccc';
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, Math.max(screenRadius, 1.5), 0, Math.PI * 2);
                this.ctx.fill();
            } else if (body.bodyType === 'asteroid') {
                // Asteroids with irregular shapes
                this.ctx.save();
                this.ctx.translate(screenX, screenY);
                this.ctx.rotate(body.rotationAngle);

                if (body.asteroidVertices && body.asteroidVertices.length > 0) {
                    // Draw irregular polygon shape
                    const scaleFactor = screenRadius / body.radius;

                    this.ctx.fillStyle = '#999999';
                    this.ctx.beginPath();
                    const firstVertex = body.asteroidVertices[0];
                    this.ctx.moveTo(firstVertex.x * scaleFactor, firstVertex.y * scaleFactor);

                    for (let i = 1; i < body.asteroidVertices.length; i++) {
                        const vertex = body.asteroidVertices[i];
                        this.ctx.lineTo(vertex.x * scaleFactor, vertex.y * scaleFactor);
                    }
                    this.ctx.closePath();
                    this.ctx.fill();

                    // Draw craters on top
                    this.ctx.fillStyle = '#666666';
                    for (let i = 0; i < 2; i++) {
                        const angle = Math.random() * Math.PI * 2;
                        const distance = screenRadius * (0.4 + Math.random() * 0.3);
                        const craterX = Math.cos(angle) * distance;
                        const craterY = Math.sin(angle) * distance;
                        const craterSize = screenRadius * (0.1 + Math.random() * 0.1);
                        this.ctx.beginPath();
                        this.ctx.arc(craterX, craterY, craterSize, 0, Math.PI * 2);
                        this.ctx.fill();
                    }
                } else if (body.texture) {
                    // Fallback to textured circle
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, screenRadius, 0, Math.PI * 2);
                    this.ctx.clip();
                    this.ctx.drawImage(body.texture, -screenRadius, -screenRadius, screenRadius * 2, screenRadius * 2);
                } else {
                    // Fallback circle
                    this.ctx.fillStyle = '#999999';
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, screenRadius, 0, Math.PI * 2);
                    this.ctx.fill();
                }

                this.ctx.restore();
            } else if (body.bodyType === 'star') {
                // Calculate star color based on mass (same as texture)
                const massRange = 1500 - 60;
                const massFraction = Math.max(0, Math.min((body.mass - 60) / massRange, 1));

                let starRed, starGreen, starBlue;
                if (massFraction < 0.25) {
                    const t = massFraction / 0.25;
                    starRed = 255;
                    starGreen = Math.round(100 * t);
                    starBlue = 0;
                } else if (massFraction < 0.5) {
                    const t = (massFraction - 0.25) / 0.25;
                    starRed = 255;
                    starGreen = Math.round(100 + 155 * t);
                    starBlue = 0;
                } else if (massFraction < 0.75) {
                    const t = (massFraction - 0.5) / 0.25;
                    starRed = 255;
                    starGreen = 255;
                    starBlue = Math.round(0 + 255 * t);
                } else {
                    const t = (massFraction - 0.75) / 0.25;
                    starRed = Math.round(255 * (1 - t * 0.8));
                    starGreen = Math.round(255 * (1 - t * 0.6));
                    starBlue = 255;
                }

                // Glow brightness and size increase toward blue (higher mass)
                const glowBrightness = 0.2 + massFraction * 0.6;
                const glowRadius = 1.8 + massFraction * 1.2; // Glow expands from 1.8x to 3.0x

                // Draw outer glow with star color - steeper gradient
                const glowGradient = this.ctx.createRadialGradient(screenX, screenY, screenRadius, screenX, screenY, screenRadius * glowRadius);
                glowGradient.addColorStop(0, `rgba(${starRed}, ${starGreen}, ${starBlue}, ${glowBrightness})`);
                glowGradient.addColorStop(0.5, `rgba(${starRed}, ${starGreen}, ${starBlue}, ${glowBrightness * 0.3})`);
                glowGradient.addColorStop(1, `rgba(${starRed}, ${starGreen}, ${starBlue}, 0)`);
                this.ctx.fillStyle = glowGradient;
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, screenRadius * glowRadius, 0, Math.PI * 2);
                this.ctx.fill();

                // Draw the star itself
                if (body.texture) {
                    this.ctx.save();
                    this.ctx.translate(screenX, screenY);
                    this.ctx.rotate(body.rotationAngle);

                    // Clip to circle
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, screenRadius, 0, Math.PI * 2);
                    this.ctx.clip();

                    this.ctx.drawImage(body.texture, -screenRadius, -screenRadius, screenRadius * 2, screenRadius * 2);
                    this.ctx.restore();
                } else {
                    this.ctx.fillStyle = `rgb(${starRed}, ${starGreen}, ${starBlue})`;
                    this.ctx.beginPath();
                    this.ctx.arc(screenX, screenY, screenRadius, 0, Math.PI * 2);
                    this.ctx.fill();
                }

                // Draw highlight shine with increasing brightness
                const shineBrightness = 0.2 + massFraction * 0.3;
                const shineGradient = this.ctx.createRadialGradient(screenX - screenRadius * 0.3, screenY - screenRadius * 0.3, 0, screenX, screenY, screenRadius);
                shineGradient.addColorStop(0, `rgba(255, 255, 255, ${shineBrightness})`);
                shineGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                this.ctx.fillStyle = shineGradient;
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, screenRadius, 0, Math.PI * 2);
                this.ctx.fill();
            } else if (body.bodyType === 'gas-giant') {
                // Gas giants with glow effect
                // Draw outer glow - steeper gradient
                const ggGlowGradient = this.ctx.createRadialGradient(screenX, screenY, screenRadius, screenX, screenY, screenRadius * 1.6);
                ggGlowGradient.addColorStop(0, 'rgba(200, 150, 100, 0.2)');
                ggGlowGradient.addColorStop(0.5, 'rgba(200, 100, 50, 0.05)');
                ggGlowGradient.addColorStop(1, 'rgba(200, 100, 50, 0)');
                this.ctx.fillStyle = ggGlowGradient;
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, screenRadius * 1.6, 0, Math.PI * 2);
                this.ctx.fill();

                // Draw the gas giant itself
                if (body.texture) {
                    this.ctx.save();
                    this.ctx.translate(screenX, screenY);
                    this.ctx.rotate(body.rotationAngle);

                    // Clip to circle
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, screenRadius, 0, Math.PI * 2);
                    this.ctx.clip();

                    this.ctx.drawImage(body.texture, -screenRadius, -screenRadius, screenRadius * 2, screenRadius * 2);
                    this.ctx.restore();
                } else {
                    this.ctx.fillStyle = '#ff9999';
                    this.ctx.beginPath();
                    this.ctx.arc(screenX, screenY, screenRadius, 0, Math.PI * 2);
                    this.ctx.fill();
                }

                // Draw highlight shine
                const ggShineGradient = this.ctx.createRadialGradient(screenX - screenRadius * 0.3, screenY - screenRadius * 0.3, 0, screenX, screenY, screenRadius);
                ggShineGradient.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
                ggShineGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                this.ctx.fillStyle = ggShineGradient;
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, screenRadius, 0, Math.PI * 2);
                this.ctx.fill();

                // Draw rings for all gas giants with randomized properties
                this.ctx.save();
                this.ctx.translate(screenX, screenY);
                this.ctx.rotate(body.rotationAngle);

                // Generate ring radii based on ring count
                const minRingRadius = screenRadius * 1.3;
                const maxRingRadius = screenRadius * 2.6;
                const ringRadii = [];
                for (let i = 0; i < body.ringCount; i++) {
                    const ringProgress = body.ringCount === 1 ? 0.5 : i / (body.ringCount - 1);
                    const ringRadius = minRingRadius + (maxRingRadius - minRingRadius) * ringProgress;
                    ringRadii.push(ringRadius * body.ringScale);
                }

                const ringWidth = screenRadius * 0.25;

                for (let ringIdx = 0; ringIdx < ringRadii.length; ringIdx++) {
                    // Skip rendering this ring if not visible
                    if (!body.ringVisible[ringIdx]) {
                        continue;
                    }

                    const ringRadius = ringRadii[ringIdx];

                    // Randomized color per body
                    const hue = 35 + body.ringHueShift + ringIdx * 5; // Base hue + shift + per-ring variation
                    const saturation = 60 + Math.random() * 30; // 60 to 90
                    const lightness = body.ringLightness + ringIdx * 4; // Per-body base lightness + per-ring variation
                    const opacity = body.ringOpacities[ringIdx]; // Per-ring opacity

                    // Draw ring as a circle with stroke
                    this.ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${opacity})`;
                    this.ctx.lineWidth = ringWidth;
                    this.ctx.lineCap = 'round';
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
                    this.ctx.stroke();
                }

                this.ctx.restore();
            } else if (body.bodyType === 'neutron-star') {
                // Neutron stars: pulsate with brightness
                // Pulsation frequency: ~0.5 Hz (period of ~2 seconds)
                const pulsePhase = Math.sin(body.pulseTime * Math.PI) * 0.5 + 0.5; // 0 to 1
                const glowBrightness = 0.6 + pulsePhase * 0.2; // 0.6 to 0.8
                const glowRadius = 2.5 + pulsePhase * 0.5; // 2.5 to 3.0x

                // Draw outer glow (very bright and blue) - pulsating
                const nsGlowGradient = this.ctx.createRadialGradient(screenX, screenY, screenRadius, screenX, screenY, screenRadius * glowRadius);
                nsGlowGradient.addColorStop(0, `rgba(100, 220, 255, ${glowBrightness})`);
                nsGlowGradient.addColorStop(0.4, `rgba(100, 200, 255, ${glowBrightness * 0.4})`);
                nsGlowGradient.addColorStop(1, 'rgba(100, 180, 255, 0)');
                this.ctx.fillStyle = nsGlowGradient;
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, screenRadius * glowRadius, 0, Math.PI * 2);
                this.ctx.fill();

                // Draw the neutron star itself
                if (body.texture) {
                    this.ctx.save();
                    this.ctx.translate(screenX, screenY);

                    // Clip to circle
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, screenRadius, 0, Math.PI * 2);
                    this.ctx.clip();

                    this.ctx.drawImage(body.texture, -screenRadius, -screenRadius, screenRadius * 2, screenRadius * 2);
                    this.ctx.restore();
                } else {
                    this.ctx.fillStyle = '#64d9ff';
                    this.ctx.beginPath();
                    this.ctx.arc(screenX, screenY, screenRadius, 0, Math.PI * 2);
                    this.ctx.fill();
                }

                // Draw bright inner shine (also pulsates)
                const nsShineGradient = this.ctx.createRadialGradient(screenX - screenRadius * 0.2, screenY - screenRadius * 0.2, 0, screenX, screenY, screenRadius);
                nsShineGradient.addColorStop(0, `rgba(255, 255, 255, ${0.5 + pulsePhase * 0.3})`);
                nsShineGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                this.ctx.fillStyle = nsShineGradient;
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, screenRadius, 0, Math.PI * 2);
                this.ctx.fill();
            } else if (body.bodyType === 'black-hole') {
                // Black holes with rotating accretion disk
                if (body.texture) {
                    this.ctx.save();
                    this.ctx.translate(screenX, screenY);
                    // Rotate the accretion disk
                    this.ctx.rotate(body.pulseTime * 2); // Fast rotation

                    // Clip to circle
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, screenRadius, 0, Math.PI * 2);
                    this.ctx.clip();

                    this.ctx.drawImage(body.texture, -screenRadius, -screenRadius, screenRadius * 2, screenRadius * 2);
                    this.ctx.restore();
                } else {
                    this.ctx.fillStyle = '#000000';
                    this.ctx.beginPath();
                    this.ctx.arc(screenX, screenY, screenRadius, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            } else if (body.texture) {
                // Planets, gas giants, and stars with textures
                this.ctx.save();
                this.ctx.translate(screenX, screenY);
                this.ctx.rotate(body.rotationAngle);

                // Clip to circle
                this.ctx.beginPath();
                this.ctx.arc(0, 0, screenRadius, 0, Math.PI * 2);
                this.ctx.clip();

                this.ctx.drawImage(body.texture, -screenRadius, -screenRadius, screenRadius * 2, screenRadius * 2);
                this.ctx.restore();
            } else {
                // Fallback: draw colored circles
                this.ctx.fillStyle = body.color;
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, screenRadius, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // Draw velocity vector for debugging
            if (Math.sqrt(body.vx * body.vx + body.vy * body.vy) > 10) {
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(screenX, screenY);
                this.ctx.lineTo(
                    screenX + body.vx * 0.1,
                    screenY + body.vy * 0.1
                );
                this.ctx.stroke();
            }

            // Restore globalAlpha if it was changed
            if (mergeAlpha < 1) {
                this.ctx.globalAlpha = 1;
            }
        }

        // Draw accretion disks for merging black holes (so they persist through merge)
        for (const effect of this.mergeEffects) {
            // Draw accretion disks for both merging black holes
            if (effect.body1.bodyType === 'black-hole') {
                this.drawAccretionDisk(effect.body1.x, effect.body1.y, effect.body1.radius, effect.body1.pulseTime);
            }
            if (effect.body2.bodyType === 'black-hole') {
                this.drawAccretionDisk(effect.body2.x, effect.body2.y, effect.body2.radius, effect.body2.pulseTime);
            }
            // Draw accretion disk for merged black hole if it's a BH
            if (effect.mergedBody.bodyType === 'black-hole') {
                this.drawAccretionDisk(effect.mergedBody.x, effect.mergedBody.y, effect.mergedBody.radius, effect.mergedBody.pulseTime);
            }
        }

        // Draw supernova effects ON TOP of bodies
        this.drawSupernovaEffects();

        // Draw supernova particles ON TOP of everything
        this.drawParticles();
    }

    drawAccretionDisk(x, y, radius, pulseTime) {
        const screenX = (x - this.cameraX) * this.zoom;
        const screenY = (y - this.cameraY) * this.zoom;
        const screenRadius = Math.max(radius * this.zoom, 1);

        if (screenRadius < 2) return; // Too small to render

        this.ctx.save();
        this.ctx.translate(screenX, screenY);
        this.ctx.rotate(pulseTime * 2); // Rotating disk

        const outerDiskRadius = screenRadius * 0.5;
        const innerDiskRadius = screenRadius * 0.25;

        // Create clipping region for ring
        this.ctx.beginPath();
        this.ctx.arc(0, 0, outerDiskRadius, 0, Math.PI * 2);
        this.ctx.arc(0, 0, innerDiskRadius, 0, Math.PI * 2, true);
        this.ctx.clip();

        // Draw gradient disk
        const diskGradient = this.ctx.createRadialGradient(0, 0, innerDiskRadius, 0, 0, outerDiskRadius);
        diskGradient.addColorStop(0, 'rgba(255, 200, 100, 0.9)');
        diskGradient.addColorStop(0.3, 'rgba(255, 150, 80, 0.8)');
        diskGradient.addColorStop(0.6, 'rgba(255, 100, 50, 0.5)');
        diskGradient.addColorStop(1, 'rgba(200, 50, 0, 0)');

        this.ctx.fillStyle = diskGradient;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, outerDiskRadius, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }

    drawDarkMatterEffect() {
        // Draw dark matter nebula cloud swirl centered at origin
        const centerScreenX = (0 - this.cameraX) * this.zoom;
        const centerScreenY = (0 - this.cameraY) * this.zoom;

        // Only draw if center is reasonably on screen
        if (centerScreenX < -1000 || centerScreenX > this.canvas.width + 1000 ||
            centerScreenY < -1000 || centerScreenY > this.canvas.height + 1000) {
            return;
        }

        const time = Date.now() * 0.0003; // Slower rotation

        this.ctx.globalAlpha = 0.225; // Halfway between

        // Draw many small cloud particles to create nebula effect
        const cloudParticles = 3000;

        for (let i = 0; i < cloudParticles; i++) {
            // Use noise-like distribution via seeded random
            const seed = i * 0.618; // Golden ratio for better distribution
            const angle = (seed * 12.9898) % (Math.PI * 2);

            // Spiral distribution with randomness - 3x bigger radius
            const spiralPhase = (seed * 0.5 + time) % (Math.PI * 2);
            const distanceFromCenter = (Math.sin(spiralPhase + i * 0.01) * 0.5 + 0.5) * 1200 * this.zoom;

            // Add turbulent offset
            const turbulence = Math.sin(i * 0.1 + time) * Math.sin(i * 0.05 + time * 0.7);
            const offsetX = Math.cos(angle + time) * turbulence * 150;
            const offsetY = Math.sin(angle + time) * turbulence * 150;

            const x = centerScreenX + Math.cos(spiralPhase - time) * distanceFromCenter + offsetX;
            const y = centerScreenY + Math.sin(spiralPhase - time) * distanceFromCenter + offsetY;

            // Distance from center determines opacity
            const distFromCenter = Math.sqrt((x - centerScreenX) ** 2 + (y - centerScreenY) ** 2);
            const maxDist = 1200 * this.zoom;
            const opacity = Math.max(0, 0.6 * (1 - distFromCenter / maxDist));

            // Variable particle size for cloud effect
            const size = 2 + Math.sin(i * 0.033 + time) * 1.5;

            // Dark matter - halfway between grey and black
            this.ctx.fillStyle = `rgba(35, 35, 47, ${opacity * 1.25})`;
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Large central glow - dark matter (2x larger)
        const glowRadius = 1200 * this.zoom;
        const glowGradient = this.ctx.createRadialGradient(centerScreenX, centerScreenY, 0, centerScreenX, centerScreenY, glowRadius);
        glowGradient.addColorStop(0, 'rgba(45, 45, 57, 0.325)');
        glowGradient.addColorStop(0.5, 'rgba(40, 40, 52, 0.15)');
        glowGradient.addColorStop(1, 'rgba(35, 35, 47, 0)');
        this.ctx.fillStyle = glowGradient;
        this.ctx.beginPath();
        this.ctx.arc(centerScreenX, centerScreenY, glowRadius, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.globalAlpha = 1;
    }

    drawStarfield() {
        // Generate faint background stars using camera position as seed
        // This creates a stable starfield that moves with the camera
        const starDensity = 0.0002; // Stars per pixel
        const gridSize = 50; // Chunk size for stable star generation

        const startX = Math.floor(this.cameraX / gridSize) * gridSize;
        const startY = Math.floor(this.cameraY / gridSize) * gridSize;
        const endX = startX + (this.canvas.width / this.zoom / gridSize + 2) * gridSize;
        const endY = startY + (this.canvas.height / this.zoom / gridSize + 2) * gridSize;

        this.ctx.fillStyle = 'rgba(200, 200, 220, 0.6)';

        // Use a seeded pseudo-random number generator for consistent stars
        const seededRandom = (seed) => {
            const x = Math.sin(seed) * 10000;
            return x - Math.floor(x);
        };

        for (let chunkX = startX; chunkX < endX; chunkX += gridSize) {
            for (let chunkY = startY; chunkY < endY; chunkY += gridSize) {
                // Generate a few stars per chunk
                const chunkSeed = chunkX * 73856093 ^ chunkY * 19349663;
                const starCount = Math.floor(seededRandom(chunkSeed) * 3) + 1;

                for (let i = 0; i < starCount; i++) {
                    const seed1 = chunkSeed + i * 2;
                    const seed2 = chunkSeed + i * 2 + 1;

                    const starX = chunkX + seededRandom(seed1) * gridSize;
                    const starY = chunkY + seededRandom(seed2) * gridSize;

                    const screenX = (starX - this.cameraX) * this.zoom;
                    const screenY = (starY - this.cameraY) * this.zoom;

                    if (screenX > -10 && screenX < this.canvas.width + 10 &&
                        screenY > -10 && screenY < this.canvas.height + 10) {
                        const brightness = seededRandom(chunkSeed + i * 3) * 0.5 + 0.3;
                        this.ctx.fillStyle = `rgba(200, 200, 220, ${brightness})`;
                        this.ctx.beginPath();
                        this.ctx.arc(screenX, screenY, 1, 0, Math.PI * 2);
                        this.ctx.fill();
                    }
                }
            }
        }
    }

    drawSupernovaEffects() {
        let maxWhiteWash = 0;

        for (const effect of this.supernovaEffects) {
            const props = effect.getProperties();

            // Use star position for glow during phases 1-3, explosion position for phase 3 onwards
            const glowX = (props.phase < 3) ? effect.x : effect.explosionX;
            const glowY = (props.phase < 3) ? effect.y : effect.explosionY;
            const screenGlowX = (glowX - this.cameraX) * this.zoom;
            const screenGlowY = (glowY - this.cameraY) * this.zoom;
            const screenRadius = props.radius * this.zoom;

            // Draw bright white sphere (replaces the body during phases 1-3 only)
            if (props.showWhiteSphere && effect.body) {
                const starScreenX = (effect.body.x - this.cameraX) * this.zoom;
                const starScreenY = (effect.body.y - this.cameraY) * this.zoom;
                const whiteSphereBrightness = Math.min(1.0, props.brightness * 1.2);
                const whiteRadius = Math.max(effect.body.radius * this.zoom, 3); // Scale with actual body radius
                this.ctx.fillStyle = `rgba(255, 255, 255, ${whiteSphereBrightness})`;
                this.ctx.beginPath();
                this.ctx.arc(starScreenX, starScreenY, whiteRadius, 0, Math.PI * 2);
                this.ctx.fill();

                // Debug: Draw white sphere outline to see bounds
                // this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
                // this.ctx.lineWidth = 2;
                // this.ctx.stroke();
            }

            if (props.brightness > 0) {
                // Draw the main glow circle
                const glowGradient = this.ctx.createRadialGradient(screenGlowX, screenGlowY, screenRadius * 0.1, screenGlowX, screenGlowY, screenRadius);
                glowGradient.addColorStop(0, props.color + props.brightness + ')');
                glowGradient.addColorStop(1, props.color + '0)');
                this.ctx.fillStyle = glowGradient;
                this.ctx.beginPath();
                this.ctx.arc(screenGlowX, screenGlowY, screenRadius, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // Track max white wash from phase 3 explosions
            if (props.phase === 3) {
                // Use brightness value directly (goes up to 3.0 at peak)
                maxWhiteWash = Math.max(maxWhiteWash, props.brightness);
            }

            // Create small explosion particles during phase 3
            if (props.particles > 0 && Math.random() < 0.3) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 100 + Math.random() * 50;
                const particle = new Particle(
                    effect.explosionX + Math.cos(angle) * screenRadius / this.zoom * 0.7,
                    effect.explosionY + Math.sin(angle) * screenRadius / this.zoom * 0.7,
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed,
                    0.5
                );
                this.particles.push(particle);
            }
        }

        // Draw full-screen white wash effect at peak explosion
        if (maxWhiteWash > 0) {
            // Peak brightness of 3.0 gives washAlpha of 1.0 (100% white)
            const washAlpha = Math.min(1.0, maxWhiteWash * 0.35);
            this.ctx.fillStyle = `rgba(255, 255, 255, ${washAlpha})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    drawParticles() {
        for (const particle of this.particlePool.getActive()) {
            const screenX = (particle.x - this.cameraX) * this.zoom;
            const screenY = (particle.y - this.cameraY) * this.zoom;
            const alpha = particle.getAlpha();

            // Draw particle with fade-out
            this.ctx.fillStyle = `rgba(255, 150, 100, ${alpha * 0.8})`;
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, 3, 0, Math.PI * 2);
            this.ctx.fill();

            // Draw glow
            const glowGradient = this.ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, 8);
            glowGradient.addColorStop(0, `rgba(255, 200, 100, ${alpha * 0.4})`);
            glowGradient.addColorStop(1, 'rgba(255, 100, 50, 0)');
            this.ctx.fillStyle = glowGradient;
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, 8, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawGrid() {
        const gridSize = 200;
        const startX = Math.floor(this.cameraX / gridSize) * gridSize;
        const startY = Math.floor(this.cameraY / gridSize) * gridSize;

        this.ctx.strokeStyle = 'rgba(124, 58, 237, 0.1)';
        this.ctx.lineWidth = 1;

        for (let x = startX; x < this.cameraX + this.canvas.width / this.zoom; x += gridSize) {
            const screenX = (x - this.cameraX) * this.zoom;
            this.ctx.beginPath();
            this.ctx.moveTo(screenX, 0);
            this.ctx.lineTo(screenX, this.canvas.height);
            this.ctx.stroke();
        }

        for (let y = startY; y < this.cameraY + this.canvas.height / this.zoom; y += gridSize) {
            const screenY = (y - this.cameraY) * this.zoom;
            this.ctx.beginPath();
            this.ctx.moveTo(0, screenY);
            this.ctx.lineTo(this.canvas.width, screenY);
            this.ctx.stroke();
        }
    }

    resetView() {
        // Center the view on the middle of the screen (where dark matter is)
        this.cameraX = -this.canvas.width / 2 / this.zoom;
        this.cameraY = -this.canvas.height / 2 / this.zoom;
        this.zoom = 1;
    }

    createExplosion(x, y, mass, intensity = 1.0) {
        // Create an explosion proportional to mass with some randomness, capped to prevent lag
        const baseParticleCount = Math.max(2, Math.min(mass * 0.2, 80)); // Cap at 80 particles
        const particleCount = Math.floor(baseParticleCount * (0.7 + Math.random() * 0.6)); // ±30% randomness

        const baseSpeed = 20;
        const speedVariance = 20;
        const baseLifetime = 1.0;
        const lifetimeVariance = 1.0;

        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
            const speed = (Math.random() * speedVariance + baseSpeed) * intensity;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const lifetime = Math.random() * lifetimeVariance + baseLifetime;

            this.particlePool.acquire(x, y, vx, vy, lifetime);
        }
    }

    createSupernovaWithBody(x, y, radius, body) {
        // Supernova is a special cinematic explosion for star -> neutron star transition
        console.log(`[SUPERNOVA] Created at (${x.toFixed(1)}, ${y.toFixed(1)}) for body type: ${body ? body.bodyType : 'unknown'}`);
        this.supernovaEffects.push(new SupernovaEffect(x, y, body, 15.0));
        this.createExplosion(x, y, 50, 2.5); // High intensity particles
    }

    createSupernova(x, y, radius) {
        // Legacy method for compatibility
        this.createSupernovaWithBody(x, y, radius, null);
    }

    clearAll() {
        this.bodies = [];
        this.particlePool.clear();
        this.supernovaEffects = [];
        this.mergeEffects = [];
    }

    getTotalMass() {
        return this.bodies.reduce((sum, b) => sum + b.mass, 0).toFixed(1);
    }

    animate() {
        const now = Date.now();
        const delta = (now - this.lastTime) / 1000;
        this.lastTime = now;

        // Cap delta to avoid huge jumps
        const dt = Math.min(delta, 0.016);

        this.update(dt);
        this.draw();
        this.updateStats();

        requestAnimationFrame(() => this.animate());
    }

    updateStats() {
        this.frameCount++;
        if (this.frameCount % 10 === 0) {
            const now = Date.now();
            this.fps = Math.round(1000 / ((now - this.lastTime) / 10));
        }

        document.getElementById('fps').textContent = this.fps;
        document.getElementById('body-count').textContent = this.bodies.length;
        document.getElementById('total-mass').textContent = this.getTotalMass();
    }
}

// ==================== UI SETUP ====================

const canvas = document.getElementById('canvas');
const sim = new Simulator(canvas);

// Spawn two random objects below stellar mass with random velocities
const mass1 = Math.random() * 145 + 5; // 5-150 (below star threshold)
const mass2 = Math.random() * 145 + 5;
sim.spawnPlanet(-200, -150, mass1);
sim.spawnPlanet(200, 150, mass2);

// Give them random velocities
const angle1 = Math.random() * Math.PI * 2;
const speed1 = Math.random() * 30 + 20;
sim.bodies[0].vx = Math.cos(angle1) * speed1;
sim.bodies[0].vy = Math.sin(angle1) * speed1;

const angle2 = Math.random() * Math.PI * 2;
const speed2 = Math.random() * 30 + 20;
sim.bodies[1].vx = Math.cos(angle2) * speed2;
sim.bodies[1].vy = Math.sin(angle2) * speed2;


// Spawn dropdown - spawns immediately on selection change
const spawnX = () => sim.cameraX + sim.canvas.width / 2 / sim.zoom;
const spawnY = () => sim.cameraY + sim.canvas.height / 2 / sim.zoom;

const spawnBodyByType = (type) => {
    const x = spawnX();
    const y = spawnY();

    switch (type) {
        case 'random':
            // Spawn a completely random body (5-145 mass range)
            sim.spawnPlanet(x, y, Math.random() * 140 + 5);
            break;
        case 'asteroid':
            // 5-20 mass with full variance
            sim.spawnPlanet(x, y, Math.random() * 15 + 5);
            break;
        case 'planet':
            // 20-60 mass with full variance
            sim.spawnPlanet(x, y, Math.random() * 40 + 20);
            break;
        case 'gas-giant':
            // 60-150 mass with full variance
            sim.spawnPlanet(x, y, Math.random() * 90 + 60);
            break;
        case 'star':
            // 150-1500 mass: from red star to blue star
            sim.spawnPlanet(x, y, Math.random() * 1350 + 150);
            break;
        case 'neutron-star':
            // 1500-3000 mass: full range of neutron stars
            sim.spawnPlanet(x, y, Math.random() * 1500 + 1500);
            break;
        case 'black-hole':
            // 3000+ mass: various black hole sizes
            sim.spawnPlanet(x, y, Math.random() * 3000 + 3000);
            break;
    }
};


// Control buttons
document.getElementById('btn-play-pause').addEventListener('click', (e) => {
    sim.running = !sim.running;
    e.target.textContent = sim.running ? 'Pause' : 'Play';
    e.target.classList.toggle('active');
});

document.getElementById('btn-clear').addEventListener('click', () => {
    sim.clearAll();
});

// Sliders
document.getElementById('speed-slider').addEventListener('input', (e) => {
    sim.timeScale = parseFloat(e.target.value);
    document.getElementById('speed-value').textContent = sim.timeScale.toFixed(1) + 'x';
});

document.getElementById('gravity-slider').addEventListener('input', (e) => {
    sim.gravityConstant = parseFloat(e.target.value);
    document.getElementById('gravity-value').textContent = sim.gravityConstant.toFixed(1);
});

document.getElementById('dark-matter-slider').addEventListener('input', (e) => {
    sim.darkMatterStrength = parseFloat(e.target.value);
    document.getElementById('dark-matter-value').textContent = sim.darkMatterStrength.toFixed(1);
});

// Start the animation loop
sim.animate();
