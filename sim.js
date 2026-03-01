const coreExports = globalThis.CosmicSimulatorCore;

if (!coreExports) {
    throw new Error('sim-core.js must be loaded before sim.js');
}

const {
    Body,
    SupernovaEffect,
    SimulationCore,
    getBodyTypeConfig,
    getSpawnPresetDefinitions,
    getCircularOrbitSpeed,
    getBlackHoleRenderMetrics,
    shouldRenderBlackHoleFlares,
    shouldDrawVelocityVector,
    getBodyMergeVisualState,
} = coreExports;

class BrowserBody extends Body {
    constructor(x, y, vx, vy, mass, radius, color, bodyType = 'planet') {
        super(x, y, vx, vy, mass, radius, color, bodyType);
        this.texture = null;
        this.pulseFrequency = (0.2 + Math.random() * 0.8) / 2.5;
        this.pulseBrightnessMin = 0.1 + Math.random() * 0.2;
        this.pulseBrightnessMax = 0.8 + Math.random() * 0.4;
        this.pulseRadiusMin = 1.8 + Math.random() * 0.4;
        this.pulseRadiusMax = 3.2 + Math.random() * 0.8;
        this.ringScale = 1.0;
        this.ringCount = 3;
        this.ringOpacities = [0.85, 0.85, 0.85];
        this.ringVisible = [true, true, true];
        this.ringHueShift = 0;
        this.ringLightness = 50;
        this.asteroidVertices = null;
        this.blackHoleFlares = null;
        this.craters = null;

        if (bodyType === 'planet') {
            this.texture = this.generateEarthTexture(radius);
        } else if (bodyType === 'gas-giant') {
            this.texture = this.generateGasGiantTexture(radius);
            this.ringScale = 0.5 + Math.random() * 1.0;
            this.ringCount = Math.floor(Math.random() * 5) + 1;
            this.ringOpacities = [];
            this.ringVisible = [];
            this.ringSaturations = [];
            for (let i = 0; i < this.ringCount; i++) {
                this.ringOpacities.push(0.1 + Math.random() * Math.random() * 0.25);
                this.ringVisible.push(Math.random() < 0.5);
                this.ringSaturations.push(60 + Math.random() * 30);
            }
            this.ringHueShift = Math.random() * 40 - 20;
            this.ringLightness = 35 + Math.random() * 20;
        } else if (bodyType === 'star') {
            this.texture = this.generateStarTexture(radius, mass);
        } else if (bodyType === 'asteroid') {
            this.texture = this.generateAsteroidTexture(radius);
            this.asteroidVertices = this.generateAsteroidShape(radius);
            this.craters = Array.from({ length: 2 }, () => {
                const angle = Math.random() * Math.PI * 2;
                const distance = 0.4 + Math.random() * 0.3;
                const size = 0.1 + Math.random() * 0.1;
                return { angle, distance, size };
            });
        } else if (bodyType === 'neutron-star') {
            this.texture = this.generateNeutronStarTexture(radius);
        } else if (bodyType === 'black-hole') {
            this.texture = this.generateBlackHoleTexture(radius);
            this.blackHoleFlares = this.generateBlackHoleFlares(radius);
        }
    }

    generateBlackHoleFlares(radius) {
        const flareCount = Math.max(4, Math.ceil(radius / 10));
        const flares = [];
        for (let i = 0; i < flareCount; i++) {
            flares.push({
                angle: Math.random() * Math.PI * 2,
                distance: 0.25 + Math.random() * 0.25,
                sizeBase: 0.02 + Math.random() * 0.04,
            });
        }
        return flares;
    }

