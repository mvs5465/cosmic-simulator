#!/usr/bin/env node

const {
    Body,
    SimulationCore,
    AccretionBurstEffect,
    KilonovaEffect,
    SupernovaEffect,
    getSpawnClassConfig,
    getSpawnPresetConfig,
    getRealizedMass,
    getEvolutionRules,
    getCircularOrbitSpeed,
    getBlackHoleRenderMetrics,
    shouldRenderBlackHoleFlares,
    shouldDrawVelocityVector,
    getBodyMergeVisualState,
} = require('./sim-core.js');

class TestRunner {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }

    test(name, fn) {
        this.tests.push({ name, fn });
    }

    assert(condition, message) {
        if (!condition) {
            throw new Error(message);
        }
    }

    assertEqual(actual, expected, tolerance = 0.001, message = '') {
        const diff = Math.abs(actual - expected);
        if (diff > tolerance) {
            throw new Error(`${message} expected=${expected} actual=${actual} diff=${diff}`);
        }
    }

    async run() {
        console.log('Starting shared simulation core tests\n');

        for (const test of this.tests) {
            try {
                await test.fn.call(this);
                this.passed++;
                console.log(`PASS ${test.name}`);
            } catch (error) {
                this.failed++;
                console.log(`FAIL ${test.name}`);
                console.log(`  ${error.message}`);
            }
        }

        console.log(`\nTotal: ${this.tests.length} Passed: ${this.passed} Failed: ${this.failed}`);
        process.exit(this.failed > 0 ? 1 : 0);
    }
}

const tests = new TestRunner();

tests.test('body motion records a capped trail history', function() {
    const body = new Body(0, 0, 10, 0, 1, 2.5, '#fff', 'planet');
    body.maxTrailPoints = 4;
    body.trailMinSegmentLength = 1;

    for (let i = 0; i < 5; i++) {
        body.update(0.2);
    }

    this.assert(body.trailPoints.length === 4, `expected capped trail length of 4, got ${body.trailPoints.length}`);
    this.assert(body.trailPoints[0].x > 0, 'oldest trail point should roll forward when capped');
    this.assertEqual(body.trailPoints[body.trailPoints.length - 1].x, body.x, 0.001, 'latest trail point should match current x');
});

tests.test('getBodyType uses current production thresholds', function() {
    const sim = new SimulationCore();

    const cases = [
        { mass: 0.01, expected: 'debris' },
        { mass: 0.1, expected: 'asteroid' },
        { mass: 1, expected: 'planet' },
        { mass: 3, expected: 'gas-giant' },
        { mass: 20, expected: 'star' },
        { mass: 120, expected: 'star' },
    ];

    for (const testCase of cases) {
        this.assert(
            sim.getBodyType(testCase.mass) === testCase.expected,
            `mass ${testCase.mass} should classify as ${testCase.expected}`
        );
    }
});

tests.test('body type and spawn preset config share the same boundaries', function() {
    const asteroid = getSpawnClassConfig('asteroid');
    const planet = getSpawnClassConfig('planet');
    const gasGiant = getSpawnClassConfig('gas-giant');
    const starClass = getSpawnClassConfig('star');
    const random = getSpawnPresetConfig('random');
    const star = getSpawnPresetConfig('star');
    const evolution = getEvolutionRules();

    this.assert(asteroid.maxMass === 0.5, 'asteroids should stay below 0.5 Me');
    this.assert(planet.minMass === asteroid.maxMass, 'planet should start where asteroid ends');
    this.assert(gasGiant.minMass === planet.maxMass, 'gas giant should start where planet ends');
    this.assert(starClass.minMass === gasGiant.maxMass, 'stars should start where gas giants end');
    this.assert(starClass.maxMass === evolution.stellarCollapse.thresholdMass, 'star band should stop at collapse threshold');
    this.assert(random.minMass === asteroid.minMass, 'random preset should start at asteroid minimum');
    this.assert(random.maxMass === star.minMass, 'random preset should stop before star masses');
});

tests.test('getRadiusFromMass uses compact scaling for neutron stars and black holes', function() {
    const sim = new SimulationCore();

    this.assertEqual(sim.getRadiusFromMass(1, 'planet'), Math.cbrt(1) * 2.5, 0.001, 'planet radius');
    this.assertEqual(sim.getRadiusFromMass(20, 'star'), Math.cbrt(20) * 5, 0.001, 'star radius');
    this.assertEqual(sim.getRadiusFromMass(20, 'neutron-star'), Math.cbrt(20) * 1.2, 0.001, 'neutron star radius');
    this.assertEqual(sim.getRadiusFromMass(20, 'black-hole'), Math.cbrt(20) * 1.6, 0.001, 'black hole radius');
});

