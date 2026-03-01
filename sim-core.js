// Shared simulation core used by both the browser runtime and Node tests.

(function(globalScope) {
    const MASS_UNIT_LABEL = 'Me';
    const MASS_REALIZATION_SCALE = 25;
    const EVOLUTION_RULES = Object.freeze({
        stellarCollapse: Object.freeze({
            thresholdMass: 50,
            blackHoleThresholdMass: 90,
            neutronStarProfile: 'core-collapse',
            blackHoleProfile: 'hypernova',
        }),
        redGiant: Object.freeze({
            lowerMass: 12,
            upperMass: 24,
            spawnChance: 0.28,
        }),
        wolfRayet: Object.freeze({
            lowerMass: 38,
            upperMass: 50,
            blackHoleThresholdMass: 44,
            lifetimeMin: 10,
            lifetimeMax: 20,
            neutronStarMassRetention: 0.42,
            blackHoleMassRetention: 0.68,
        }),
        stellarSpawn: Object.freeze({
            lowMassWeight: 0.58,
            midMassWeight: 0.27,
            highMassWeight: 0.11,
            wolfRayetWeight: 0.04,
            lowMassUpper: 18,
            midMassUpper: 30,
            highMassUpper: 38,
        }),
        whiteDwarf: Object.freeze({
            lowerMass: 0.6,
            upperMass: 1.4,
        }),
        neutronStar: Object.freeze({
            lowerMass: 8,
            upperMass: 25,
            collapseToBlackHoleMass: 30,
        }),
        blackHole: Object.freeze({
            lowerMass: 20,
        }),
    });
    const SPAWN_CLASS_DEFINITIONS = Object.freeze([
        Object.freeze({
            key: 'debris',
            label: 'Debris',
            minMass: 0,
            maxMass: 0.05,
            defaultState: 'debris',
        }),
        Object.freeze({
            key: 'asteroid',
            label: 'Asteroid',
            minMass: 0.05,
            maxMass: 0.5,
            defaultState: 'asteroid',
        }),
        Object.freeze({
            key: 'planet',
            label: 'Planet',
            minMass: 0.5,
            maxMass: 2,
            defaultState: 'planet',
        }),
        Object.freeze({
            key: 'gas-giant',
            label: 'Gas Giant',
            minMass: 2,
            maxMass: 10,
            defaultState: 'gas-giant',
        }),
        Object.freeze({
            key: 'star',
            label: 'Star',
            minMass: 10,
            maxMass: 50,
            defaultState: 'star',
        }),
    ]);
    const SPAWN_CLASS_CONFIG_BY_KEY = Object.freeze(Object.fromEntries(
        SPAWN_CLASS_DEFINITIONS.map((definition) => [definition.key, definition])
    ));
    const BODY_STATE_DEFINITIONS = Object.freeze([
        Object.freeze({
            key: 'debris',
            label: 'Debris',
            radiusScale: 2,
            collisionRadiusMultiplier: 1,
            mergeDuration: 0.25,
            emitsExplosionOnMerge: true,
            isCompact: false,
        }),
        Object.freeze({
            key: 'asteroid',
            label: 'Asteroid',
            radiusScale: 2,
            collisionRadiusMultiplier: 1,
            mergeDuration: 0.25,
            emitsExplosionOnMerge: true,
            isCompact: false,
        }),
        Object.freeze({
            key: 'planet',
            label: 'Planet',
            radiusScale: 2.5,
            collisionRadiusMultiplier: 1,
            mergeDuration: 0.25,
            emitsExplosionOnMerge: true,
            isCompact: false,
        }),
        Object.freeze({
            key: 'gas-giant',
            label: 'Gas Giant',
            radiusScale: 3,
            collisionRadiusMultiplier: 1,
            mergeDuration: 0.25,
            emitsExplosionOnMerge: true,
            isCompact: false,
        }),
        Object.freeze({
            key: 'star',
            label: 'Star',
            radiusScale: 5,
            collisionRadiusMultiplier: 1,
            mergeDuration: 0.25,
            emitsExplosionOnMerge: true,
            isCompact: false,
        }),
        Object.freeze({
            key: 'red-giant',
            label: 'Red Giant',
            radiusScale: 8.5,
            collisionRadiusMultiplier: 1.15,
            mergeDuration: 0.3,
            emitsExplosionOnMerge: true,
            isCompact: false,
        }),
        Object.freeze({
            key: 'wolf-rayet',
            label: 'Wolf-Rayet',
            radiusScale: 5.8,
            collisionRadiusMultiplier: 1,
            mergeDuration: 0.25,
            emitsExplosionOnMerge: true,
            isCompact: false,
        }),
        Object.freeze({
            key: 'white-dwarf',
            label: 'White Dwarf',
            radiusScale: 2.2,
            collisionRadiusMultiplier: 1,
            mergeDuration: 0.25,
            emitsExplosionOnMerge: true,
            isCompact: true,
        }),
        Object.freeze({
            key: 'neutron-star',
            label: 'Neutron Star',
            radiusScale: 1.2,
            collisionRadiusMultiplier: 1,
            mergeDuration: 0.25,
            emitsExplosionOnMerge: true,
            isCompact: true,
        }),
        Object.freeze({
            key: 'black-hole',
            label: 'Black Hole',
            radiusScale: 1.6,
            collisionRadiusMultiplier: 0.12,
            mergeDuration: 0.125,
            emitsExplosionOnMerge: false,
            isCompact: true,
        }),
    ]);
    const BODY_STATE_CONFIG_BY_KEY = Object.freeze(Object.fromEntries(
        BODY_STATE_DEFINITIONS.map((definition) => [definition.key, definition])
    ));
    const SPAWN_PRESET_DEFINITIONS = Object.freeze([
        Object.freeze({
            key: 'random',
            label: 'Random',
            minMass: SPAWN_CLASS_CONFIG_BY_KEY.asteroid.minMass,
            maxMass: SPAWN_CLASS_CONFIG_BY_KEY.star.minMass,
            menuOrder: 0,
        }),
        Object.freeze({
            key: 'asteroid',
            label: SPAWN_CLASS_CONFIG_BY_KEY.asteroid.label,
            minMass: SPAWN_CLASS_CONFIG_BY_KEY.asteroid.minMass,
            maxMass: SPAWN_CLASS_CONFIG_BY_KEY.planet.minMass,
            bodyState: 'asteroid',
            menuOrder: 1,
        }),
        Object.freeze({
            key: 'planet',
            label: SPAWN_CLASS_CONFIG_BY_KEY.planet.label,
            minMass: SPAWN_CLASS_CONFIG_BY_KEY.planet.minMass,
            maxMass: SPAWN_CLASS_CONFIG_BY_KEY['gas-giant'].minMass,
            bodyState: 'planet',
            menuOrder: 2,
        }),
        Object.freeze({
            key: 'gas-giant',
            label: SPAWN_CLASS_CONFIG_BY_KEY['gas-giant'].label,
            minMass: SPAWN_CLASS_CONFIG_BY_KEY['gas-giant'].minMass,
            maxMass: SPAWN_CLASS_CONFIG_BY_KEY.star.minMass,
            bodyState: 'gas-giant',
            menuOrder: 3,
        }),
        Object.freeze({
            key: 'star',
            label: BODY_STATE_CONFIG_BY_KEY.star.label,
            minMass: SPAWN_CLASS_CONFIG_BY_KEY.star.minMass,
            maxMass: SPAWN_CLASS_CONFIG_BY_KEY.star.maxMass,
            bodyState: 'star',
            menuOrder: 4,
        }),
        Object.freeze({
            key: 'red-giant',
            label: BODY_STATE_CONFIG_BY_KEY['red-giant'].label,
            minMass: EVOLUTION_RULES.redGiant.lowerMass,
            maxMass: EVOLUTION_RULES.redGiant.upperMass,
            bodyState: 'red-giant',
            menuOrder: 5,
        }),
        Object.freeze({
            key: 'wolf-rayet',
            label: BODY_STATE_CONFIG_BY_KEY['wolf-rayet'].label,
            minMass: EVOLUTION_RULES.wolfRayet.lowerMass,
            maxMass: EVOLUTION_RULES.wolfRayet.upperMass,
            bodyState: 'wolf-rayet',
            menuOrder: 6,
        }),
        Object.freeze({
            key: 'white-dwarf',
            label: BODY_STATE_CONFIG_BY_KEY['white-dwarf'].label,
            minMass: EVOLUTION_RULES.whiteDwarf.lowerMass,
            maxMass: EVOLUTION_RULES.whiteDwarf.upperMass,
            bodyState: 'white-dwarf',
            menuOrder: 7,
        }),
        Object.freeze({
            key: 'neutron-star',
            label: BODY_STATE_CONFIG_BY_KEY['neutron-star'].label,
            minMass: EVOLUTION_RULES.neutronStar.lowerMass,
            maxMass: EVOLUTION_RULES.neutronStar.upperMass,
            bodyState: 'neutron-star',
            menuOrder: 8,
        }),
        Object.freeze({
            key: 'black-hole',
            label: BODY_STATE_CONFIG_BY_KEY['black-hole'].label,
            minMass: EVOLUTION_RULES.blackHole.lowerMass,
            maxMass: 120,
            bodyState: 'black-hole',
            menuOrder: 9,
        }),
        Object.freeze({
            key: 'supermassive-black-hole',
            label: 'Supermassive BH',
            minMass: 8000,
            maxMass: 20000,
            bodyState: 'black-hole',
            menuOrder: 10,
        }),
    ]);
    const SPAWN_PRESET_CONFIG_BY_KEY = Object.freeze(Object.fromEntries(
        SPAWN_PRESET_DEFINITIONS.map((definition) => [definition.key, definition])
    ));

    function cloneDefinition(definition) {
        return { ...definition };
    }

    function getBodyTypeDefinitions() {
        return BODY_STATE_DEFINITIONS.map(cloneDefinition);
    }

    function getBodyTypeConfig(bodyType) {
        const definition = BODY_STATE_CONFIG_BY_KEY[bodyType];
        return definition ? cloneDefinition(definition) : null;
    }

    function getSpawnClassDefinitions() {
        return SPAWN_CLASS_DEFINITIONS.map(cloneDefinition);
    }

    function getSpawnClassConfig(spawnClass) {
        const definition = SPAWN_CLASS_CONFIG_BY_KEY[spawnClass];
        return definition ? cloneDefinition(definition) : null;
    }

    function getEvolutionRules() {
        return JSON.parse(JSON.stringify(EVOLUTION_RULES));
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

    function getRandomStellarMass() {
        const starClass = SPAWN_CLASS_CONFIG_BY_KEY.star;
        const spawn = EVOLUTION_RULES.stellarSpawn;
        const roll = Math.random();
        let minMass = starClass.minMass;
        let maxMass = spawn.lowMassUpper;
        let skew = 1.4;
        let threshold = spawn.lowMassWeight;

        if (roll >= threshold) {
            minMass = spawn.lowMassUpper;
            maxMass = spawn.midMassUpper;
            skew = 1.25;
            threshold += spawn.midMassWeight;
        }

        if (roll >= threshold) {
            minMass = spawn.midMassUpper;
            maxMass = spawn.highMassUpper;
            skew = 1.1;
            threshold += spawn.highMassWeight;
        }

        if (roll >= threshold) {
            minMass = EVOLUTION_RULES.wolfRayet.lowerMass;
            maxMass = SPAWN_CLASS_CONFIG_BY_KEY.star.maxMass;
            skew = 1;
        }

        const localRoll = Math.pow(Math.random(), skew);
        return minMass + localRoll * (maxMass - minMass);
    }

    function getRandomMassForPreset(presetKey) {
        const preset = SPAWN_PRESET_CONFIG_BY_KEY[presetKey];
        if (!preset) {
            throw new Error(`Unknown spawn preset: ${presetKey}`);
        }

        if (presetKey === 'star') {
            return getRandomStellarMass();
        }

        return getRandomMassInRange(preset.minMass, preset.maxMass);
    }

    function getSpawnClassForMass(mass) {
        for (const definition of SPAWN_CLASS_DEFINITIONS) {
            if (mass < definition.maxMass) {
                return definition.key;
            }
        }

        return SPAWN_CLASS_DEFINITIONS[SPAWN_CLASS_DEFINITIONS.length - 1].key;
    }

    function getNaturalBodyStateForMass(mass) {
        const spawnClass = getSpawnClassForMass(mass);
        const definition = SPAWN_CLASS_CONFIG_BY_KEY[spawnClass];
        if (!definition) {
            return 'planet';
        }

        if (definition.key === 'star' && mass >= EVOLUTION_RULES.wolfRayet.lowerMass) {
            return 'wolf-rayet';
        }

        return definition.defaultState;
    }

    function getRandomStellarStateForMass(mass) {
        if (mass >= EVOLUTION_RULES.wolfRayet.lowerMass) {
            return 'wolf-rayet';
        }

        if (
            mass >= EVOLUTION_RULES.redGiant.lowerMass &&
            mass <= EVOLUTION_RULES.redGiant.upperMass &&
            Math.random() < EVOLUTION_RULES.redGiant.spawnChance
        ) {
            return 'red-giant';
        }

        return 'star';
    }

    function resolveCollapsedRemnantState(mass) {
        if (mass >= EVOLUTION_RULES.stellarCollapse.blackHoleThresholdMass) {
            return 'black-hole';
        }

        if (mass >= EVOLUTION_RULES.stellarCollapse.thresholdMass) {
            return 'neutron-star';
        }

        return 'star';
    }

    function getSupernovaProfileForState(state) {
        if (state === 'black-hole') {
            return EVOLUTION_RULES.stellarCollapse.blackHoleProfile;
        }

        if (state === 'neutron-star') {
            return EVOLUTION_RULES.stellarCollapse.neutronStarProfile;
        }

        return null;
    }

    function getRealizedMass(mass, massScale = MASS_REALIZATION_SCALE) {
        return Math.max(0, mass) * massScale;
    }

    function getCircularOrbitSpeed(primaryMass, orbitalRadius, gravityConstant = 2, massScale = 1) {
        if (!isFinite(primaryMass) || !isFinite(orbitalRadius) || orbitalRadius <= 0) {
            return 0;
        }

        return Math.sqrt((gravityConstant * getRealizedMass(primaryMass, massScale)) / orbitalRadius);
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
        return false;
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
            this.state = bodyType;
            this.spawnClass = null;
            this.evolutionStage = 'stable';
            this.supernovaProfile = null;
            this.rotationAngle = Math.random() * Math.PI * 2;
            this.rotationSpeed = (Math.random() - 0.5) * 0.15;
            this.pulseTime = 0;
            this.supernovaTime = 0;
            this.lifetimeRemaining = null;
            this.maxLifetime = null;
            this.instabilityProgress = 0;
            this.isAnchored = false;
            this.maxTrailPoints = 24;
            this.trailMinSegmentLength = Math.max(2, radius * 0.4);
            this.trailPoints = [{ x, y }];
        }

        setState(nextState) {
            this.bodyType = nextState;
            this.state = nextState;
        }

        applyForce(fx, fy) {
            if (this.isAnchored) {
                return;
            }

            this.ax += fx / this.mass;
            this.ay += fy / this.mass;
        }

        recordTrailPoint(force = false) {
            const lastPoint = this.trailPoints[this.trailPoints.length - 1];

            if (!lastPoint) {
                this.trailPoints.push({ x: this.x, y: this.y });
                return;
            }

            const dx = this.x - lastPoint.x;
            const dy = this.y - lastPoint.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (!force && distance < this.trailMinSegmentLength) {
                return;
            }

            this.trailPoints.push({ x: this.x, y: this.y });

            while (this.trailPoints.length > this.maxTrailPoints) {
                this.trailPoints.shift();
            }
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
            this.recordTrailPoint();
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
        constructor(x, y, body = null, duration = 7.5, displayRadius = null) {
            this.x = x;
            this.y = y;
            this.body = body;
            this.time = 0;
            this.duration = duration;
            this.explosionX = x;
            this.explosionY = y;
            this.explosionLocked = false;
            this.displayRadius = displayRadius;

            this.phase1Duration = 1.0;
            this.phase2Duration = 0.25;
            this.phase3Start = this.phase1Duration + this.phase2Duration;
            this.phase3Duration = 1.5;
            this.phase4Duration = this.duration - this.phase3Start - this.phase3Duration;

            if (this.body) {
                this.body.supernovaTime = this.duration;
                this.body.evolutionStage = 'supernova';
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

    class AccretionBurstEffect {
        constructor(x, y, body = null, duration = 1.5, consumedMass = 12) {
            this.x = x;
            this.y = y;
            this.body = body;
            this.time = 0;
            this.duration = duration;
            this.trackDuration = duration * 0.5;
            this.lockedX = x;
            this.lockedY = y;
            this.positionLocked = false;
            this.consumedMass = consumedMass;
        }

        update(dt) {
            this.time += dt;

            if (this.body && this.time < this.trackDuration) {
                this.x = this.body.x;
                this.y = this.body.y;
                return;
            }

            if (!this.positionLocked) {
                this.positionLocked = true;
                this.lockedX = this.x;
                this.lockedY = this.y;
            }
        }

        getProperties() {
            const phase = Math.min(1, this.time / this.duration);
            const brightness = Math.max(0, 1 - phase);
            const massScale = Math.max(0.6, Math.min(2.4, Math.sqrt(Math.max(this.consumedMass, 0.1) / 12)));
            return {
                radius: (80 + phase * 220) * massScale,
                brightness: Math.min(1.4, brightness * (0.75 + massScale * 0.25)),
                ringWidth: (12 + phase * 10) * Math.max(0.75, massScale * 0.9),
            };
        }

        isDone() {
            return this.time >= this.duration;
        }
    }

    class KilonovaEffect {
        constructor(x, y, body = null, duration = 2.5) {
            this.x = x;
            this.y = y;
            this.body = body;
            this.time = 0;
            this.duration = duration;
            this.trackDuration = duration * 0.35;
            this.lockedX = x;
            this.lockedY = y;
            this.positionLocked = false;
            this.axisAngle = Math.random() * Math.PI;
        }

        update(dt) {
            this.time += dt;

            if (this.body && this.time < this.trackDuration) {
                this.x = this.body.x;
                this.y = this.body.y;
                return;
            }

            if (!this.positionLocked) {
                this.positionLocked = true;
                this.lockedX = this.x;
                this.lockedY = this.y;
            }
        }

        getProperties() {
            const phase = Math.min(1, this.time / this.duration);
            const pulse = Math.sin(phase * Math.PI);
            const brightness = Math.max(0, 0.92 - phase * 0.45 + pulse * 0.18);
            const shellRadius = 24 + phase * 150;
            const shellFade = Math.max(0, 1 - phase * 0.9);
            return {
                phase,
                radius: 55 + phase * 320,
                brightness,
                shellFade,
                shellRadius,
                secondaryShellRadius: shellRadius * (1.24 + pulse * 0.18),
                tertiaryShellRadius: shellRadius * (1.58 + pulse * 0.24),
                innerShellRadius: Math.max(10, shellRadius * (0.52 + pulse * 0.08)),
                shimmer: 0.35 + pulse * 0.45,
            };
        }

        isDone() {
            return this.time >= this.duration;
        }
    }

    class MergeEffect {
        constructor(body1, body2, mergedBody, duration = 0.5) {
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
            this.body1.evolutionStage = 'merging';
            this.body2.evolutionStage = 'merging';
            this.mergedBody.evolutionStage = 'forming';
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
            this.body1.evolutionStage = 'stable';
            this.body2.evolutionStage = 'stable';
            this.mergedBody.mergeScale = 1;
            this.mergedBody.mergeAlpha = 1;
            if (this.mergedBody.evolutionStage === 'forming') {
                this.mergedBody.evolutionStage = 'stable';
            }
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
            this.accretionBurstEffects = [];
            this.kilonovaEffects = [];
            this.mergeEffects = [];
            this.running = true;
            this.gravityConstant = 2;
            this.timeScale = 1;

            this.darkMatterX = 0;
            this.darkMatterY = 0;
            this.darkMatterMass = 50;
            this.darkMatterStrength = 1.5;
            this.bodyTypeDefinitions = getBodyTypeDefinitions();
            this.spawnClassDefinitions = getSpawnClassDefinitions();
            this.spawnPresetDefinitions = getSpawnPresetDefinitions();
            this.massUnitLabel = MASS_UNIT_LABEL;
            this.massRealizationScale = MASS_REALIZATION_SCALE;
            this.massThresholds = {
                asteroid: SPAWN_CLASS_CONFIG_BY_KEY.asteroid.minMass,
                planet: SPAWN_CLASS_CONFIG_BY_KEY.planet.minMass,
                gasGiant: SPAWN_CLASS_CONFIG_BY_KEY['gas-giant'].minMass,
                star: SPAWN_CLASS_CONFIG_BY_KEY.star.minMass,
                wolfRayet: EVOLUTION_RULES.wolfRayet.lowerMass,
                neutronStar: EVOLUTION_RULES.stellarCollapse.thresholdMass,
                blackHole: EVOLUTION_RULES.stellarCollapse.blackHoleThresholdMass,
            };
        }

        getBodyType(mass) {
            return getNaturalBodyStateForMass(mass);
        }

        getRadiusFromMass(mass, bodyType = null) {
            const resolvedBodyType = bodyType || this.getBodyType(mass);
            const bodyConfig = BODY_STATE_CONFIG_BY_KEY[resolvedBodyType] || BODY_STATE_CONFIG_BY_KEY.planet;
            return Math.cbrt(Math.max(mass, 0)) * bodyConfig.radiusScale;
        }

        getBodyConfig(bodyType) {
            return getBodyTypeConfig(bodyType);
        }

        getSpawnClassConfig(spawnClass) {
            return getSpawnClassConfig(spawnClass);
        }

        getSpawnPresetConfig(presetKey) {
            return getSpawnPresetConfig(presetKey);
        }

        getRandomMassForPreset(presetKey) {
            return getRandomMassForPreset(presetKey);
        }

        getEvolutionRules() {
            return getEvolutionRules();
        }

        getSpawnClassForMass(mass) {
            return getSpawnClassForMass(mass);
        }

        getBodyStateForMass(mass) {
            return getNaturalBodyStateForMass(mass);
        }

        resolveMergedBodyState(body1, body2, totalMass) {
            const states = [body1.bodyType, body2.bodyType];

            if (states.includes('black-hole')) {
                return 'black-hole';
            }

            if (states.includes('neutron-star')) {
                return totalMass >= EVOLUTION_RULES.neutronStar.collapseToBlackHoleMass ? 'black-hole' : 'neutron-star';
            }

            if (states.includes('white-dwarf')) {
                if (totalMass >= EVOLUTION_RULES.stellarCollapse.thresholdMass) {
                    return resolveCollapsedRemnantState(totalMass);
                }
                if (totalMass >= SPAWN_CLASS_CONFIG_BY_KEY.star.minMass) {
                    return this.getBodyStateForMass(totalMass);
                }
                return 'white-dwarf';
            }

            const naturalState = this.getBodyStateForMass(totalMass);
            if ((naturalState === 'star' || naturalState === 'wolf-rayet') &&
                totalMass >= EVOLUTION_RULES.stellarCollapse.thresholdMass) {
                return resolveCollapsedRemnantState(totalMass);
            }

            return naturalState;
        }

        initializeBodyEvolution(body) {
            if (!body) {
                return;
            }

            body.instabilityProgress = 0;

            if (body.bodyType === 'wolf-rayet') {
                body.evolutionStage = 'unstable';
                body.maxLifetime = EVOLUTION_RULES.wolfRayet.lifetimeMin +
                    Math.random() * (EVOLUTION_RULES.wolfRayet.lifetimeMax - EVOLUTION_RULES.wolfRayet.lifetimeMin);
                body.lifetimeRemaining = body.maxLifetime;
                return;
            }

            body.lifetimeRemaining = null;
            body.maxLifetime = null;

            if (body.bodyType === 'red-giant') {
                body.evolutionStage = 'expanded';
            } else if (body.evolutionStage === 'unstable' || body.evolutionStage === 'expanded') {
                body.evolutionStage = 'stable';
            }
        }

        collapseWolfRayet(body) {
            if (!body || body.bodyType !== 'wolf-rayet' || body.supernovaTime > 0) {
                return;
            }

            const originalRadius = body.radius;
            const becomesBlackHole = body.mass >= EVOLUTION_RULES.wolfRayet.blackHoleThresholdMass;
            const remnantState = becomesBlackHole ? 'black-hole' : 'neutron-star';
            const retention = becomesBlackHole ?
                EVOLUTION_RULES.wolfRayet.blackHoleMassRetention :
                EVOLUTION_RULES.wolfRayet.neutronStarMassRetention;

            let remnantMass = body.mass * retention;
            if (remnantState === 'black-hole') {
                remnantMass = Math.max(EVOLUTION_RULES.blackHole.lowerMass, remnantMass);
            } else {
                remnantMass = Math.max(
                    EVOLUTION_RULES.neutronStar.lowerMass,
                    Math.min(EVOLUTION_RULES.neutronStar.upperMass, remnantMass)
                );
            }

            body.mass = remnantMass;
            body.radius = this.getRadiusFromMass(remnantMass, remnantState);
            body.trailMinSegmentLength = Math.max(2, body.radius * 0.4);
            if (typeof body.setState === 'function') {
                body.setState(remnantState);
            } else {
                body.bodyType = remnantState;
                body.state = remnantState;
            }
            body.spawnClass = this.getSpawnClassForMass(remnantMass);
            body.supernovaProfile = getSupernovaProfileForState(remnantState);
            body.evolutionStage = 'collapsing';
            body.lifetimeRemaining = null;
            body.maxLifetime = null;
            body.instabilityProgress = 1;
            this.createSupernovaWithBody(body.x, body.y, originalRadius, body, originalRadius);
        }

        spawnPlanet(x, y, mass = null, bodyType = null) {
            if (mass === null) {
                mass = this.getRandomMassForPreset('random');
            }

            const resolvedBodyType = bodyType || this.getBodyStateForMass(mass);
            const radius = this.getRadiusFromMass(mass, resolvedBodyType);
            const spawnClass = this.getSpawnClassForMass(mass);

            const radialAngle = Math.atan2(y, x);
            const orbitalDirection = Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
            const variance = (Math.random() - 0.5) * 0.4;
            const velocityAngle = radialAngle + orbitalDirection + variance;

            const speed = Math.random() * 15 + 5;
            const vx = Math.cos(velocityAngle) * speed;
            const vy = Math.sin(velocityAngle) * speed;

            const body = this.createBody(x, y, vx, vy, mass, radius, '#ffffff', resolvedBodyType);
            if (typeof body.setState === 'function' && body.bodyType !== resolvedBodyType) {
                body.setState(resolvedBodyType);
            } else if (body.bodyType !== resolvedBodyType) {
                body.bodyType = resolvedBodyType;
                body.state = resolvedBodyType;
            }
            body.spawnClass = spawnClass;
            this.initializeBodyEvolution(body);
            this.bodies.push(body);
            return body;
        }

        spawnStellarBody(x, y, mass = null, allowEvolvedStates = true) {
            const resolvedMass = mass === null ? this.getRandomMassForPreset('star') : mass;
            const bodyState = allowEvolvedStates ? getRandomStellarStateForMass(resolvedMass) : 'star';
            return this.spawnPlanet(x, y, resolvedMass, bodyState);
        }

        spawnBlackHole(x, y) {
            const mass = this.getRandomMassForPreset('black-hole');
            return this.spawnPlanet(x, y, mass, 'black-hole');
        }

        spawnRandomCluster(x, y, count = 5) {
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * 100 + 50;
                const px = x + Math.cos(angle) * distance;
                const py = y + Math.sin(angle) * distance;
                const vx = Math.random() * 200 - 100;
                const vy = Math.random() * 200 - 100;
                const mass = this.getRandomMassForPreset('random');
                const bodyType = this.getBodyStateForMass(mass);
                const radius = this.getRadiusFromMass(mass, bodyType);

                const body = this.createBody(px, py, vx, vy, mass, radius, '#ffffff', bodyType);
                body.spawnClass = this.getSpawnClassForMass(mass);
                this.initializeBodyEvolution(body);
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

                    const force = (this.gravityConstant * b1.mass * b2.mass * this.massRealizationScale) / distSq;
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

            const collapsingBodies = [];
            for (const body of this.bodies) {
                if (body.isMerging || body.supernovaTime > 0 || body.bodyType !== 'wolf-rayet') {
                    continue;
                }

                if (body.lifetimeRemaining === null || body.maxLifetime === null) {
                    this.initializeBodyEvolution(body);
                }

                body.lifetimeRemaining -= dt;
                body.instabilityProgress = Math.max(
                    0,
                    Math.min(1, 1 - (body.lifetimeRemaining / Math.max(body.maxLifetime || 1, 0.0001)))
                );

                if (body.lifetimeRemaining <= 0) {
                    collapsingBodies.push(body);
                }
            }

            for (const body of collapsingBodies) {
                this.collapseWolfRayet(body);
            }

            this.handleCollisions();
            this.particlePool.update(dt);

            for (let i = this.supernovaEffects.length - 1; i >= 0; i--) {
                const effect = this.supernovaEffects[i];
                effect.update(dt);

                if (effect.isDone()) {
                    if (effect.body) {
                        effect.body.supernovaTime = 0;
                        effect.body.evolutionStage = 'stable';
                    }
                    this.supernovaEffects.splice(i, 1);
                }
            }

            for (let i = this.accretionBurstEffects.length - 1; i >= 0; i--) {
                const effect = this.accretionBurstEffects[i];
                effect.update(dt);

                if (effect.isDone()) {
                    this.accretionBurstEffects.splice(i, 1);
                }
            }

            for (let i = this.kilonovaEffects.length - 1; i >= 0; i--) {
                const effect = this.kilonovaEffects[i];
                effect.update(dt);

                if (effect.isDone()) {
                    this.kilonovaEffects.splice(i, 1);
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

                    const b1Config = BODY_STATE_CONFIG_BY_KEY[b1.bodyType] || BODY_STATE_CONFIG_BY_KEY.planet;
                    const b2Config = BODY_STATE_CONFIG_BY_KEY[b2.bodyType] || BODY_STATE_CONFIG_BY_KEY.planet;
                    const r1 = b1.radius * b1Config.collisionRadiusMultiplier;
                    const r2 = b2.radius * b2Config.collisionRadiusMultiplier;
                    const minDist = r1 + r2;

                    if (dist >= minDist) continue;

                    const totalMass = b1.mass + b2.mass;
                    let newVx = (b1.vx * b1.mass + b2.vx * b2.mass) / totalMass;
                    let newVy = (b1.vy * b1.mass + b2.vy * b2.mass) / totalMass;
                    let newX = (b1.x * b1.mass + b2.x * b2.mass) / totalMass;
                    let newY = (b1.y * b1.mass + b2.y * b2.mass) / totalMass;

                    const newBodyType = this.resolveMergedBodyState(b1, b2, totalMass);
                    const newRadius = this.getRadiusFromMass(totalMass, newBodyType);
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
                    if (typeof mergedBody.setState === 'function' && mergedBody.bodyType !== newBodyType) {
                        mergedBody.setState(newBodyType);
                    }
                    mergedBody.spawnClass = this.getSpawnClassForMass(totalMass);
                    mergedBody.rotationSpeed = newRotationSpeed;
                    mergedBody.mergeScale = 0;
                    mergedBody.mergeAlpha = 0;
                    mergedBody.isAnchored = Boolean(anchoredBody);
                    this.initializeBodyEvolution(mergedBody);
                    this.bodies.push(mergedBody);

                    const newBodyConfig = BODY_STATE_CONFIG_BY_KEY[newBodyType] || BODY_STATE_CONFIG_BY_KEY.planet;
                    const mergeDuration = newBodyConfig.mergeDuration;
                    this.mergeEffects.push(new MergeEffect(b1, b2, mergedBody, mergeDuration));

                    if (newBodyConfig.emitsExplosionOnMerge) {
                        const explosionIntensity = Math.min(2.0, totalMass / 50);
                        this.createExplosion(newX, newY, totalMass, explosionIntensity);
                    }

                    const mergedStates = [b1.bodyType, b2.bodyType];
                    const b1IsBlackHole = b1.bodyType === 'black-hole';
                    const b2IsBlackHole = b2.bodyType === 'black-hole';
                    const involvesBlackHole = mergedStates.includes('black-hole');
                    const involvesStar = mergedStates.some((state) =>
                        state === 'star' || state === 'red-giant' || state === 'wolf-rayet'
                    );
                    const isBlackHoleConsumption = b1IsBlackHole !== b2IsBlackHole;
                    const isNeutronStarMerger = b1.bodyType === 'neutron-star' && b2.bodyType === 'neutron-star';

                    if (isNeutronStarMerger) {
                        mergedBody.supernovaProfile = 'kilonova';
                        this.createKilonova(newX, newY, mergedBody);
                    } else if (isBlackHoleConsumption) {
                        const consumedBody = b1IsBlackHole ? b2 : b1;
                        mergedBody.supernovaProfile = 'accretion-burst';
                        this.createAccretionBurst(newX, newY, mergedBody, consumedBody.mass);
                    } else if ((newBodyType === 'neutron-star' || newBodyType === 'black-hole') && involvesStar) {
                        mergedBody.supernovaProfile = getSupernovaProfileForState(newBodyType);
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

        createSupernovaWithBody(x, y, radius, body, displayRadius = null) {
            this.supernovaEffects.push(new SupernovaEffect(x, y, body, 7.5, displayRadius ?? radius));
            this.createExplosion(x, y, 50, 2.5);
        }

        createSupernova(x, y, radius) {
            this.createSupernovaWithBody(x, y, radius, null);
        }

        createAccretionBurst(x, y, body = null, consumedMass = 12) {
            this.accretionBurstEffects.push(new AccretionBurstEffect(x, y, body, 1.5, consumedMass));
            this.createExplosion(x, y, Math.max(12, consumedMass), Math.min(2.0, 0.9 + consumedMass * 0.04));
        }

        createKilonova(x, y, body = null) {
            this.kilonovaEffects.push(new KilonovaEffect(x, y, body, 2.5));
            this.createExplosion(x, y, 20, 1.5);
        }

        clearAll() {
            this.bodies = [];
            this.particlePool.clear();
            this.supernovaEffects = [];
            this.accretionBurstEffects = [];
            this.kilonovaEffects = [];
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
        AccretionBurstEffect,
        KilonovaEffect,
        MergeEffect,
        SimulationCore,
        MASS_UNIT_LABEL,
        MASS_REALIZATION_SCALE,
        getEvolutionRules,
        getSpawnClassDefinitions,
        getSpawnClassConfig,
        getSpawnClassForMass,
        getNaturalBodyStateForMass,
        getRandomStellarStateForMass,
        resolveCollapsedRemnantState,
        getSupernovaProfileForState,
        getRealizedMass,
        getBodyTypeDefinitions,
        getBodyTypeConfig,
        getSpawnPresetDefinitions,
        getSpawnPresetConfig,
        getRandomMassInRange,
        getRandomStellarMass,
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