    generateEarthTexture(radius = this.radius) {
        const size = Math.ceil(radius * 4);
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#1a5490';
        ctx.fillRect(0, 0, size, size);

        for (let i = 0; i < 5; i++) {
            const continentX = Math.random() * size;
            const continentY = Math.random() * size;
            const continentSize = Math.random() * (size * 0.4) + size * 0.15;
            ctx.fillStyle = `hsl(${Math.random() * 40 + 100}, 60%, 35%)`;
            ctx.beginPath();
            ctx.ellipse(continentX, continentY, continentSize, continentSize * 0.7, Math.random() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
        }

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

        const hue = Math.random() * 60 + 20;
        ctx.fillStyle = `hsl(${hue}, 80%, 45%)`;
        ctx.fillRect(0, 0, size, size);

        for (let i = 0; i < 5; i++) {
            const bandY = (i / 5) * size;
            const bandHeight = size / 6;
            ctx.fillStyle = `hsl(${hue + (i % 2) * 20}, 70%, ${40 + (i % 3) * 5}%)`;
            ctx.fillRect(0, bandY, size, bandHeight);
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
        const starConfig = getBodyTypeConfig('star');
        const starMinMass = starConfig ? starConfig.minMass : 150;
        const starMaxMass = starConfig ? starConfig.maxMass : 1500;
        const massRange = Math.max(1, starMaxMass - starMinMass);
        const massFraction = Math.max(0, Math.min((mass - starMinMass) / massRange, 1));
        let red;
        let green;
        let blue;

        if (massFraction < 0.25) {
            const t = massFraction / 0.25;
            red = 255;
            green = Math.round(100 * t);
            blue = 0;
        } else if (massFraction < 0.5) {
            const t = (massFraction - 0.25) / 0.25;
            red = 255;
            green = Math.round(100 + 155 * t);
            blue = 0;
        } else if (massFraction < 0.75) {
            const t = (massFraction - 0.5) / 0.25;
            red = 255;
            green = 255;
            blue = Math.round(255 * t);
        } else {
            const t = (massFraction - 0.75) / 0.25;
            red = Math.round(255 * (1 - t * 0.8));
            green = Math.round(255 * (1 - t * 0.6));
            blue = 255;
        }

        const centerColor = `rgb(${red}, ${green}, ${blue})`;
        const outerColor = `rgb(${Math.round(red * 0.6)}, ${Math.round(green * 0.6)}, ${Math.round(blue * 0.6)})`;
        const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.5, centerColor);
        gradient.addColorStop(1, outerColor);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

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
        ctx.fillStyle = '#999999';
        ctx.fillRect(0, 0, size, size);
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
        const numVertices = Math.floor(Math.random() * 4) + 6;
        const vertices = [];
        for (let i = 0; i < numVertices; i++) {
            const angle = (i / numVertices) * Math.PI * 2;
            const randomRadius = radius * (0.7 + Math.random() * 0.6);
            vertices.push({
                x: Math.cos(angle) * randomRadius,
                y: Math.sin(angle) * randomRadius,
            });
        }
        return vertices;
    }

    generateNeutronStarTexture(radius = this.radius) {
        const size = Math.ceil(radius * 4);
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const centerX = size / 2;
        const centerY = size / 2;

        ctx.fillStyle = '#001a33';
        ctx.fillRect(0, 0, size, size);

        const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, size * 0.45);
        coreGradient.addColorStop(0, '#ffffff');
        coreGradient.addColorStop(0.15, '#ffeecc');
        coreGradient.addColorStop(0.4, '#64d9ff');
        coreGradient.addColorStop(1, '#003366');
        ctx.fillStyle = coreGradient;
        ctx.fillRect(0, 0, size, size);

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
        const maxSize = 128;
        const uncappedSize = Math.ceil(radius * 4);
        const size = Math.min(maxSize, uncappedSize);
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const centerX = size / 2;
        const centerY = size / 2;
        const metrics = getBlackHoleRenderMetrics(size / 2);

        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, metrics.diskOuterRadius, 0, Math.PI * 2);
        ctx.arc(centerX, centerY, metrics.diskInnerRadius, 0, Math.PI * 2, true);
        ctx.clip();

        const diskGradient = ctx.createRadialGradient(
            centerX,
            centerY,
            metrics.diskInnerRadius,
            centerX,
            centerY,
            metrics.diskOuterRadius
        );
        diskGradient.addColorStop(0, 'rgba(255, 200, 100, 0.9)');
        diskGradient.addColorStop(0.3, 'rgba(255, 150, 80, 0.8)');
        diskGradient.addColorStop(0.6, 'rgba(255, 100, 50, 0.5)');
        diskGradient.addColorStop(1, 'rgba(200, 50, 0, 0)');
        ctx.fillStyle = diskGradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, metrics.diskOuterRadius, 0, Math.PI * 2);
        ctx.fill();

        const flareCount = Math.max(4, Math.ceil(size / 16));
        for (let i = 0; i < flareCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = size * (0.25 + Math.random() * 0.25);
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
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

        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(centerX, centerY, metrics.coreRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(200, 200, 200, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centerX, centerY, metrics.coreRadius, 0, Math.PI * 2);
        ctx.stroke();

        return canvas;
    }
}