tests.test('getCircularOrbitSpeed matches the shared gravity model', function() {
    this.assertEqual(getCircularOrbitSpeed(500, 200, 2), Math.sqrt(5), 0.001, 'orbit speed should follow sqrt(GM/r)');
    this.assertEqual(getCircularOrbitSpeed(2, 8, 2, 25), Math.sqrt(12.5), 0.001, 'orbit speed should respect realized mass scale');
    this.assertEqual(getCircularOrbitSpeed(500, 0, 2), 0, 0.001, 'zero radius should be clamped');
});

tests.test('realized mass scales Me into simulation mass cleanly', function() {
    this.assertEqual(getRealizedMass(2), 50, 0.001, 'default realized mass scale');
    this.assertEqual(getRealizedMass(2, 10), 20, 0.001, 'custom realized mass scale');
});

tests.test('spawnBlackHole creates an actual black hole under current thresholds', function() {
    const sim = new SimulationCore();
    const preset = getSpawnPresetConfig('black-hole');

    const body = sim.spawnBlackHole(0, 0);

    this.assert(sim.bodies.length === 1, 'expected one body');
    this.assert(body.bodyType === 'black-hole', `expected black-hole, got ${body.bodyType}`);
    this.assert(body.mass >= preset.minMass, 'black-hole preset should define the lower mass bound');
});

tests.test('explicit compact states can occupy overlapping mass ranges', function() {
    const sim = new SimulationCore();
    const blackHole = sim.spawnPlanet(0, 0, 20, 'black-hole');
    const neutronStar = sim.spawnPlanet(20, 0, 20, 'neutron-star');
    const whiteDwarf = sim.spawnPlanet(40, 0, 1, 'white-dwarf');

    this.assert(blackHole.bodyType === 'black-hole', 'black hole should preserve explicit state');
    this.assert(neutronStar.bodyType === 'neutron-star', 'neutron star should preserve explicit state');
    this.assert(whiteDwarf.bodyType === 'white-dwarf', 'white dwarf should preserve explicit state');
});

tests.test('black-hole render metrics keep the disk outside the core', function() {
    const metrics = getBlackHoleRenderMetrics(120);

    this.assertEqual(metrics.coreRadius, 28.8, 0.001, 'core radius should match shared ratio');
    this.assertEqual(metrics.diskInnerRadius, 60, 0.001, 'disk inner radius should match shared ratio');
    this.assertEqual(metrics.diskOuterRadius, 120, 0.001, 'disk outer radius should match shared ratio');
    this.assert(metrics.coreRadius < metrics.diskInnerRadius, 'core should be inside the disk');
    this.assert(metrics.diskInnerRadius < metrics.diskOuterRadius, 'disk should have visible thickness');
});

tests.test('black-hole flares are suppressed while a merge is in progress', function() {
    const stableBody = { bodyType: 'black-hole' };
    const mergingBody = { bodyType: 'black-hole', isMerging: true };
    const mergedBodyFadingIn = { bodyType: 'black-hole', mergeScale: 0.5, mergeAlpha: 0.5 };

    this.assert(shouldRenderBlackHoleFlares(stableBody), 'stable black holes should render flares');
    this.assert(!shouldRenderBlackHoleFlares(mergingBody), 'merging black holes should not render flares');
    this.assert(shouldRenderBlackHoleFlares(mergedBodyFadingIn), 'the merged black hole should render flares while fading in');
});

tests.test('velocity vectors are not drawn for black holes', function() {
    const fastPlanet = { bodyType: 'planet', vx: 20, vy: 0 };
    const fastBlackHole = { bodyType: 'black-hole', vx: 20, vy: 0 };

    this.assert(shouldDrawVelocityVector(fastPlanet), 'fast non-black-hole bodies should draw vectors');
    this.assert(!shouldDrawVelocityVector(fastBlackHole), 'black holes should not draw vectors');
});

tests.test('merge visual state defaults and respects merge animation values', function() {
    const defaultState = getBodyMergeVisualState({});
    const mergedState = getBodyMergeVisualState({ mergeScale: 0.4, mergeAlpha: 0.25 });

    this.assertEqual(defaultState.scale, 1, 0.001, 'default scale');
    this.assertEqual(defaultState.alpha, 1, 0.001, 'default alpha');
    this.assertEqual(mergedState.scale, 0.4, 0.001, 'merge scale should be preserved');
    this.assertEqual(mergedState.alpha, 0.25, 0.001, 'merge alpha should be preserved');
});

tests.test('collision creates a merged body and merge effect', function() {
    const sim = new SimulationCore();
    const mass1 = 1;
    const mass2 = 1;
    const radius1 = sim.getRadiusFromMass(mass1);
    const radius2 = sim.getRadiusFromMass(mass2);

    sim.spawnPlanet(0, 0, mass1);
    sim.spawnPlanet(radius1 + radius2 - 0.5, 0, mass2);
    sim.handleCollisions();

    this.assert(sim.bodies.length === 1, `expected one merged body, got ${sim.bodies.length}`);
    this.assert(sim.mergeEffects.length === 1, 'expected one active merge effect');
    this.assertEqual(sim.bodies[0].mass, 2, 0.001, 'merged mass');
    this.assert(sim.bodies[0].bodyType === 'gas-giant', `expected gas-giant, got ${sim.bodies[0].bodyType}`);
});

