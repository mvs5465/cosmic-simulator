// Shared simulation core used by both the browser runtime and Node tests.

(function(globalScope) {
    const BODY_TYPE_DEFINITIONS = Object.freeze([
        Object.freeze({
            key: 'debris',
            label: 'Debris',
            minMass: 0,
            maxMass: 5,
            radiusScale: 2,
            collisionRadiusMultiplier: 1,
            mergeDuration: 0.5,
            emitsExplosionOnMerge: true,
            spawnable: false,
        }),
        Object.freeze({
            key: 'asteroid',
            label: 'Asteroid',
            minMass: 5,
            maxMass: 20,
            radiusScale: 2,
            collisionRadiusMultiplier: 1,
            mergeDuration: 0.5,
            emitsExplosionOnMerge: true,
            spawnable: true,
        }),
        Object.freeze({
            key: 'planet',
            label: 'Planet',
            minMass: 20,
            maxMass: 60,
            radiusScale: 2,
            collisionRadiusMultiplier: 1,
            mergeDuration: 0.5,
            emitsExplosionOnMerge: true,
            spawnable: true,
        }),
        Object.freeze({
            key: 'gas-giant',
            label: 'Gas Giant',
            minMass: 60,
            maxMass: 150,
            radiusScale: 2,
            collisionRadiusMultiplier: 1,
            mergeDuration: 0.5,
            emitsExplosionOnMerge: true,
            spawnable: true,
        }),
        Object.freeze({
            key: 'star',
            label: 'Star',
            minMass: 150,
            maxMass: 1500,
            radiusScale: 2,
            collisionRadiusMultiplier: 1,
            mergeDuration: 0.5,
            emitsExplosionOnMerge: true,
            spawnable: true,
        }),
        Object.freeze({
            key: 'neutron-star',
            label: 'Neutron Star',
            minMass: 1500,
            maxMass: 3000,
            radiusScale: 0.6,
            collisionRadiusMultiplier: 1,
            mergeDuration: 0.5,
            emitsExplosionOnMerge: true,
            spawnable: true,
        }),
        Object.freeze({
            key: 'black-hole',
            label: 'Black Hole',
            minMass: 3000,
            maxMass: Infinity,
            radiusScale: 0.8,
            collisionRadiusMultiplier: 0.12,
            mergeDuration: 0.25,
            emitsExplosionOnMerge: false,
            spawnable: true,
        }),
    ]);
    const BODY_TYPE_CONFIG_BY_KEY = Object.freeze(Object.fromEntries(
        BODY_TYPE_DEFINITIONS.map((definition) => [definition.key, definition])
    ));
    const SPAWN_PRESET_DEFINITIONS = Object.freeze([
        Object.freeze({
            key: 'random',
            label: 'Random',
            minMass: BODY_TYPE_CONFIG_BY_KEY.asteroid.minMass,
            maxMass: BODY_TYPE_CONFIG_BY_KEY.star.minMass,
            menuOrder: 0,
        }),
        Object.freeze({
            key: 'asteroid',
            label: BODY_TYPE_CONFIG_BY_KEY.asteroid.label,
            minMass: BODY_TYPE_CONFIG_BY_KEY.asteroid.minMass,
            maxMass: BODY_TYPE_CONFIG_BY_KEY.planet.minMass,
            bodyType: 'asteroid',
            menuOrder: 1,
        }),
        Object.freeze({
            key: 'planet',
            label: BODY_TYPE_CONFIG_BY_KEY.planet.label,
            minMass: BODY_TYPE_CONFIG_BY_KEY.planet.minMass,
            maxMass: BODY_TYPE_CONFIG_BY_KEY['gas-giant'].minMass,
            bodyType: 'planet',
            menuOrder: 2,
        }),
        Object.freeze({
            key: 'gas-giant',
            label: BODY_TYPE_CONFIG_BY_KEY['gas-giant'].label,
            minMass: BODY_TYPE_CONFIG_BY_KEY['gas-giant'].minMass,
            maxMass: BODY_TYPE_CONFIG_BY_KEY.star.minMass,
            bodyType: 'gas-giant',
            menuOrder: 3,
        }),
        Object.freeze({
            key: 'star',
            label: BODY_TYPE_CONFIG_BY_KEY.star.label,
            minMass: BODY_TYPE_CONFIG_BY_KEY.star.minMass,
            maxMass: BODY_TYPE_CONFIG_BY_KEY['neutron-star'].minMass,
            bodyType: 'star',
            menuOrder: 4,
        }),
        Object.freeze({
            key: 'neutron-star',
            label: BODY_TYPE_CONFIG_BY_KEY['neutron-star'].label,
            minMass: BODY_TYPE_CONFIG_BY_KEY['neutron-star'].minMass,
            maxMass: BODY_TYPE_CONFIG_BY_KEY['black-hole'].minMass,
            bodyType: 'neutron-star',
            menuOrder: 5,
        }),
        Object.freeze({
            key: 'black-hole',
            label: BODY_TYPE_CONFIG_BY_KEY['black-hole'].label,
            minMass: BODY_TYPE_CONFIG_BY_KEY['black-hole'].minMass,
            maxMass: BODY_TYPE_CONFIG_BY_KEY['black-hole'].minMass * 2,
            bodyType: 'black-hole',
            menuOrder: 6,
        }),
        Object.freeze({
            key: 'supermassive-black-hole',
            label: 'Supermassive BH',
            minMass: 900000,
            maxMass: 1100000,
            bodyType: 'black-hole',
            menuOrder: 7,
        }),
    ]);
    const SPAWN_PRESET_CONFIG_BY_KEY = Object.freeze(Object.fromEntries(
        SPAWN_PRESET_DEFINITIONS.map((definition) => [definition.key, definition])
    ));

    function cloneDefinition(definition) {
        return { ...definition };
    }

    function getBodyTypeDefinitions() {
        return BODY_TYPE_DEFINITIONS.map(cloneDefinition);
    }

    function getBodyTypeConfig(bodyType) {
        const definition = BODY_TYPE_CONFIG_BY_KEY[bodyType];
        return definition ? cloneDefinition(definition) : null;
    }

    function getSpawnPresetDefinitions() {
        return SPAWN_PRESET_DEFINITIONS
            .slice()
            .sort((a, b) => a.menuOrder - b.menuOrder)
            .map(cloneDefinition);
    }

    function getSpawnPresetConfig(presetKey) {
        const definition = SPAWN_PRESET_CONFIG_BY_KEY[presetKey];
        return definition ? cloneDefinition(definition) : null;
    }

    function getRandomMassInRange(minMass, maxMass) {
        if (!isFinite(minMass) || !isFinite(maxMass) || maxMass <= minMass) {
            throw new Error(`Invalid mass range: ${minMass} - ${maxMass}`);
        }

        return minMass + Math.random() * (maxMass - minMass);
    }

    function getRandomMassForPreset(presetKey) {
        const preset = SPAWN_PRESET_CONFIG_BY_KEY[presetKey];
        if (!preset) {
            throw new Error(`Unknown spawn preset: ${presetKey}`);
        }

        return getRandomMassInRange(preset.minMass, preset.maxMass);
    }

    function getCircularOrbitSpeed(primaryMass, orbitalRadius, gravityConstant = 2) {
        if (!isFinite(primaryMass) || !isFinite(orbitalRadius) || orbitalRadius <= 0) {
            return 0;
        }

        return Math.sqrt((gravityConstant * primaryMass) / orbitalRadius);
    }

    function getBlackHoleRenderMetrics(screenRadius) {
        const normalizedRadius = Math.max(screenRadius, 1);
        const coreRadius = normalizedRadius * 0.24;
        const diskInnerRadius = normalizedRadius * 0.5;
        const diskOuterRadius = normalizedRadius;

        return {
            coreRadius,
            diskInnerRadius,
            diskOuterRadius,
        };
    }

    function shouldRenderBlackHoleFlares(body) {
        if (!body || body.bodyType !== 'black-hole') {
            return false;
        }

        return !body.isMerging;
    }

    function shouldDrawVelocityVector(body, threshold = 10) {
        if (!body || body.bodyType === 'black-hole') {
            return false;
        }

        const vx = body.vx ?? 0;
        const vy = body.vy ?? 0;
        return Math.hypot(vx, vy) > threshold;
    }

    function getBodyMergeVisualState(body) {
        return {
            scale: body?.mergeScale ?? 1,
            alpha: body?.mergeAlpha ?? 1,
        };
    }

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
            this.bodyType = bodyType;
            this.rotationAngle = Math.random() * Math.PI * 2;
            this.rotationSpeed = (Math.random() - 0.5) * 0.15;
            this.pulseTime = 0;
            this.supernovaTime = 0;
            this.isAnchored = false;
        }

        applyForce(fx, fy) {
            if (this.isAnchored) {
                return;
            }

            this.ax += fx / this.mass;
            this.ay += fy / this.mass;
        }

        update(dt) {
            if (this.isAnchored) {
                this.ax = 0;
                this.ay = 0;
                this.vx = 0;
                this.vy = 0;
                this.rotationAngle += this.rotationSpeed;
                this.pulseTime += dt;
                return;
            }

            this.vx += this.ax * dt;
            this.vy += this.ay * dt;
            this.x += this.vx * dt;
            this.y += this.vy * dt;
            this.ax = 0;
            this.ay = 0;
            this.rotationAngle += this.rotationSpeed;
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

    class ParticlePool {
        constructor(initialSize = 500) {
            this.available = [];
            this.active = [];

            for (let i = 0; i < initialSize; i++) {
                this.available.push(new Particle(0, 0, 0, 0, 1));
            }
        }

        acquire(x, y, vx, vy, lifetime) {
            let particle;

            if (this.available.length > 0) {
                particle = this.available.pop();
                particle.x = x;
                particle.y = y;
                particle.vx = vx;
                particle.vy = vy;
                particle.lifetime = lifetime;
                particle.maxLifetime = lifetime;
            } else {
                particle = new Particle(x, y, vx, vy, lifetime);
            }

            this.active.push(particle);
            return particle;
        }

        update(dt) {
            for (let i = this.active.length - 1; i >= 0; i--) {
                const particle = this.active[i];
                particle.update(dt);

                if (particle.lifetime <= 0) {
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
            this.explosionX = x;
            this.explosionY = y;
            this.explosionLocked = false;

            this.phase1Duration = 2.0;
            this.phase2Duration = 0.5;
            this.phase3Start = this.phase1Duration + this.phase2Duration;
            this.phase3Duration = 3.0;
            this.phase4Duration = this.duration - this.phase3Start - this.phase3Duration;

            if (this.body) {
                this.body.supernovaTime = this.duration;
            }
        }

        update(dt) {
            this.time += dt;

            if (this.body && this.time < this.phase3Start) {
                this.x = this.body.x;
                this.y = this.body.y;
            } else if (!this.explosionLocked) {
                this.explosionLocked = true;
                this.explosionX = this.x;
                this.explosionY = this.y;
            }
        }

        getProperties() {
            const t = this.time;

            if (t < this.phase1Duration) {
                const phase = t / this.phase1Duration;
                return {
                    radius: 50 * phase,
                    brightness: 0.8 * phase,
                    color: 'rgba(255, 200, 100, ',
                    particles: 0,
                    showWhiteSphere: true,
                    phase: 1,
                };
            }

            if (t < this.phase1Duration + this.phase2Duration) {
                return {
                    radius: 50 * 0.8,
                    brightness: 0,
                    color: 'rgba(0, 0, 0, ',
                    particles: 0,
                    showWhiteSphere: true,
                    phase: 2,
                };
            }

            if (t < this.phase3Start + this.phase3Duration) {
                const phase = (t - this.phase3Start) / this.phase3Duration;
                let brightness;

                if (phase < 0.33) {
                    brightness = 0.5 + (phase / 0.33) * 2.5;
                } else if (phase < 0.66) {
                    brightness = 3.0;
                } else {
                    brightness = 3.0 * (1 - (phase - 0.66) / 0.34);
                }

                return {
                    radius: Math.min(1200, 100 + 1100 * phase),
                    brightness: brightness,
                    color: 'rgba(255, 255, 255, ',
                    particles: Math.floor(150 * (1 - phase)),
                    showWhiteSphere: true,
                    phase: 3,
                };
            }

            const phase = (t - (this.phase3Start + this.phase3Duration)) / this.phase4Duration;
            const brightness = Math.max(0, 1.0 - phase * 0.8);
            return {
                radius: 1200,
                brightness: brightness,
                color: 'rgba(255, 150, 100, ',
                particles: 0,
                showWhiteSphere: false,
                phase: 4,
            };
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

            this.body1StartX = body1.x;
            this.body1StartY = body1.y;
            this.body2StartX = body2.x;
            this.body2StartY = body2.y;

            this.mergeX = mergedBody.x;
            this.mergeY = mergedBody.y;

            this.body1.isMerging = true;
            this.body2.isMerging = true;
        }

        update(dt) {
            this.time += dt;

            const phase = Math.min(1, this.time / this.duration);
            const easePhase = phase * phase;

            this.body1.x = this.body1StartX + (this.mergeX - this.body1StartX) * easePhase;
            this.body1.y = this.body1StartY + (this.mergeY - this.body1StartY) * easePhase;
            this.body2.x = this.body2StartX + (this.mergeX - this.body2StartX) * easePhase;
            this.body2.y = this.body2StartY + (this.mergeY - this.body2StartY) * easePhase;

            this.body1.mergeScale = 1 - easePhase;
            this.body2.mergeScale = 1 - easePhase;
            this.body1.mergeAlpha = 1 - easePhase;
            this.body2.mergeAlpha = 1 - easePhase;
            this.mergedBody.mergeScale = easePhase;
            this.mergedBody.mergeAlpha = easePhase;
        }

        isDone() {
            return this.time >= this.duration;
        }

        finish() {
            this.body1.isMerging = false;
            this.body2.isMerging = false;
            this.mergedBody.mergeScale = 1;
            this.mergedBody.mergeAlpha = 1;
        }
    }

    class SimulationCore {
        constructor(options = {}) {
            this.createBody = options.createBody || ((x, y, vx, vy, mass, radius, color, bodyType) => {
                return new Body(x, y, vx, vy, mass, radius, color, bodyType);
            });

            this.bodies = [];
            this.particlePool = new ParticlePool(1000);
            this.supernovaEffects = [];
            this.mergeEffects = [];
            this.running = true;
            this.gravityConstant = 2;
            this.timeScale = 2;

            this.darkMatterX = 0;
            this.darkMatterY = 0;
            this.darkMatterMass = 50;
            this.darkMatterStrength = 1.5;
            this.bodyTypeDefinitions = getBodyTypeDefinitions();
            this.spawnPresetDefinitions = getSpawnPresetDefinitions();
            this.massThresholds = {
                asteroid: BODY_TYPE_CONFIG_BY_KEY.asteroid.minMass,
                planet: BODY_TYPE_CONFIG_BY_KEY.planet.minMass,
                gasGiant: BODY_TYPE_CONFIG_BY_KEY['gas-giant'].minMass,
                star: BODY_TYPE_CONFIG_BY_KEY.star.minMass,
                neutronStar: BODY_TYPE_CONFIG_BY_KEY['neutron-star'].minMass,
                blackHole: BODY_TYPE_CONFIG_BY_KEY['black-hole'].minMass,
            };
        }

        getBodyType(mass) {
            for (let i = BODY_TYPE_DEFINITIONS.length - 1; i >= 0; i--) {
                const definition = BODY_TYPE_DEFINITIONS[i];
                if (mass >= definition.minMass) {
                    return definition.key;
                }
            }

            return BODY_TYPE_DEFINITIONS[0].key;
        }

        getRadiusFromMass(mass) {
            const bodyType = this.getBodyType(mass);
            const bodyConfig = BODY_TYPE_CONFIG_BY_KEY[bodyType] || BODY_TYPE_CONFIG_BY_KEY.planet;
            return Math.cbrt(mass) * bodyConfig.radiusScale;
        }

        getBodyConfig(bodyType) {
            return getBodyTypeConfig(bodyType);
        }

        getSpawnPresetConfig(presetKey) {
            return getSpawnPresetConfig(presetKey);
        }

        getRandomMassForPreset(presetKey) {
            return getRandomMassForPreset(presetKey);
        }

        spawnPlanet(x, y, mass = null) {
            if (mass === null) {
                mass = this.getRandomMassForPreset('random');
            }

            const radius = this.getRadiusFromMass(mass);
            const bodyType = this.getBodyType(mass);

            const radialAngle = Math.atan2(y, x);
            const orbitalDirection = Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
            const variance = (Math.random() - 0.5) * 0.4;
            const velocityAngle = radialAngle + orbitalDirection + variance;

            const speed = Math.random() * 15 + 5;
            const vx = Math.cos(velocityAngle) * speed;
            const vy = Math.sin(velocityAngle) * speed;

            const body = this.createBody(x, y, vx, vy, mass, radius, '#ffffff', bodyType);
            this.bodies.push(body);
            return body;
        }

        spawnBlackHole(x, y) {
            const mass = this.getRandomMassForPreset('black-hole');
            return this.spawnPlanet(x, y, mass);
        }

        spawnRandomCluster(x, y, count = 5) {
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * 100 + 50;
                const px = x + Math.cos(angle) * distance;
                const py = y + Math.sin(angle) * distance;
                const vx = Math.random() * 200 - 100;
                const vy = Math.random() * 200 - 100;
                const mass = Math.random() * 145 + 5;
                const radius = this.getRadiusFromMass(mass);
                const bodyType = this.getBodyType(mass);

                const body = this.createBody(px, py, vx, vy, mass, radius, '#ffffff', bodyType);
                this.bodies.push(body);
            }
        }

        update(dt) {
            if (!this.running) return;

            dt *= this.timeScale;

            for (let i = 0; i < this.bodies.length; i++) {
                for (let j = i + 1; j < this.bodies.length; j++) {
                    const b1 = this.bodies[i];
                    const b2 = this.bodies[j];

                    if (b1.isMerging || b2.isMerging) continue;

                    const dx = b2.x - b1.x;
                    const dy = b2.y - b1.y;
                    const distSq = dx * dx + dy * dy + 100;
                    const dist = Math.sqrt(distSq);

                    const force = (this.gravityConstant * b1.mass * b2.mass) / distSq;
                    const fx = (force * dx) / dist;
                    const fy = (force * dy) / dist;

                    b1.applyForce(fx, fy);
                    b2.applyForce(-fx, -fy);
                }
            }

            for (const body of this.bodies) {
                if (body.isMerging) continue;

                const dx = this.darkMatterX - body.x;
                const dy = this.darkMatterY - body.y;
                const distSq = dx * dx + dy * dy;

                if (distSq < 1) continue;

                const dist = Math.sqrt(distSq);
                const accelMagnitude = this.darkMatterStrength;
                const ax = (accelMagnitude * dx) / dist;
                const ay = (accelMagnitude * dy) / dist;

                body.applyForce(ax * body.mass, ay * body.mass);
            }

            for (const body of this.bodies) {
                if (body.isMerging) continue;
                body.update(dt);
            }

            this.handleCollisions();
            this.particlePool.update(dt);

            for (let i = this.supernovaEffects.length - 1; i >= 0; i--) {
                const effect = this.supernovaEffects[i];
                effect.update(dt);

                if (effect.isDone()) {
                    if (effect.body) {
                        effect.body.supernovaTime = 0;
                    }
                    this.supernovaEffects.splice(i, 1);
                }
            }

            for (let i = this.mergeEffects.length - 1; i >= 0; i--) {
                const effect = this.mergeEffects[i];
                effect.update(dt);

                if (effect.isDone()) {
                    effect.finish();
                    this.bodies = this.bodies.filter((body) => body !== effect.body1 && body !== effect.body2);
                    this.mergeEffects.splice(i, 1);
                }
            }

            this.bodies = this.bodies.filter((body) => {
                const distance = Math.sqrt(body.x * body.x + body.y * body.y);
                return distance < 10000;
            });
        }

        handleCollisions() {
            const mergedThisFrame = new Set();

            for (let i = 0; i < this.bodies.length; i++) {
                if (mergedThisFrame.has(i)) continue;

                for (let j = i + 1; j < this.bodies.length; j++) {
                    if (mergedThisFrame.has(i) || mergedThisFrame.has(j)) continue;

                    const b1 = this.bodies[i];
                    const b2 = this.bodies[j];

                    const dx = b2.x - b1.x;
                    const dy = b2.y - b1.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    const b1Config = BODY_TYPE_CONFIG_BY_KEY[b1.bodyType] || BODY_TYPE_CONFIG_BY_KEY.planet;
                    const b2Config = BODY_TYPE_CONFIG_BY_KEY[b2.bodyType] || BODY_TYPE_CONFIG_BY_KEY.planet;
                    const r1 = b1.radius * b1Config.collisionRadiusMultiplier;
                    const r2 = b2.radius * b2Config.collisionRadiusMultiplier;
                    const minDist = r1 + r2;

                    if (dist >= minDist) continue;

                    const totalMass = b1.mass + b2.mass;
                    let newVx = (b1.vx * b1.mass + b2.vx * b2.mass) / totalMass;
                    let newVy = (b1.vy * b1.mass + b2.vy * b2.mass) / totalMass;
                    let newX = (b1.x * b1.mass + b2.x * b2.mass) / totalMass;
                    let newY = (b1.y * b1.mass + b2.y * b2.mass) / totalMass;

                    const newRadius = this.getRadiusFromMass(totalMass);
                    const newBodyType = this.getBodyType(totalMass);
                    const oldBodyType = b1.bodyType;

                    const i1 = (2 / 5) * b1.mass * b1.radius * b1.radius;
                    const i2 = (2 / 5) * b2.mass * b2.radius * b2.radius;
                    const l1 = i1 * b1.rotationSpeed;
                    const l2 = i2 * b2.rotationSpeed;
                    const totalAngularMomentum = l1 + l2;
                    const newInertia = (2 / 5) * totalMass * newRadius * newRadius;
                    const newRotationSpeed = newInertia > 0 ? totalAngularMomentum / newInertia : 0;
                    const anchoredBody = b1.isAnchored ? b1 : (b2.isAnchored ? b2 : null);

                    if (anchoredBody) {
                        newX = anchoredBody.x;
                        newY = anchoredBody.y;
                        newVx = 0;
                        newVy = 0;
                    }

                    const mergedBody = this.createBody(newX, newY, newVx, newVy, totalMass, newRadius, '#fff', newBodyType);
                    mergedBody.rotationSpeed = newRotationSpeed;
                    mergedBody.mergeScale = 0;
                    mergedBody.mergeAlpha = 0;
                    mergedBody.isAnchored = Boolean(anchoredBody);
                    this.bodies.push(mergedBody);

                    const newBodyConfig = BODY_TYPE_CONFIG_BY_KEY[newBodyType] || BODY_TYPE_CONFIG_BY_KEY.planet;
                    const mergeDuration = newBodyConfig.mergeDuration;
                    this.mergeEffects.push(new MergeEffect(b1, b2, mergedBody, mergeDuration));

                    if (newBodyConfig.emitsExplosionOnMerge) {
                        const explosionIntensity = Math.min(2.0, totalMass / 50);
                        this.createExplosion(newX, newY, totalMass, explosionIntensity);
                    }

                    if (newBodyType === 'neutron-star' && oldBodyType === 'star') {
                        this.createSupernovaWithBody(newX, newY, newRadius, mergedBody);
                    }

                    mergedThisFrame.add(i);
                    mergedThisFrame.add(j);
                }
            }

            for (let i = this.bodies.length - 1; i >= 0; i--) {
                if (mergedThisFrame.has(i)) {
                    this.bodies.splice(i, 1);
                }
            }
        }

        createExplosion(x, y, mass, intensity = 1.0) {
            const baseParticleCount = Math.max(2, Math.min(mass * 0.2, 80));
            const particleCount = Math.floor(baseParticleCount * (0.7 + Math.random() * 0.6));
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
            this.supernovaEffects.push(new SupernovaEffect(x, y, body, 15.0));
            this.createExplosion(x, y, 50, 2.5);
        }

        createSupernova(x, y, radius) {
            this.createSupernovaWithBody(x, y, radius, null);
        }

        clearAll() {
            this.bodies = [];
            this.particlePool.clear();
            this.supernovaEffects = [];
            this.mergeEffects = [];
        }

        getTotalMass() {
            return this.bodies.reduce((sum, body) => sum + body.mass, 0).toFixed(1);
        }
    }

    const exported = {
        Body,
        Particle,
        ParticlePool,
        SupernovaEffect,
        MergeEffect,
        SimulationCore,
        getBodyTypeDefinitions,
        getBodyTypeConfig,
        getSpawnPresetDefinitions,
        getSpawnPresetConfig,
        getRandomMassInRange,
        getRandomMassForPreset,
        getCircularOrbitSpeed,
        getBlackHoleRenderMetrics,
        shouldRenderBlackHoleFlares,
        shouldDrawVelocityVector,
        getBodyMergeVisualState,
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = exported;
    }

    globalScope.CosmicSimulatorCore = exported;
})(typeof globalThis !== 'undefined' ? globalThis : this);