class Simulator extends SimulationCore {
    constructor(canvas) {
        super({
            createBody: (x, y, vx, vy, mass, radius, color, bodyType) => {
                return new BrowserBody(x, y, vx, vy, mass, radius, color, bodyType);
            },
        });

        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.lastTime = Date.now();
        this.lastFpsSampleTime = this.lastTime;
        this.frameCount = 0;
        this.fps = 60;
        this.cameraX = 0;
        this.cameraY = 0;
        this.zoom = 1;
        this.hoveredBody = null;

        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        this.setupInputControls();
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth - 250;
        this.canvas.height = window.innerHeight;
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

        const spawnType = document.getElementById('spawn-type').value;
        const spawnPreset = this.getSpawnPresetConfig(spawnType);
        if (!spawnPreset) {
            return;
        }

        this.spawnPlanet(worldX, worldY, this.getRandomMassForPreset(spawnType));
    }

    setupInputControls() {
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            this.zoom *= zoomFactor;
            this.zoom = Math.max(0.1, Math.min(this.zoom, 10));
            this.cameraX = -this.canvas.width / (2 * this.zoom);
            this.cameraY = -this.canvas.height / (2 * this.zoom);
        });

        this.canvas.addEventListener('click', (e) => {
            this.handleClick(e);
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const screenX = e.clientX - rect.left;
            const screenY = e.clientY - rect.top;
            const worldX = (screenX / this.zoom) + this.cameraX;
            const worldY = (screenY / this.zoom) + this.cameraY;

            this.hoveredBody = null;
            for (const body of this.bodies) {
                const dx = body.x - worldX;
                const dy = body.y - worldY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const hoverRadius = body.bodyType === 'black-hole' ? body.radius * 0.12 : body.radius;
                if (dist < hoverRadius) {
                    this.hoveredBody = body;
                    break;
                }
            }
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.hoveredBody = null;
        });
    }

    spawnPlanet(x, y, mass = null) {
        return super.spawnPlanet(x, y, mass);
    }

    spawnBlackHole(x, y) {
        return super.spawnBlackHole(x, y);
    }

    spawnRandomCluster(x, y, count = 5) {
        return super.spawnRandomCluster(x, y, count);
    }

    update(dt) {
        return super.update(dt);
    }

    handleCollisions() {
        return super.handleCollisions();
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
            const { scale: mergeScale, alpha: mergeAlpha } = getBodyMergeVisualState(body);
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

                    this.ctx.fillStyle = '#666666';
                    const craters = body.craters || [];
                    for (const crater of craters) {
                        const craterX = Math.cos(crater.angle) * screenRadius * crater.distance;
                        const craterY = Math.sin(crater.angle) * screenRadius * crater.distance;
                        const craterSize = screenRadius * crater.size;
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

                    const hue = 35 + body.ringHueShift + ringIdx * 5;
                    const saturation = body.ringSaturations?.[ringIdx] ?? 75;
                    const lightness = body.ringLightness + ringIdx * 4;
                    const opacity = body.ringOpacities[ringIdx];

                    this.ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${opacity})`;
                    this.ctx.lineWidth = ringWidth;
                    this.ctx.lineCap = 'round';
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
                    this.ctx.stroke();
                }

                this.ctx.restore();
            } else if (body.bodyType === 'neutron-star') {
                // Neutron stars: pulsate with randomized frequency and intensity per star
                const pulsePhase = Math.sin(body.pulseTime * Math.PI * body.pulseFrequency) * 0.5 + 0.5; // 0 to 1
                const brightnessDelta = body.pulseBrightnessMax - body.pulseBrightnessMin;
                const glowBrightness = body.pulseBrightnessMin + pulsePhase * brightnessDelta;
                const radiusDelta = body.pulseRadiusMax - body.pulseRadiusMin;
                const glowRadius = body.pulseRadiusMin + pulsePhase * radiusDelta;

                // Draw outer glow (very bright and blue) - violently pulsating
                const nsGlowGradient = this.ctx.createRadialGradient(screenX, screenY, screenRadius, screenX, screenY, screenRadius * glowRadius);
                nsGlowGradient.addColorStop(0, `rgba(100, 220, 255, ${glowBrightness})`);
                nsGlowGradient.addColorStop(0.4, `rgba(100, 200, 255, ${glowBrightness * 0.5})`);
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

                // Draw bright inner shine (pulsates with same randomization)
                const shineDelta = 1.0 - body.pulseBrightnessMin;
                const nsShineGradient = this.ctx.createRadialGradient(screenX - screenRadius * 0.2, screenY - screenRadius * 0.2, 0, screenX, screenY, screenRadius);
                nsShineGradient.addColorStop(0, `rgba(255, 255, 255, ${body.pulseBrightnessMin + pulsePhase * shineDelta})`);
                nsShineGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                this.ctx.fillStyle = nsShineGradient;
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, screenRadius, 0, Math.PI * 2);
                this.ctx.fill();
            } else if (body.bodyType === 'black-hole') {
                if (body.texture) {
                    this.ctx.save();
                    this.ctx.translate(screenX, screenY);
                    this.ctx.rotate(body.pulseTime * 2);

                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, screenRadius, 0, Math.PI * 2);
                    this.ctx.clip();

                    this.ctx.drawImage(body.texture, -screenRadius, -screenRadius, screenRadius * 2, screenRadius * 2);
                    this.ctx.restore();
                } else {
                    this.drawProceduralBlackHole(screenX, screenY, screenRadius, body.pulseTime, body);
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

            if (shouldDrawVelocityVector(body)) {
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
                this.drawAccretionDisk(effect.body1);
            }
            if (effect.body2.bodyType === 'black-hole') {
                this.drawAccretionDisk(effect.body2);
            }
            // Draw accretion disk for merged black hole if it's a BH
            if (effect.mergedBody.bodyType === 'black-hole') {
                this.drawAccretionDisk(effect.mergedBody);
            }
        }

        // Draw supernova effects ON TOP of bodies
        this.drawSupernovaEffects();

        // Draw supernova particles ON TOP of everything
        this.drawParticles();

        // Draw hover mass tooltip ON TOP of everything
        if (this.hoveredBody) {
            this.drawHoverTooltip(this.hoveredBody);
        }
    }

    drawProceduralBlackHole(screenX, screenY, screenRadius, pulseTime, body) {
        // Draw black hole procedurally at render time to avoid pixelation on large objects
        this.ctx.save();
        this.ctx.translate(screenX, screenY);
        this.ctx.rotate(pulseTime * 2);
        const metrics = getBlackHoleRenderMetrics(screenRadius);

        this.ctx.beginPath();
        this.ctx.arc(0, 0, metrics.diskOuterRadius, 0, Math.PI * 2);
        this.ctx.arc(0, 0, metrics.diskInnerRadius, 0, Math.PI * 2, true);
        this.ctx.clip();

        const diskGradient = this.ctx.createRadialGradient(0, 0, metrics.diskInnerRadius, 0, 0, metrics.diskOuterRadius);
        diskGradient.addColorStop(0, 'rgba(255, 200, 100, 0.9)');
        diskGradient.addColorStop(0.3, 'rgba(255, 150, 80, 0.8)');
        diskGradient.addColorStop(0.6, 'rgba(255, 100, 50, 0.5)');
        diskGradient.addColorStop(1, 'rgba(200, 50, 0, 0)');

        this.ctx.fillStyle = diskGradient;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, metrics.diskOuterRadius, 0, Math.PI * 2);
        this.ctx.fill();

        if (shouldRenderBlackHoleFlares(body) && body.blackHoleFlares) {
            for (const flare of body.blackHoleFlares) {
                const x = Math.cos(flare.angle) * flare.distance * screenRadius;
                const y = Math.sin(flare.angle) * flare.distance * screenRadius;
                const flareSize = flare.sizeBase * screenRadius;

                const flareGradient = this.ctx.createRadialGradient(x, y, 0, x, y, flareSize);
                flareGradient.addColorStop(0, 'rgba(255, 255, 200, 0.8)');
                flareGradient.addColorStop(1, 'rgba(255, 150, 50, 0)');
                this.ctx.fillStyle = flareGradient;
                this.ctx.beginPath();
                this.ctx.arc(x, y, flareSize, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, metrics.coreRadius, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.strokeStyle = 'rgba(200, 200, 200, 0.4)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, metrics.coreRadius, 0, Math.PI * 2);
        this.ctx.stroke();

        this.ctx.restore();
    }

    drawAccretionDisk(body) {
        const screenX = (body.x - this.cameraX) * this.zoom;
        const screenY = (body.y - this.cameraY) * this.zoom;
        const { scale: mergeScale, alpha: mergeAlpha } = getBodyMergeVisualState(body);
        const screenRadius = Math.max(body.radius * this.zoom, 1) * mergeScale;

        if (screenRadius < 2) return; // Too small to render

        this.ctx.save();
        this.ctx.translate(screenX, screenY);
        this.ctx.rotate(body.pulseTime * 2); // Rotating disk
        this.ctx.globalAlpha = mergeAlpha;
        const metrics = getBlackHoleRenderMetrics(screenRadius);

        this.ctx.beginPath();
        this.ctx.arc(0, 0, metrics.diskOuterRadius, 0, Math.PI * 2);
        this.ctx.arc(0, 0, metrics.diskInnerRadius, 0, Math.PI * 2, true);
        this.ctx.clip();

        const diskGradient = this.ctx.createRadialGradient(0, 0, metrics.diskInnerRadius, 0, 0, metrics.diskOuterRadius);
        diskGradient.addColorStop(0, 'rgba(255, 200, 100, 0.9)');
        diskGradient.addColorStop(0.3, 'rgba(255, 150, 80, 0.8)');
        diskGradient.addColorStop(0.6, 'rgba(255, 100, 50, 0.5)');
        diskGradient.addColorStop(1, 'rgba(200, 50, 0, 0)');

        this.ctx.fillStyle = diskGradient;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, metrics.diskOuterRadius, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, metrics.coreRadius, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.strokeStyle = 'rgba(200, 200, 200, 0.4)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, metrics.coreRadius, 0, Math.PI * 2);
        this.ctx.stroke();

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
                this.particlePool.acquire(
                    effect.explosionX + Math.cos(angle) * screenRadius / this.zoom * 0.7,
                    effect.explosionY + Math.sin(angle) * screenRadius / this.zoom * 0.7,
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed,
                    0.5
                );
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

    drawHoverTooltip(body) {
        // Convert body world position to screen position
        const screenX = (body.x - this.cameraX) * this.zoom;
        const screenY = (body.y - this.cameraY) * this.zoom;

        // Format mass with appropriate precision
        const massText = body.mass.toFixed(1);
        const text = `Mass: ${massText}`;

        // Setup text rendering
        this.ctx.font = '14px "Courier New", monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'bottom';

        // Measure text to create background
        const metrics = this.ctx.measureText(text);
        const textWidth = metrics.width;
        const textHeight = 18;
        const padding = 8;

        // Calculate tooltip position (above the body, centered)
        const tooltipX = screenX;
        const tooltipY = screenY - 30; // Offset above the body

        // Draw semi-transparent background with rounded corners
        const x = tooltipX - textWidth / 2 - padding;
        const y = tooltipY - textHeight - padding;
        const w = textWidth + padding * 2;
        const h = textHeight + padding;
        const r = 4;

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.beginPath();
        this.ctx.moveTo(x + r, y);
        this.ctx.lineTo(x + w - r, y);
        this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        this.ctx.lineTo(x + w, y + h - r);
        this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        this.ctx.lineTo(x + r, y + h);
        this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        this.ctx.lineTo(x, y + r);
        this.ctx.quadraticCurveTo(x, y, x + r, y);
        this.ctx.closePath();
        this.ctx.fill();

        // Draw border
        this.ctx.strokeStyle = 'rgba(124, 58, 237, 0.8)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        // Draw text
        this.ctx.fillStyle = '#7c3aed';
        this.ctx.fillText(text, tooltipX, tooltipY);
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
        return super.createExplosion(x, y, mass, intensity);
    }

    createSupernovaWithBody(x, y, radius, body) {
        return super.createSupernovaWithBody(x, y, radius, body);
    }

    createSupernova(x, y, radius) {
        return super.createSupernova(x, y, radius);
    }

    clearAll() {
        return super.clearAll();
    }

    getTotalMass() {
        return super.getTotalMass();
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
            const elapsed = now - this.lastFpsSampleTime;
            if (elapsed > 0) {
                this.fps = Math.round((10 * 1000) / elapsed);
            }
            this.lastFpsSampleTime = now;
        }

        const fpsNode = document.getElementById('fps');
        const bodyCountNode = document.getElementById('body-count');
        const totalMassNode = document.getElementById('total-mass');
        if (fpsNode) fpsNode.textContent = this.fps;
        if (bodyCountNode) bodyCountNode.textContent = this.bodies.length;
        if (totalMassNode) totalMassNode.textContent = this.getTotalMass();
    }
}

function seedSandboxScenario(sim) {
    const mass1 = sim.getRandomMassForPreset('random');
    const mass2 = sim.getRandomMassForPreset('random');
    sim.spawnPlanet(-200, -150, mass1);
    sim.spawnPlanet(200, 150, mass2);

    const angle1 = Math.random() * Math.PI * 2;
    const speed1 = Math.random() * 30 + 20;
    sim.bodies[0].vx = Math.cos(angle1) * speed1;
    sim.bodies[0].vy = Math.sin(angle1) * speed1;

    const angle2 = Math.random() * Math.PI * 2;
    const speed2 = Math.random() * 30 + 20;
    sim.bodies[1].vx = Math.cos(angle2) * speed2;
    sim.bodies[1].vy = Math.sin(angle2) * speed2;
}

function seedSolarSystemScenario(sim) {
    sim.darkMatterStrength = 0;

    const starMass = sim.getRandomMassForPreset('star');
    const star = sim.spawnPlanet(0, 0, starMass);
    star.vx = 0;
    star.vy = 0;

    const planetCount = Math.floor(Math.random() * 5) + 1;
    let orbitalDistance = star.radius + 60;

    for (let i = 0; i < planetCount; i++) {
        const mass = sim.getRandomMassForPreset('random');
        const angle = Math.random() * Math.PI * 2;
        const x = Math.cos(angle) * orbitalDistance;
        const y = Math.sin(angle) * orbitalDistance;
        const body = sim.spawnPlanet(x, y, mass);
        const orbitalSpeed = getCircularOrbitSpeed(star.mass, orbitalDistance, sim.gravityConstant);
        const tangentialDirection = Math.random() < 0.5 ? 1 : -1;
        const tangentX = -Math.sin(angle) * tangentialDirection;
        const tangentY = Math.cos(angle) * tangentialDirection;

        body.vx = tangentX * orbitalSpeed;
        body.vy = tangentY * orbitalSpeed;

        const separation = 40 + Math.random() * 40;
        orbitalDistance += body.radius * 2 + separation;
    }
}

function seedScenario(sim, scenarioName = 'sandbox') {
    if (scenarioName === 'sandbox') {
        seedSandboxScenario(sim);
        return;
    }

    if (scenarioName === 'solar-system') {
        seedSolarSystemScenario(sim);
        return;
    }

    throw new Error(`Unknown scenario: ${scenarioName}`);
}

function syncControlState(sim) {
    const speedSlider = document.getElementById('speed-slider');
    const gravitySlider = document.getElementById('gravity-slider');
    const darkMatterSlider = document.getElementById('dark-matter-slider');
    const speedValue = document.getElementById('speed-value');
    const gravityValue = document.getElementById('gravity-value');
    const darkMatterValue = document.getElementById('dark-matter-value');

    if (speedSlider) speedSlider.value = String(sim.timeScale);
    if (gravitySlider) gravitySlider.value = String(sim.gravityConstant);
    if (darkMatterSlider) darkMatterSlider.value = String(sim.darkMatterStrength);
    if (speedValue) speedValue.textContent = sim.timeScale.toFixed(1) + 'x';
    if (gravityValue) gravityValue.textContent = sim.gravityConstant.toFixed(1);
    if (darkMatterValue) darkMatterValue.textContent = sim.darkMatterStrength.toFixed(1);
}

function populateSpawnTypeOptions() {
    const spawnTypeSelect = document.getElementById('spawn-type');
    if (!spawnTypeSelect || spawnTypeSelect.options.length > 0) {
        return;
    }

    for (const preset of getSpawnPresetDefinitions()) {
        const option = document.createElement('option');
        option.value = preset.key;
        option.textContent = preset.label;
        spawnTypeSelect.appendChild(option);
    }
}

function bootstrapSimulatorApp(scenarioName = 'sandbox') {
    const canvas = document.getElementById('canvas');
    populateSpawnTypeOptions();
    const sim = new Simulator(canvas);
    seedScenario(sim, scenarioName);

    document.getElementById('btn-play-pause').addEventListener('click', (e) => {
        sim.running = !sim.running;
        e.target.textContent = sim.running ? 'Pause' : 'Play';
        e.target.classList.toggle('active');
    });

    document.getElementById('btn-clear').addEventListener('click', () => {
        sim.clearAll();
    });

    document.getElementById('btn-reset-zoom').addEventListener('click', () => {
        sim.zoom = 1;
        sim.cameraX = -sim.canvas.width / 2;
        sim.cameraY = -sim.canvas.height / 2;
    });

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

    syncControlState(sim);
    sim.animate();
    return sim;
}

globalThis.Simulator = Simulator;
globalThis.Body = BrowserBody;
globalThis.SupernovaEffect = SupernovaEffect;
globalThis.seedScenario = seedScenario;
globalThis.bootstrapSimulatorApp = bootstrapSimulatorApp;