tests.test('update finishes merge cleanup after the merge duration', function() {
    const sim = new SimulationCore();
    sim.timeScale = 1;
    const mass = 1;
    const radius = sim.getRadiusFromMass(mass);

    sim.spawnPlanet(0, 0, mass);
    sim.spawnPlanet(radius * 2 - 0.5, 0, mass);
    sim.handleCollisions();
    this.assert(sim.mergeEffects.length === 1, 'merge effect should be active');

    sim.update(0.3);

    this.assert(sim.mergeEffects.length === 0, 'merge effect should complete');
    this.assert(sim.bodies.length === 1, 'original bodies should be removed');
    this.assert(sim.bodies[0].mergeScale === 1, 'merged body should be fully visible');
});

tests.test('star to neutron-star transition creates one supernova effect', function() {
    const sim = new SimulationCore();
    const mass = 30;
    const radius = sim.getRadiusFromMass(mass, 'star');

    sim.spawnPlanet(0, 0, mass);
    sim.spawnPlanet(radius * 2 - 0.5, 0, mass);
    sim.handleCollisions();

    this.assert(sim.supernovaEffects.length === 1, `expected one supernova effect, got ${sim.supernovaEffects.length}`);
    this.assert(sim.bodies[0].bodyType === 'neutron-star', `expected neutron-star, got ${sim.bodies[0].bodyType}`);
    this.assert(sim.bodies[0].supernovaTime > 0, 'merged body should be marked as in supernova');
    this.assert(sim.bodies[0].supernovaProfile === 'core-collapse', 'neutron star should retain the core-collapse profile');
});

tests.test('extreme star mergers collapse directly into black holes', function() {
    const sim = new SimulationCore();
    const mass = 50;
    const radius = sim.getRadiusFromMass(mass, 'star');

    sim.spawnPlanet(0, 0, mass);
    sim.spawnPlanet(radius * 2 - 0.5, 0, mass);
    sim.handleCollisions();

    this.assert(sim.bodies[0].bodyType === 'black-hole', `expected black-hole, got ${sim.bodies[0].bodyType}`);
    this.assert(sim.supernovaEffects.length === 1, 'extreme stellar collapse should still create a supernova effect');
    this.assert(sim.bodies[0].supernovaProfile === 'hypernova', 'black hole collapse should use the hypernova profile');
});

tests.test('star merging into a black hole creates an accretion burst instead of a supernova', function() {
    const sim = new SimulationCore();
    const starMass = 30;
    const blackHoleMass = 20;
    const radius = sim.getRadiusFromMass(blackHoleMass, 'black-hole');

    sim.spawnPlanet(0, 0, starMass);
    sim.spawnPlanet(radius * 0.1, 0, blackHoleMass, 'black-hole');
    sim.handleCollisions();

    this.assert(sim.bodies[0].bodyType === 'black-hole', `expected black-hole, got ${sim.bodies[0].bodyType}`);
    this.assert(sim.supernovaEffects.length === 0, 'black-hole consumption should not create a supernova');
    this.assert(sim.accretionBurstEffects.length === 1, 'black-hole consumption should create an accretion burst');
    this.assert(sim.bodies[0].supernovaProfile === 'accretion-burst', 'merged black hole should track the burst profile');
});

tests.test('black holes create accretion bursts when consuming non-stellar bodies too', function() {
    const sim = new SimulationCore();
    const blackHoleMass = 20;
    const planetMass = 1;
    const radius = sim.getRadiusFromMass(blackHoleMass, 'black-hole');

    sim.spawnPlanet(0, 0, blackHoleMass, 'black-hole');
    sim.spawnPlanet(radius * 0.1, 0, planetMass, 'planet');
    sim.handleCollisions();

    this.assert(sim.bodies[0].bodyType === 'black-hole', `expected black-hole, got ${sim.bodies[0].bodyType}`);
    this.assert(sim.supernovaEffects.length === 0, 'black-hole consumption should not create a supernova');
    this.assert(sim.accretionBurstEffects.length === 1, 'black-hole consumption should always create an accretion burst');
});

