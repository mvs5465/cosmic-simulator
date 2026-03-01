const coreExports = globalThis.CosmicSimulatorCore;

if (!coreExports) {
    throw new Error('sim-core.js must be loaded before sim.js');
}

const {
    Body,
    AccretionBurstEffect,
    KilonovaEffect,
    SupernovaEffect,
    SimulationCore,
    getSpawnClassConfig,
    getSpawnPresetDefinitions,
    getCircularOrbitSpeed,
    getBlackHoleRenderMetrics,
    shouldRenderBlackHoleFlares,
    shouldDrawVelocityVector,
    getBodyMergeVisualState,
} = coreExports;

function getStarMassFraction(mass) {
    const starClass = getSpawnClassConfig('star');
    const minMass = starClass ? starClass.minMass : 10;
    const maxMass = starClass ? starClass.maxMass : 50;
    const massRange = Math.max(1, maxMass - minMass);
    return Math.max(0, Math.min((mass - minMass) / massRange, 1));
}

function getStarColorChannels(mass) {
    const massFraction = getStarMassFraction(mass);
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

    return { red, green, blue, massFraction };
}

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
        this.compactGlowPhase = Math.random() * Math.PI * 2;
        this.compactFieldTilt = Math.random() * Math.PI * 2;
        this.compactHaloScale = 0.85 + Math.random() * 0.35;
        this.compactSparkleOffsets = Array.from({ length: 4 }, () => Math.random() * Math.PI * 2);
        this.applyVisualState(bodyType);
    }

    setState(nextState) {
        if (this.bodyType === nextState && this.state === nextState) {
            return;
        }

        super.setState(nextState);
        this.applyVisualState(nextState);
    }

    applyVisualState(bodyType = this.bodyType) {
        this.texture = null;
        this.asteroidVertices = null;
        this.blackHoleFlares = null;
        this.craters = null;

        if (bodyType === 'planet') {
            this.texture = this.generateEarthTexture(this.radius);
        } else if (bodyType === 'gas-giant') {
            this.texture = this.generateGasGiantTexture(this.radius);
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
            this.texture = this.generateStarTexture(this.radius, this.mass);
        } else if (bodyType === 'red-giant') {
            this.texture = this.generateRedGiantTexture(this.radius);
        } else if (bodyType === 'wolf-rayet') {
            this.texture = this.generateWolfRayetTexture(this.radius, this.mass);
        } else if (bodyType === 'white-dwarf') {
            this.texture = this.generateWhiteDwarfTexture(this.radius);
        } else if (bodyType === 'asteroid') {
            this.texture = this.generateAsteroidTexture(this.radius);
            this.asteroidVertices = this.generateAsteroidShape(this.radius);
            this.craters = Array.from({ length: 2 }, () => {
                const angle = Math.random() * Math.PI * 2;
                const distance = 0.4 + Math.random() * 0.3;
                const size = 0.1 + Math.random() * 0.1;
                return { angle, distance, size };
            });
        } else if (bodyType === 'neutron-star') {
            this.texture = this.generateNeutronStarTexture(this.radius);
        } else if (bodyType === 'black-hole') {
            this.texture = this.generateBlackHoleTexture(this.radius);
            this.blackHoleFlares = this.generateBlackHoleFlares(this.radius);
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
        const { red, green, blue } = getStarColorChannels(mass);

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

    generateRedGiantTexture(radius = this.radius) {
        const size = Math.ceil(radius * 4);
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const center = size / 2;

        const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);
        gradient.addColorStop(0, 'rgba(255, 245, 220, 1)');
        gradient.addColorStop(0.18, 'rgba(255, 215, 170, 0.98)');
        gradient.addColorStop(0.42, 'rgba(255, 140, 80, 0.7)');
        gradient.addColorStop(0.7, 'rgba(220, 80, 60, 0.32)');
        gradient.addColorStop(0.9, 'rgba(170, 45, 35, 0.1)');
        gradient.addColorStop(1, 'rgba(110, 25, 20, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        for (let i = 0; i < 5; i++) {
            ctx.strokeStyle = `rgba(255, ${140 + i * 12}, ${80 - i * 6}, ${0.04 + i * 0.012})`;
            ctx.lineWidth = Math.max(1, size * (0.02 + i * 0.003));
            ctx.beginPath();
            ctx.arc(center, center, center * (0.28 + i * 0.09), 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
        for (let i = 0; i < 4; i++) {
            const flareX = center + (Math.random() - 0.5) * center * 0.8;
            const flareY = center + (Math.random() - 0.5) * center * 0.8;
            const flareSize = size * (0.035 + Math.random() * 0.03);
            ctx.beginPath();
            ctx.arc(flareX, flareY, flareSize, 0, Math.PI * 2);
            ctx.fill();
        }

        return canvas;
    }

    generateWolfRayetTexture(radius = this.radius, mass = this.mass) {
        const size = Math.ceil(radius * 4);
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const center = size / 2;
        const { red, green, blue } = getStarColorChannels(mass);

        const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.18, `rgba(${red}, ${green}, ${blue}, 0.98)`);
        gradient.addColorStop(0.48, `rgba(${Math.min(255, red + 15)}, ${Math.min(255, green + 10)}, 255, 0.86)`);
        gradient.addColorStop(0.78, 'rgba(129, 140, 248, 0.52)');
        gradient.addColorStop(1, 'rgba(67, 56, 202, 0.15)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = Math.max(1, size * 0.03);
        for (let i = 0; i < 3; i++) {
            const swirlRadius = center * (0.34 + i * 0.12);
            ctx.beginPath();
            ctx.arc(center, center, swirlRadius, Math.PI * (0.18 + i * 0.1), Math.PI * (1.22 + i * 0.12));
            ctx.stroke();
        }

        return canvas;
    }

    generateWhiteDwarfTexture(radius = this.radius) {
        const size = Math.ceil(radius * 4);
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const center = size / 2;

        ctx.clearRect(0, 0, size, size);

        const haloGradient = ctx.createRadialGradient(center, center, 0, center, center, center);
        haloGradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        haloGradient.addColorStop(0.18, 'rgba(219, 234, 254, 0.95)');
        haloGradient.addColorStop(0.4, 'rgba(191, 219, 254, 0.55)');
        haloGradient.addColorStop(1, 'rgba(147, 197, 253, 0)');
        ctx.fillStyle = haloGradient;
        ctx.fillRect(0, 0, size, size);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.lineWidth = Math.max(1, size * 0.04);
        ctx.beginPath();
        ctx.arc(center, center, center * 0.28, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(191, 219, 254, 0.45)';
        ctx.lineWidth = Math.max(1, size * 0.025);
        ctx.beginPath();
        ctx.arc(center, center, center * 0.44, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = Math.max(1, size * 0.02);
        ctx.beginPath();
        ctx.moveTo(center - center * 0.78, center);
        ctx.lineTo(center + center * 0.78, center);
        ctx.moveTo(center, center - center * 0.78);
        ctx.lineTo(center, center + center * 0.78);
        ctx.moveTo(center - center * 0.58, center - center * 0.58);
        ctx.lineTo(center + center * 0.58, center + center * 0.58);
        ctx.moveTo(center + center * 0.58, center - center * 0.58);
        ctx.lineTo(center - center * 0.58, center + center * 0.58);
        ctx.stroke();

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

        ctx.clearRect(0, 0, size, size);

        const haloGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, size * 0.5);
        haloGradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        haloGradient.addColorStop(0.12, 'rgba(216, 180, 255, 0.92)');
        haloGradient.addColorStop(0.28, 'rgba(147, 197, 253, 0.7)');
        haloGradient.addColorStop(0.55, 'rgba(168, 85, 247, 0.28)');
        haloGradient.addColorStop(1, 'rgba(88, 28, 135, 0)');
        ctx.fillStyle = haloGradient;
        ctx.fillRect(0, 0, size, size);

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(this.compactFieldTilt);
        const jetGradient = ctx.createLinearGradient(0, -size * 0.8, 0, size * 0.8);
        jetGradient.addColorStop(0, 'rgba(196, 181, 253, 0)');
        jetGradient.addColorStop(0.18, 'rgba(196, 181, 253, 0.7)');
        jetGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
        jetGradient.addColorStop(0.82, 'rgba(196, 181, 253, 0.7)');
        jetGradient.addColorStop(1, 'rgba(196, 181, 253, 0)');
        ctx.strokeStyle = jetGradient;
        ctx.lineWidth = Math.max(1, size * 0.06);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.78);
        ctx.lineTo(0, -size * 0.18);
        ctx.moveTo(0, size * 0.18);
        ctx.lineTo(0, size * 0.78);
        ctx.stroke();
        ctx.restore();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = Math.max(1, size * 0.025);
        ctx.beginPath();
        ctx.arc(centerX, centerY, size * 0.16, 0, Math.PI * 2);
        ctx.stroke();

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
        this.defaultZoom = 4 / 3;
        this.zoom = this.defaultZoom;
        this.hoveredBody = null;
        this.animationFrameId = null;
        this.isDestroyed = false;
        this.controlCleanup = null;
        this.handleResize = () => this.resizeCanvas();
        this.handleWheel = null;
        this.handleCanvasClick = null;
        this.handleMouseMove = null;
        this.handleMouseLeave = null;

        this.resizeCanvas();
        window.addEventListener('resize', this.handleResize);
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

        const mass = this.getRandomMassForPreset(spawnType);
        if (spawnPreset.bodyState === 'star') {
            this.spawnStellarBody(worldX, worldY, mass, true);
            return;
        }

        this.spawnPlanet(worldX, worldY, mass, spawnPreset.bodyState || null);
    }

    setupInputControls() {
        this.handleWheel = (e) => {
            e.preventDefault();
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            this.zoom *= zoomFactor;
            this.zoom = Math.max(1 / 3, Math.min(this.zoom, 10));
            this.cameraX = -this.canvas.width / (2 * this.zoom);
            this.cameraY = -this.canvas.height / (2 * this.zoom);
        };
        this.canvas.addEventListener('wheel', this.handleWheel);

        this.handleCanvasClick = (e) => {
            this.handleClick(e);
        };
        this.canvas.addEventListener('click', this.handleCanvasClick);

        this.handleMouseMove = (e) => {
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
        };
        this.canvas.addEventListener('mousemove', this.handleMouseMove);

        this.handleMouseLeave = () => {
            this.hoveredBody = null;
        };
        this.canvas.addEventListener('mouseleave', this.handleMouseLeave);
    }

    setControlCleanup(cleanup) {
        this.controlCleanup = cleanup;
    }

    destroy() {
        if (this.isDestroyed) {
            return;
        }

        this.isDestroyed = true;
        this.running = false;

        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        window.removeEventListener('resize', this.handleResize);

        if (this.handleWheel) {
            this.canvas.removeEventListener('wheel', this.handleWheel);
        }
        if (this.handleCanvasClick) {
            this.canvas.removeEventListener('click', this.handleCanvasClick);
        }
        if (this.handleMouseMove) {
            this.canvas.removeEventListener('mousemove', this.handleMouseMove);
        }
        if (this.handleMouseLeave) {
            this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
        }

        if (typeof this.controlCleanup === 'function') {
            this.controlCleanup();
            this.controlCleanup = null;
        }

        this.hoveredBody = null;
    }

    spawnPlanet(x, y, mass = null, bodyType = null) {
        return super.spawnPlanet(x, y, mass, bodyType);
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

    getTrailColor(body) {
        switch (body.bodyType) {
        case 'debris':
        case 'asteroid':
            return { red: 180, green: 180, blue: 190 };
        case 'planet':
            return { red: 120, green: 220, blue: 255 };
        case 'gas-giant':
            return { red: 255, green: 190, blue: 120 };
        case 'star':
        case 'wolf-rayet':
            return getStarColorChannels(body.mass);
        case 'red-giant':
            return { red: 255, green: 150, blue: 90 };
        case 'white-dwarf':
            return { red: 219, green: 234, blue: 254 };
        case 'neutron-star':
            return { red: 100, green: 220, blue: 255 };
        case 'black-hole':
            return { red: 255, green: 180, blue: 90 };
        default:
            return { red: 220, green: 220, blue: 230 };
        }
    }

    drawTrails() {
        for (const body of this.bodies) {
            if (!body.trailPoints || body.trailPoints.length < 2) {
                continue;
            }

            const { red, green, blue } = this.getTrailColor(body);
            const lineWidth = Math.max(1, Math.min(4, body.radius * this.zoom * 0.08));

            for (let i = 1; i < body.trailPoints.length; i++) {
                const startPoint = body.trailPoints[i - 1];
                const endPoint = body.trailPoints[i];
                const startX = (startPoint.x - this.cameraX) * this.zoom;
                const startY = (startPoint.y - this.cameraY) * this.zoom;
                const endX = (endPoint.x - this.cameraX) * this.zoom;
                const endY = (endPoint.y - this.cameraY) * this.zoom;

                if ((startX < -100 && endX < -100) || (startX > this.canvas.width + 100 && endX > this.canvas.width + 100) ||
                    (startY < -100 && endY < -100) || (startY > this.canvas.height + 100 && endY > this.canvas.height + 100)) {
                    continue;
                }

                const alpha = (i / (body.trailPoints.length - 1)) * 0.28;
                this.ctx.strokeStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
                this.ctx.lineWidth = lineWidth;
                this.ctx.lineCap = 'round';
                this.ctx.beginPath();
                this.ctx.moveTo(startX, startY);
                this.ctx.lineTo(endX, endY);
                this.ctx.stroke();
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

        // Draw motion trails beneath bodies
        this.drawTrails();

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
            } else if (body.bodyType === 'star' || body.bodyType === 'red-giant' || body.bodyType === 'wolf-rayet') {
                const {
                    red: starRed,
                    green: starGreen,
                    blue: starBlue,
                    massFraction,
                } = getStarColorChannels(body.mass);
                const isRedGiant = body.bodyType === 'red-giant';
                const isWolfRayet = body.bodyType === 'wolf-rayet';
                const stellarPulse = Math.sin(body.pulseTime * (isWolfRayet ? (4 + body.instabilityProgress * 10) : (isRedGiant ? 0.8 : 1.8))) * 0.5 + 0.5;
                let glowBrightness = 0.2 + massFraction * 0.6;
                let glowRadius = 1.8 + massFraction * 1.2;
                let drawRadius = screenRadius;

                if (isRedGiant) {
                    glowBrightness = 0.34 + stellarPulse * 0.12;
                    glowRadius = 3.3 + stellarPulse * 0.45;
                    drawRadius = screenRadius * (1.9 + stellarPulse * 0.14);
                } else if (isWolfRayet) {
                    glowBrightness = 0.45 + body.instabilityProgress * 0.4 + stellarPulse * 0.25;
                    glowRadius = 2.3 + body.instabilityProgress * 0.9 + stellarPulse * 0.55;
                    drawRadius = screenRadius * (1.01 + stellarPulse * 0.08 + body.instabilityProgress * 0.06);
                }

                // Draw outer glow with star color - steeper gradient
                const glowGradient = this.ctx.createRadialGradient(screenX, screenY, drawRadius, screenX, screenY, drawRadius * glowRadius);
                const glowRed = isRedGiant ? 255 : starRed;
                const glowGreen = isRedGiant ? 145 : starGreen;
                const glowBlue = isRedGiant ? 90 : starBlue;
                glowGradient.addColorStop(0, `rgba(${glowRed}, ${glowGreen}, ${glowBlue}, ${glowBrightness})`);
                glowGradient.addColorStop(0.5, `rgba(${glowRed}, ${glowGreen}, ${glowBlue}, ${glowBrightness * 0.3})`);
                glowGradient.addColorStop(1, `rgba(${starRed}, ${starGreen}, ${starBlue}, 0)`);
                this.ctx.fillStyle = glowGradient;
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, drawRadius * glowRadius, 0, Math.PI * 2);
                this.ctx.fill();

                if (isWolfRayet) {
                    this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.18 + body.instabilityProgress * 0.22})`;
                    this.ctx.lineWidth = Math.max(1, drawRadius * (0.07 + body.instabilityProgress * 0.05));
                    this.ctx.beginPath();
                    this.ctx.arc(screenX, screenY, drawRadius * (1.12 + stellarPulse * 0.1), 0, Math.PI * 2);
                    this.ctx.stroke();
                }

                // Draw the star itself
                if (body.texture) {
                    this.ctx.save();
                    this.ctx.translate(screenX, screenY);
                    this.ctx.rotate(body.rotationAngle);

                    if (!isRedGiant) {
                        // Clip to circle
                        this.ctx.beginPath();
                        this.ctx.arc(0, 0, drawRadius, 0, Math.PI * 2);
                        this.ctx.clip();
                    }

                    this.ctx.drawImage(body.texture, -drawRadius, -drawRadius, drawRadius * 2, drawRadius * 2);
                    this.ctx.restore();
                } else {
                    if (isRedGiant) {
                        this.ctx.fillStyle = 'rgb(255, 140, 90)';
                    } else {
                        this.ctx.fillStyle = `rgb(${starRed}, ${starGreen}, ${starBlue})`;
                    }
                    this.ctx.beginPath();
                    this.ctx.arc(screenX, screenY, drawRadius, 0, Math.PI * 2);
                    this.ctx.fill();
                }

                // Draw highlight shine with increasing brightness
                const shineBrightness = isRedGiant ?
                    (0.12 + stellarPulse * 0.12) :
                    (0.2 + massFraction * 0.3 + (isWolfRayet ? body.instabilityProgress * 0.18 : 0));
                const shineGradient = this.ctx.createRadialGradient(screenX - drawRadius * 0.3, screenY - drawRadius * 0.3, 0, screenX, screenY, drawRadius);
                shineGradient.addColorStop(0, `rgba(255, 255, 255, ${shineBrightness})`);
                shineGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                this.ctx.fillStyle = shineGradient;
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, drawRadius, 0, Math.PI * 2);
                this.ctx.fill();
            } else if (body.bodyType === 'white-dwarf') {
                const twinklePhase = Math.sin(body.pulseTime * 2.2 + body.compactGlowPhase) * 0.5 + 0.5;
                const glowScale = 2.1 + twinklePhase * 0.7 * body.compactHaloScale;
                const spikeScale = 1.35 + twinklePhase * 0.85;
                const wdGlowGradient = this.ctx.createRadialGradient(screenX, screenY, screenRadius * 0.15, screenX, screenY, screenRadius * glowScale);
                wdGlowGradient.addColorStop(0, `rgba(255, 255, 255, ${0.95 - twinklePhase * 0.1})`);
                wdGlowGradient.addColorStop(0.2, `rgba(219, 234, 254, ${0.7 + twinklePhase * 0.15})`);
                wdGlowGradient.addColorStop(0.5, `rgba(191, 219, 254, ${0.28 + twinklePhase * 0.08})`);
                wdGlowGradient.addColorStop(1, 'rgba(96, 165, 250, 0)');
                this.ctx.fillStyle = wdGlowGradient;
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, screenRadius * glowScale, 0, Math.PI * 2);
                this.ctx.fill();

                if (body.texture) {
                    this.ctx.save();
                    this.ctx.translate(screenX, screenY);
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, screenRadius, 0, Math.PI * 2);
                    this.ctx.clip();
                    this.ctx.drawImage(body.texture, -screenRadius, -screenRadius, screenRadius * 2, screenRadius * 2);
                    this.ctx.restore();
                } else {
                    this.ctx.fillStyle = '#dbeafe';
                    this.ctx.beginPath();
                    this.ctx.arc(screenX, screenY, screenRadius, 0, Math.PI * 2);
                    this.ctx.fill();
                }

                const sparkleOffsets = body.compactSparkleOffsets || [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2];
                const spikeAngles = [0, Math.PI / 4, Math.PI / 2, Math.PI * 0.75];
                const baseSpikeLengths = [1.9, 1.45, 1.75, 1.3];

                for (let i = 0; i < spikeAngles.length; i++) {
                    const localPhase = Math.sin(body.pulseTime * 3.2 + sparkleOffsets[i]) * 0.5 + 0.5;
                    const localScale = (0.9 + localPhase * 0.95) * (0.85 + twinklePhase * 0.35);
                    const angle = spikeAngles[i];
                    const spikeLength = screenRadius * baseSpikeLengths[i] * localScale;
                    const dx = Math.cos(angle) * spikeLength;
                    const dy = Math.sin(angle) * spikeLength;

                    this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.18 + localPhase * 0.42})`;
                    this.ctx.lineWidth = Math.max(1, screenRadius * (0.08 + localPhase * 0.08));
                    this.ctx.beginPath();
                    this.ctx.moveTo(screenX - dx, screenY - dy);
                    this.ctx.lineTo(screenX + dx, screenY + dy);
                    this.ctx.stroke();
                }
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
                const jetLength = screenRadius * (2.8 + pulsePhase * 2.2);
                const jetWidth = Math.max(1.5, screenRadius * (0.16 + pulsePhase * 0.05));

                // Draw outer glow (bright blue-violet radiation halo)
                const nsGlowGradient = this.ctx.createRadialGradient(screenX, screenY, screenRadius * 0.2, screenX, screenY, screenRadius * glowRadius * (1.1 + body.compactHaloScale * 0.15));
                nsGlowGradient.addColorStop(0, `rgba(255, 255, 255, ${0.45 + glowBrightness * 0.35})`);
                nsGlowGradient.addColorStop(0.18, `rgba(216, 180, 255, ${glowBrightness * 0.92})`);
                nsGlowGradient.addColorStop(0.4, `rgba(147, 197, 253, ${glowBrightness * 0.58})`);
                nsGlowGradient.addColorStop(0.72, `rgba(168, 85, 247, ${glowBrightness * 0.22})`);
                nsGlowGradient.addColorStop(1, 'rgba(88, 28, 135, 0)');
                this.ctx.fillStyle = nsGlowGradient;
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, screenRadius * glowRadius * (1.1 + body.compactHaloScale * 0.15), 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.save();
                this.ctx.translate(screenX, screenY);
                this.ctx.rotate(body.compactFieldTilt + body.pulseTime * 0.6);
                const jetGradient = this.ctx.createLinearGradient(0, -jetLength, 0, jetLength);
                jetGradient.addColorStop(0, 'rgba(216, 180, 255, 0)');
                jetGradient.addColorStop(0.18, `rgba(216, 180, 255, ${0.42 + pulsePhase * 0.2})`);
                jetGradient.addColorStop(0.5, `rgba(255, 255, 255, ${0.12 + pulsePhase * 0.08})`);
                jetGradient.addColorStop(0.82, `rgba(216, 180, 255, ${0.42 + pulsePhase * 0.2})`);
                jetGradient.addColorStop(1, 'rgba(216, 180, 255, 0)');
                this.ctx.strokeStyle = jetGradient;
                this.ctx.lineWidth = jetWidth;
                this.ctx.lineCap = 'round';
                this.ctx.beginPath();
                this.ctx.moveTo(0, -jetLength);
                this.ctx.lineTo(0, -screenRadius * 0.65);
                this.ctx.moveTo(0, screenRadius * 0.65);
                this.ctx.lineTo(0, jetLength);
                this.ctx.stroke();

                for (let jetSide = -1; jetSide <= 1; jetSide += 2) {
                    for (let i = 0; i < 4; i++) {
                        const travel = ((body.pulseTime * 1.6) + (i * 0.21)) % 1;
                        const distance = screenRadius * 0.85 + (jetLength - screenRadius * 0.85) * travel;
                        const swirlOffset = Math.sin((body.pulseTime * 5) + (i * 1.1)) * screenRadius * (0.16 + travel * 0.12);
                        const knotX = swirlOffset;
                        const knotY = distance * jetSide;
                        const knotRadius = Math.max(1.5, screenRadius * (0.12 + (1 - travel) * 0.08));
                        const knotGradient = this.ctx.createRadialGradient(knotX, knotY, 0, knotX, knotY, knotRadius * 2.6);
                        knotGradient.addColorStop(0, `rgba(255, 255, 255, ${0.45 + (1 - travel) * 0.2})`);
                        knotGradient.addColorStop(0.4, `rgba(216, 180, 255, ${0.28 + (1 - travel) * 0.15})`);
                        knotGradient.addColorStop(1, 'rgba(168, 85, 247, 0)');
                        this.ctx.fillStyle = knotGradient;
                        this.ctx.beginPath();
                        this.ctx.arc(knotX, knotY, knotRadius * 2.6, 0, Math.PI * 2);
                        this.ctx.fill();
                    }
                }
                this.ctx.restore();

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
                nsShineGradient.addColorStop(0, `rgba(255, 255, 255, ${Math.min(1, body.pulseBrightnessMin + pulsePhase * shineDelta + 0.15)})`);
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

        // Draw accretion bursts ON TOP of bodies
        this.drawAccretionBurstEffects();

        // Draw kilonovas above bodies but below supernovas
        this.drawKilonovaEffects();

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
                const whiteRadius = Math.max((effect.displayRadius ?? effect.body.radius) * this.zoom, 3);
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

    drawAccretionBurstEffects() {
        for (const effect of this.accretionBurstEffects) {
            const props = effect.getProperties();
            const burstX = effect.positionLocked ? effect.lockedX : effect.x;
            const burstY = effect.positionLocked ? effect.lockedY : effect.y;
            const screenX = (burstX - this.cameraX) * this.zoom;
            const screenY = (burstY - this.cameraY) * this.zoom;
            const screenRadius = props.radius * this.zoom;

            const glow = this.ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, screenRadius);
            glow.addColorStop(0, `rgba(255, 245, 200, ${props.brightness * 0.9})`);
            glow.addColorStop(0.4, `rgba(255, 180, 90, ${props.brightness * 0.45})`);
            glow.addColorStop(1, 'rgba(255, 120, 40, 0)');
            this.ctx.fillStyle = glow;
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, screenRadius, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.strokeStyle = `rgba(255, 220, 150, ${props.brightness * 0.9})`;
            this.ctx.lineWidth = Math.max(2, props.ringWidth * this.zoom * 0.2);
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, screenRadius * 0.55, 0, Math.PI * 2);
            this.ctx.stroke();
        }
    }

    drawKilonovaEffects() {
        for (const effect of this.kilonovaEffects) {
            const props = effect.getProperties();
            const burstX = effect.positionLocked ? effect.lockedX : effect.x;
            const burstY = effect.positionLocked ? effect.lockedY : effect.y;
            const screenX = (burstX - this.cameraX) * this.zoom;
            const screenY = (burstY - this.cameraY) * this.zoom;
            const glowRadius = props.radius * this.zoom;
            const shellRadius = props.shellRadius * this.zoom;
            const secondaryShellRadius = props.secondaryShellRadius * this.zoom;
            const tertiaryShellRadius = props.tertiaryShellRadius * this.zoom;
            const innerShellRadius = props.innerShellRadius * this.zoom;
            const innerShellAlpha = props.shellFade * (0.6 + props.shimmer * 0.15);
            const primaryShellAlpha = props.shellFade * 0.78;
            const secondaryShellAlpha = props.shellFade * 0.42;
            const tertiaryShellAlpha = props.shellFade * 0.24;

            const glow = this.ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, glowRadius);
            glow.addColorStop(0, `rgba(255, 245, 220, ${props.brightness * 0.55})`);
            glow.addColorStop(0.22, `rgba(255, 190, 140, ${props.brightness * 0.4})`);
            glow.addColorStop(0.55, `rgba(255, 120, 180, ${props.brightness * 0.2})`);
            glow.addColorStop(1, 'rgba(200, 120, 255, 0)');
            this.ctx.fillStyle = glow;
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, glowRadius, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.strokeStyle = `rgba(255, 170, 220, ${props.brightness * tertiaryShellAlpha})`;
            this.ctx.lineWidth = Math.max(1, 2.5 * this.zoom * 0.12);
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, tertiaryShellRadius, 0, Math.PI * 2);
            this.ctx.stroke();

            this.ctx.strokeStyle = `rgba(255, 170, 220, ${props.brightness * secondaryShellAlpha})`;
            this.ctx.lineWidth = Math.max(1, 3 * this.zoom * 0.15);
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, secondaryShellRadius, 0, Math.PI * 2);
            this.ctx.stroke();

            this.ctx.strokeStyle = `rgba(255, 205, 150, ${props.brightness * primaryShellAlpha})`;
            this.ctx.lineWidth = Math.max(1.5, 6 * this.zoom * 0.15);
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, shellRadius, 0, Math.PI * 2);
            this.ctx.stroke();

            this.ctx.strokeStyle = `rgba(255, 235, 205, ${props.brightness * innerShellAlpha})`;
            this.ctx.lineWidth = Math.max(1, 4 * this.zoom * 0.12);
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, innerShellRadius, 0, Math.PI * 2);
            this.ctx.stroke();

            const plumePhase = Math.max(0, 1 - (props.phase / 0.33));
            if (plumePhase > 0) {
                this.ctx.save();
                this.ctx.translate(screenX, screenY);
                const spiralTime = Date.now() * 0.000075;
                const spiralArms = 3;
                const spiralTurns = 2.8 + props.shimmer * 0.8;
                const spiralStart = innerShellRadius * 0.55;
                const spiralEnd = shellRadius * (1.55 + props.shimmer * 0.35);

                this.ctx.rotate(spiralTime * 0.35 + props.shimmer * 0.25);

                for (let arm = 0; arm < spiralArms; arm++) {
                    const armOffset = (arm / spiralArms) * Math.PI * 2;

                    for (let i = 0; i < 6; i++) {
                        const travel = ((spiralTime * (0.028 + props.shimmer * 0.01)) + (i * 0.17) + (arm * 0.09)) % 1;
                        const radius = spiralStart + (spiralEnd - spiralStart) * travel;
                        const angle = armOffset + (travel * Math.PI * 2 * spiralTurns);
                        const knotX = Math.cos(angle) * radius;
                        const knotY = Math.sin(angle) * radius;
                        const knotRadius = Math.max(1.6, shellRadius * (0.045 + (1 - travel) * 0.035));
                        const knotGradient = this.ctx.createRadialGradient(knotX, knotY, 0, knotX, knotY, knotRadius * 3.4);
                        knotGradient.addColorStop(0, `rgba(255, 245, 220, ${props.brightness * plumePhase * (0.34 + (1 - travel) * 0.16)})`);
                        knotGradient.addColorStop(0.4, `rgba(255, 170, 220, ${props.brightness * plumePhase * (0.2 + (1 - travel) * 0.12)})`);
                        knotGradient.addColorStop(1, 'rgba(168, 85, 247, 0)');
                        this.ctx.fillStyle = knotGradient;
                        this.ctx.beginPath();
                        this.ctx.arc(knotX, knotY, knotRadius * 3.4, 0, Math.PI * 2);
                        this.ctx.fill();
                    }
                }
                this.ctx.restore();
            }
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
        this.zoom = this.defaultZoom;
        this.cameraX = -this.canvas.width / 2 / this.zoom;
        this.cameraY = -this.canvas.height / 2 / this.zoom;
    }

    createExplosion(x, y, mass, intensity = 1.0) {
        return super.createExplosion(x, y, mass, intensity);
    }

    createSupernovaWithBody(x, y, radius, body, displayRadius = null) {
        return super.createSupernovaWithBody(x, y, radius, body, displayRadius);
    }

    createSupernova(x, y, radius) {
        return super.createSupernova(x, y, radius);
    }

    createAccretionBurst(x, y, body, consumedMass) {
        return super.createAccretionBurst(x, y, body, consumedMass);
    }

    clearAll() {
        return super.clearAll();
    }

    getTotalMass() {
        return super.getTotalMass();
    }

    animate() {
        if (this.isDestroyed) {
            return;
        }

        const now = Date.now();
        const delta = (now - this.lastTime) / 1000;
        this.lastTime = now;

        // Cap delta to avoid huge jumps
        const dt = Math.min(delta, 0.016);

        this.update(dt);
        this.draw();
        this.updateStats();

        this.animationFrameId = requestAnimationFrame(() => {
            this.animationFrameId = null;
            this.animate();
        });
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

function chooseSolarResonancePeriodRatio() {
    const roll = Math.random();

    if (roll < 0.4) {
        return 4 / 3;
    }

    if (roll < 0.75) {
        return 3 / 2;
    }

    if (roll < 0.92) {
        return 5 / 4;
    }

    return 2;
}

function getSolarOrbitDistances(innerOrbit, outerOrbit, planetBlueprints) {
    const planetCount = planetBlueprints.length;
    if (planetCount <= 1) {
        return [innerOrbit];
    }

    const normalizedOrbitSteps = [1];

    for (let i = 1; i < planetCount; i++) {
        const baseRatio = chooseSolarResonancePeriodRatio();
        const jitter = 0.96 + Math.random() * 0.08;
        const nextStep = normalizedOrbitSteps[i - 1] * (baseRatio * jitter);
        normalizedOrbitSteps.push(nextStep);
    }

    const maxStep = normalizedOrbitSteps[normalizedOrbitSteps.length - 1];
    if (maxStep <= 1) {
        return [innerOrbit];
    }

    const logRange = Math.log(maxStep);
    const targetDistances = normalizedOrbitSteps.map((step) => {
        const resonanceProgress = Math.log(step) / logRange;
        const easedProgress = resonanceProgress <= 0 ? 0 : Math.sqrt(resonanceProgress);
        const blendedProgress = resonanceProgress * 0.45 + easedProgress * 0.55;
        return innerOrbit + (outerOrbit - innerOrbit) * blendedProgress;
    });
    const orbitDistances = [targetDistances[0]];

    for (let i = 1; i < targetDistances.length; i++) {
        const previousOrbit = orbitDistances[i - 1];
        const previousRadius = planetBlueprints[i - 1].radius;
        const currentRadius = planetBlueprints[i].radius;
        const zoneProgress = i / (planetCount - 1);
        const minGap = Math.max(18, previousRadius + currentRadius + 16 + ((1 - zoneProgress) * 20));
        orbitDistances.push(Math.max(targetDistances[i], previousOrbit + minGap));
    }

    const overflow = orbitDistances[orbitDistances.length - 1] - outerOrbit;
    if (overflow > 0) {
        for (let i = 1; i < orbitDistances.length; i++) {
            const reductionShare = i / (orbitDistances.length - 1);
            const reducedOrbit = orbitDistances[i] - (overflow * reductionShare);
            const previousOrbit = orbitDistances[i - 1];
            const previousRadius = planetBlueprints[i - 1].radius;
            const currentRadius = planetBlueprints[i].radius;
            const zoneProgress = i / (planetCount - 1);
            const minGap = Math.max(14, previousRadius + currentRadius + 12 + ((1 - zoneProgress) * 12));
            orbitDistances[i] = Math.max(reducedOrbit, previousOrbit + minGap);
        }
    }

    return orbitDistances;
}

function getSolarOrbitBodyType(orbitIndex, planetCount) {
    const zoneProgress = planetCount <= 1 ? 0 : orbitIndex / (planetCount - 1);
    const roll = Math.random();

    if (zoneProgress < 0.35) {
        if (roll < 0.2) {
            return 'asteroid';
        }
        return 'planet';
    }

    if (zoneProgress < 0.7) {
        if (roll < 0.15) {
            return 'asteroid';
        }
        if (roll < 0.75) {
            return 'planet';
        }
        return 'gas-giant';
    }

    if (roll < 0.1) {
        return 'asteroid';
    }
    if (roll < 0.45) {
        return 'planet';
    }
    return 'gas-giant';
}

function getSolarOrbitPhaseAngles(planetCount, orbitalDirection) {
    const basePhase = Math.random() * Math.PI * 2;
    const phaseStep = (Math.PI * 2) / planetCount;
    const jitterLimit = Math.min(0.14, phaseStep * 0.12);
    const phases = new Array(planetCount);
    const slotOrder = [];
    const midpoint = Math.floor(planetCount / 2);

    for (let offset = 0; offset < midpoint; offset++) {
        slotOrder.push(offset);
        slotOrder.push(offset + midpoint);
    }

    if (planetCount % 2 !== 0) {
        slotOrder.push(planetCount - 1);
    }

    for (let orbitIndex = 0; orbitIndex < planetCount; orbitIndex++) {
        const slotIndex = slotOrder[orbitIndex] % planetCount;
        const jitter = (Math.random() - 0.5) * 2 * jitterLimit;
        phases[orbitIndex] = basePhase + (phaseStep * slotIndex * orbitalDirection) + jitter;
    }

    return phases;
}

function getSolarPlanetBlueprints(sim, planetCount) {
    const blueprints = [];

    for (let i = 0; i < planetCount; i++) {
        const presetKey = getSolarOrbitBodyType(i, planetCount);
        const bodyType = presetKey === 'gas-giant' ? 'gas-giant' : null;
        const mass = sim.getRandomMassForPreset(presetKey);
        const radius = sim.getRadiusFromMass(mass, bodyType);
        blueprints.push({ presetKey, bodyType, mass, radius });
    }

    return blueprints;
}

function getSolarPlanetCount(innerOrbit, outerOrbit) {
    const requestedPlanetCount = Math.floor(Math.random() * 13) + 3;
    const orbitalSpan = Math.max(0, outerOrbit - innerOrbit);
    const spanLimitedMax = Math.max(3, Math.min(9, Math.floor(orbitalSpan / 30)));
    return Math.min(requestedPlanetCount, spanLimitedMax);
}

function getMaxZoomOutClusterRadius(sim) {
    const minimumZoom = 1 / 3;
    const maxZoomOutHalfWidth = sim.canvas.width / (2 * minimumZoom);
    const maxZoomOutHalfHeight = sim.canvas.height / (2 * minimumZoom);
    return Math.min(maxZoomOutHalfWidth, maxZoomOutHalfHeight) * 0.8;
}

function getGlobularClusterBlueprints(sim, starCount) {
    const blueprints = [];

    for (let i = 0; i < starCount; i++) {
        const mass = sim.getRandomMassForPreset('star');
        blueprints.push({
            mass,
            radius: sim.getRadiusFromMass(mass, 'star'),
        });
    }

    return blueprints;
}

function getGlobularClusterPositions(clusterRadius, blueprints) {
    const positions = [];

    for (let i = 0; i < blueprints.length; i++) {
        const radiusBias = Math.pow(Math.random(), 0.6);
        const distance = clusterRadius * radiusBias;
        const angle = Math.random() * Math.PI * 2;
        positions.push({
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance,
            distance,
            angle,
        });
    }

    positions.sort((a, b) => a.distance - b.distance);
    return positions;
}

function getGalaxyCoreOrbiterBlueprints(sim, orbiterCount) {
    const baseCount = Math.floor(orbiterCount / 3);
    const remainder = orbiterCount - baseCount * 3;
    const starCount = baseCount + (remainder > 0 ? 1 : 0);
    const compactObjectCount = baseCount + (remainder > 1 ? 1 : 0);
    const smallBlackHoleCount = baseCount;
    const blueprints = [];

    for (let i = 0; i < starCount; i++) {
        const mass = sim.getRandomMassForPreset('star');
        blueprints.push({
            bodyType: 'star',
            mass,
            radius: sim.getRadiusFromMass(mass, 'star'),
        });
    }

    for (let i = 0; i < compactObjectCount; i++) {
        const bodyType = Math.random() < 0.65 ? 'white-dwarf' : 'neutron-star';
        const mass = sim.getRandomMassForPreset(bodyType);
        blueprints.push({
            bodyType,
            mass,
            radius: sim.getRadiusFromMass(mass, bodyType),
        });
    }

    for (let i = 0; i < smallBlackHoleCount; i++) {
        const mass = sim.getRandomMassForPreset('black-hole');
        blueprints.push({
            bodyType: 'black-hole',
            mass,
            radius: sim.getRadiusFromMass(mass, 'black-hole'),
        });
    }

    for (let i = blueprints.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [blueprints[i], blueprints[j]] = [blueprints[j], blueprints[i]];
    }

    return blueprints;
}

function getGalaxyCoreOrbiterCount(innerOrbit, outerOrbit) {
    const requestedOrbiterCount = Math.floor(Math.random() * 26) + 15;
    const orbitalSpan = Math.max(0, outerOrbit - innerOrbit);
    const spanLimitedMax = Math.max(15, Math.min(32, Math.floor(orbitalSpan / 18)));
    return Math.min(requestedOrbiterCount, spanLimitedMax);
}

function getGalaxyCoreOrbitalVelocity(circularSpeed, preferCircular = false) {
    const eccentricity = preferCircular
        ? Math.random() * 0.12
        : 0.12 + Math.pow(Math.random(), 0.7) * 0.76;

    if (eccentricity < 0.12) {
        return {
            tangentialSpeed: circularSpeed * (0.96 + Math.random() * 0.08),
            radialSpeed: circularSpeed * ((Math.random() - 0.5) * 0.04),
            eccentricity,
        };
    }

    const isNearPeriapsis = Math.random() < 0.4;
    const tangentialFactor = isNearPeriapsis ? Math.sqrt(1 + eccentricity) : Math.sqrt(Math.max(0.12, 1 - eccentricity));
    const radialDirection = Math.random() < 0.5 ? -1 : 1;
    const radialFactor = eccentricity * (0.08 + Math.random() * 0.28) * radialDirection;

    return {
        tangentialSpeed: circularSpeed * tangentialFactor,
        radialSpeed: circularSpeed * radialFactor,
        eccentricity,
    };
}

function getGalaxyCorePositions(innerOrbit, outerOrbit, blueprints) {
    const positions = [];

    for (let i = 0; i < blueprints.length; i++) {
        const inwardBias = Math.pow(Math.random(), 1.4);
        const distance = innerOrbit + (outerOrbit - innerOrbit) * inwardBias;
        const angle = Math.random() * Math.PI * 2;
        positions.push({
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance,
            distance,
            angle,
        });
    }

    positions.sort((a, b) => a.distance - b.distance);

    for (let i = 1; i < positions.length; i++) {
        const previousPosition = positions[i - 1];
        const previousRadius = blueprints[i - 1].radius;
        const currentRadius = blueprints[i].radius;
        const zoneProgress = i / (positions.length - 1);
        const minimumGap = Math.max(14, previousRadius + currentRadius + 10 + ((1 - zoneProgress) * 8));
        positions[i].distance = Math.max(positions[i].distance, previousPosition.distance + minimumGap);
    }

    const overflow = positions[positions.length - 1].distance - outerOrbit;
    if (overflow > 0) {
        for (let i = 1; i < positions.length; i++) {
            const reductionShare = i / (positions.length - 1);
            const reducedDistance = positions[i].distance - (overflow * reductionShare);
            const previousPosition = positions[i - 1];
            const previousRadius = blueprints[i - 1].radius;
            const currentRadius = blueprints[i].radius;
            const minimumGap = Math.max(10, previousRadius + currentRadius + 8);
            positions[i].distance = Math.max(reducedDistance, previousPosition.distance + minimumGap);
        }
    }

    const finalOverflow = positions[positions.length - 1].distance - outerOrbit;
    if (finalOverflow > 0 && outerOrbit > innerOrbit) {
        const scale = (outerOrbit - innerOrbit) / (positions[positions.length - 1].distance - innerOrbit);
        for (const position of positions) {
            position.distance = innerOrbit + (position.distance - innerOrbit) * scale;
        }
    }

    for (const position of positions) {
        position.x = Math.cos(position.angle) * position.distance;
        position.y = Math.sin(position.angle) * position.distance;
    }

    return positions;
}

function balanceSystemMomentum(bodies) {
    let totalMass = 0;
    let totalMomentumX = 0;
    let totalMomentumY = 0;

    for (const body of bodies) {
        totalMass += body.mass;
        totalMomentumX += body.vx * body.mass;
        totalMomentumY += body.vy * body.mass;
    }

    if (totalMass <= 0) {
        return;
    }

    const velocityOffsetX = totalMomentumX / totalMass;
    const velocityOffsetY = totalMomentumY / totalMass;

    for (const body of bodies) {
        body.vx -= velocityOffsetX;
        body.vy -= velocityOffsetY;
    }
}

function seedSolarSystemScenario(sim) {
    sim.darkMatterStrength = 0;

    const starMass = sim.getRandomMassForPreset('star');
    const star = sim.spawnPlanet(0, 0, starMass, 'star');
    star.vx = 0;
    star.vy = 0;

    const halfViewportWidth = sim.canvas.width / (2 * sim.zoom);
    const innerOrbit = star.radius + 18;
    const outerOrbit = Math.max(innerOrbit + 24, halfViewportWidth * 0.75);
    const planetCount = getSolarPlanetCount(innerOrbit, outerOrbit);
    const orbitalDirection = Math.random() < 0.5 ? 1 : -1;
    const planetBlueprints = getSolarPlanetBlueprints(sim, planetCount);
    const orbitDistances = getSolarOrbitDistances(innerOrbit, outerOrbit, planetBlueprints);
    const phaseAngles = getSolarOrbitPhaseAngles(planetCount, orbitalDirection);
    const systemBodies = [star];

    for (let i = 0; i < planetCount; i++) {
        const blueprint = planetBlueprints[i];
        const orbitalDistance = orbitDistances[i];
        const angle = phaseAngles[i];
        const x = Math.cos(angle) * orbitalDistance;
        const y = Math.sin(angle) * orbitalDistance;
        const body = sim.spawnPlanet(x, y, blueprint.mass, blueprint.bodyType);
        const orbitalSpeed = getCircularOrbitSpeed(
            star.mass,
            orbitalDistance,
            sim.gravityConstant,
            sim.massRealizationScale
        );
        const tangentX = -Math.sin(angle) * orbitalDirection;
        const tangentY = Math.cos(angle) * orbitalDirection;

        body.vx = tangentX * orbitalSpeed;
        body.vy = tangentY * orbitalSpeed;
        systemBodies.push(body);
    }

    balanceSystemMomentum(systemBodies);
}

function seedGlobularClusterScenario(sim) {
    sim.darkMatterStrength = 0.25;

    const starCount = Math.floor(Math.random() * 21) + 20;
    const clusterRadius = getMaxZoomOutClusterRadius(sim);
    const blueprints = getGlobularClusterBlueprints(sim, starCount);
    const positions = getGlobularClusterPositions(clusterRadius, blueprints);
    const totalClusterMass = blueprints.reduce((sum, blueprint) => sum + blueprint.mass, 0);
    const tangentialDirection = Math.random() < 0.5 ? 1 : -1;
    const systemBodies = [];

    for (let i = 0; i < starCount; i++) {
        const blueprint = blueprints[i];
        const position = positions[i];
        const body = sim.spawnPlanet(position.x, position.y, blueprint.mass, 'star');
        const orbitalDistance = Math.max(position.distance, Math.max(blueprint.radius * 2, 20));
        const circularSpeed = getCircularOrbitSpeed(
            totalClusterMass * 0.18,
            orbitalDistance,
            sim.gravityConstant,
            sim.massRealizationScale
        );
        const speedVariance = 0.75 + Math.random() * 0.6;
        const radialJitter = (Math.random() - 0.5) * circularSpeed * 0.35;
        const tangentX = -Math.sin(position.angle) * tangentialDirection;
        const tangentY = Math.cos(position.angle) * tangentialDirection;
        const radialX = Math.cos(position.angle);
        const radialY = Math.sin(position.angle);

        body.vx = tangentX * circularSpeed * speedVariance + radialX * radialJitter;
        body.vy = tangentY * circularSpeed * speedVariance + radialY * radialJitter;
        systemBodies.push(body);
    }

    balanceSystemMomentum(systemBodies);
}

function seedGalaxyCoreScenario(sim) {
    sim.darkMatterStrength = 0;

    const coreMass = sim.getRandomMassForPreset('supermassive-black-hole');
    const core = sim.spawnPlanet(0, 0, coreMass, 'black-hole');
    core.vx = 0;
    core.vy = 0;

    const maxOrbitRadius = getMaxZoomOutClusterRadius(sim) * 0.7;
    const innerOrbit = core.radius + 40;
    const outerOrbit = Math.max(innerOrbit + 60, maxOrbitRadius);
    const orbiterCount = getGalaxyCoreOrbiterCount(innerOrbit, outerOrbit);
    const orbitalDirection = Math.random() < 0.5 ? 1 : -1;
    const blueprints = getGalaxyCoreOrbiterBlueprints(sim, orbiterCount);
    const positions = getGalaxyCorePositions(innerOrbit, outerOrbit, blueprints);
    const systemBodies = [core];
    const nearCircularCount = Math.max(1, Math.floor(blueprints.length * 0.2));

    for (let i = 0; i < blueprints.length; i++) {
        const blueprint = blueprints[i];
        const position = positions[i];
        const body = sim.spawnPlanet(position.x, position.y, blueprint.mass, blueprint.bodyType);
        const orbitalDistance = Math.max(position.distance, Math.max(blueprint.radius * 2, innerOrbit));
        const orbitalSpeed = getCircularOrbitSpeed(
            core.mass,
            orbitalDistance,
            sim.gravityConstant,
            sim.massRealizationScale
        );
        const orbitalVelocity = getGalaxyCoreOrbitalVelocity(orbitalSpeed, i < nearCircularCount);
        const tangentX = -Math.sin(position.angle) * orbitalDirection;
        const tangentY = Math.cos(position.angle) * orbitalDirection;
        const radialX = Math.cos(position.angle);
        const radialY = Math.sin(position.angle);

        body.vx = tangentX * orbitalVelocity.tangentialSpeed + radialX * orbitalVelocity.radialSpeed;
        body.vy = tangentY * orbitalVelocity.tangentialSpeed + radialY * orbitalVelocity.radialSpeed;
        systemBodies.push(body);
    }

    balanceSystemMomentum(systemBodies);
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

    if (scenarioName === 'globular-cluster') {
        seedGlobularClusterScenario(sim);
        return;
    }

    if (scenarioName === 'galaxy-core') {
        seedGalaxyCoreScenario(sim);
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

    const playPauseButton = document.getElementById('btn-play-pause');
    const clearButton = document.getElementById('btn-clear');
    const resetZoomButton = document.getElementById('btn-reset-zoom');
    const speedSlider = document.getElementById('speed-slider');
    const gravitySlider = document.getElementById('gravity-slider');
    const darkMatterSlider = document.getElementById('dark-matter-slider');

    const handlePlayPause = (e) => {
        sim.running = !sim.running;
        e.target.textContent = sim.running ? 'Pause' : 'Play';
        e.target.classList.toggle('active');
    };

    const handleClear = () => {
        sim.clearAll();
    };

    const handleResetZoom = () => {
        sim.zoom = sim.defaultZoom;
        sim.cameraX = -sim.canvas.width / (2 * sim.zoom);
        sim.cameraY = -sim.canvas.height / (2 * sim.zoom);
    };

    const handleSpeedInput = (e) => {
        sim.timeScale = parseFloat(e.target.value);
        document.getElementById('speed-value').textContent = sim.timeScale.toFixed(1) + 'x';
    };

    const handleGravityInput = (e) => {
        sim.gravityConstant = parseFloat(e.target.value);
        document.getElementById('gravity-value').textContent = sim.gravityConstant.toFixed(1);
    };

    const handleDarkMatterInput = (e) => {
        sim.darkMatterStrength = parseFloat(e.target.value);
        document.getElementById('dark-matter-value').textContent = sim.darkMatterStrength.toFixed(1);
    };

    playPauseButton.addEventListener('click', handlePlayPause);
    clearButton.addEventListener('click', handleClear);
    resetZoomButton.addEventListener('click', handleResetZoom);
    speedSlider.addEventListener('input', handleSpeedInput);
    gravitySlider.addEventListener('input', handleGravityInput);
    darkMatterSlider.addEventListener('input', handleDarkMatterInput);

    sim.setControlCleanup(() => {
        playPauseButton.removeEventListener('click', handlePlayPause);
        clearButton.removeEventListener('click', handleClear);
        resetZoomButton.removeEventListener('click', handleResetZoom);
        speedSlider.removeEventListener('input', handleSpeedInput);
        gravitySlider.removeEventListener('input', handleGravityInput);
        darkMatterSlider.removeEventListener('input', handleDarkMatterInput);
    });

    syncControlState(sim);
    sim.animate();
    return sim;
}

globalThis.Simulator = Simulator;
globalThis.Body = BrowserBody;
globalThis.AccretionBurstEffect = AccretionBurstEffect;
globalThis.KilonovaEffect = KilonovaEffect;
globalThis.SupernovaEffect = SupernovaEffect;
globalThis.seedScenario = seedScenario;
globalThis.bootstrapSimulatorApp = bootstrapSimulatorApp;