tests.test('neutron-star mergers create a kilonova instead of a supernova', function() {
    const sim = new SimulationCore();
    const neutronStarMass = 12;
    const radius = sim.getRadiusFromMass(neutronStarMass, 'neutron-star');

    sim.spawnPlanet(0, 0, neutronStarMass, 'neutron-star');
    sim.spawnPlanet(radius * 1.9, 0, neutronStarMass, 'neutron-star');
    sim.handleCollisions();

    this.assert(sim.bodies[0].bodyType === 'neutron-star', `expected neutron-star, got ${sim.bodies[0].bodyType}`);
    this.assert(sim.supernovaEffects.length === 0, 'neutron-star mergers should not create a supernova');
    this.assert(sim.kilonovaEffects.length === 1, 'neutron-star mergers should create a kilonova');
    this.assert(sim.bodies[0].supernovaProfile === 'kilonova', 'merged neutron star should track the kilonova profile');
});

tests.test('supernova effect transitions into phase 4 and completes cleanly', function() {
    const effect = new SupernovaEffect(0, 0, null, 7.5);

    effect.time = 0.5;
    this.assert(effect.getProperties().phase === 1, 't=0.5 should be phase 1');
    effect.time = 1.75;
    this.assert(effect.getProperties().phase === 3, 't=1.75 should be phase 3');
    effect.time = 5;
    this.assert(effect.getProperties().phase === 4, 't=5 should be phase 4');
    effect.time = 7.5;
    this.assert(effect.isDone(), 'effect should be done at duration');
});

tests.test('accretion burst effect completes cleanly', function() {
    const effect = new AccretionBurstEffect(0, 0, null, 1.5);

    effect.time = 0.5;
    this.assert(effect.getProperties().brightness > 0, 'accretion burst should still be visible mid-effect');
    effect.time = 1.5;
    this.assert(effect.isDone(), 'accretion burst should complete at its duration');
});

tests.test('accretion burst size scales with consumed mass', function() {
    const smallEffect = new AccretionBurstEffect(0, 0, null, 1.5, 1);
    const largeEffect = new AccretionBurstEffect(0, 0, null, 1.5, 36);

    smallEffect.time = 0.5;
    largeEffect.time = 0.5;

    const smallProps = smallEffect.getProperties();
    const largeProps = largeEffect.getProperties();

    this.assert(largeProps.radius > smallProps.radius, 'larger consumed mass should create a larger burst radius');
    this.assert(largeProps.ringWidth > smallProps.ringWidth, 'larger consumed mass should create a wider burst ring');
});

tests.test('kilonova effect completes cleanly', function() {
    const effect = new KilonovaEffect(0, 0, null, 2.5);

    effect.time = 1.0;
    this.assert(effect.getProperties().brightness > 0, 'kilonova should still be visible mid-effect');
    effect.time = 2.5;
    this.assert(effect.isDone(), 'kilonova should complete at its duration');
});

tests.test('dark matter origin case keeps acceleration finite', function() {
    const sim = new SimulationCore();
    const body = sim.spawnPlanet(0, 0, 1);
    body.vx = 0;
    body.vy = 0;

    sim.update(0.016);

    this.assert(Number.isFinite(body.ax), 'ax should remain finite');
    this.assert(Number.isFinite(body.ay), 'ay should remain finite');
});

tests.test('anchored bodies stay fixed under force and update', function() {
    const sim = new SimulationCore();
    const body = sim.spawnPlanet(0, 0, 12);
    body.isAnchored = true;
    body.vx = 12;
    body.vy = -8;

    body.applyForce(1000, -500);
    body.update(0.5);

    this.assertEqual(body.x, 0, 0.001, 'anchored body x');
    this.assertEqual(body.y, 0, 0.001, 'anchored body y');
    this.assertEqual(body.vx, 0, 0.001, 'anchored body vx');
    this.assertEqual(body.vy, 0, 0.001, 'anchored body vy');
});

tests.test('createExplosion populates the particle pool', function() {
    const sim = new SimulationCore();

    sim.createExplosion(0, 0, 50, 1.5);

    this.assert(sim.particlePool.getActive().length > 0, 'expected active particles after explosion');
});

tests.test('clearAll resets bodies and transient effects', function() {
    const sim = new SimulationCore();

    sim.spawnPlanet(0, 0, 1);
    sim.createExplosion(0, 0, 50, 1);
    sim.supernovaEffects.push(new SupernovaEffect(0, 0, null, 1));
    sim.kilonovaEffects.push(new KilonovaEffect(0, 0, null, 1));
    sim.mergeEffects.push({ placeholder: true });

    sim.clearAll();

    this.assert(sim.bodies.length === 0, 'bodies should be cleared');
    this.assert(sim.particlePool.getActive().length === 0, 'particles should be cleared');
    this.assert(sim.supernovaEffects.length === 0, 'supernova effects should be cleared');
    this.assert(sim.accretionBurstEffects.length === 0, 'accretion bursts should be cleared');
    this.assert(sim.kilonovaEffects.length === 0, 'kilonova effects should be cleared');
    this.assert(sim.mergeEffects.length === 0, 'merge effects should be cleared');
});

tests.run();
