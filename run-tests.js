#!/usr/bin/env node

const {
    SimulationCore,
    SupernovaEffect,
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

tests.test('getBodyType uses current production thresholds', function() {
    const sim = new SimulationCore();

    const cases = [
        { mass: 3, expected: 'debris' },
        { mass: 5, expected: 'asteroid' },
        { mass: 20, expected: 'planet' },
        { mass: 60, expected: 'gas-giant' },
        { mass: 150, expected: 'star' },
        { mass: 1500, expected: 'neutron-star' },
        { mass: 3000, expected: 'black-hole' },
    ];

    for (const testCase of cases) {
        this.assert(
            sim.getBodyType(testCase.mass) === testCase.expected,
            `mass ${testCase.mass} should classify as ${testCase.expected}`
        );
    }
});

tests.test('getRadiusFromMass uses compact scaling for neutron stars and black holes', function() {
    const sim = new SimulationCore();

    this.assertEqual(sim.getRadiusFromMass(125), Math.cbrt(125) * 2, 0.001, 'standard body radius');
    this.assertEqual(sim.getRadiusFromMass(1600), Math.cbrt(1600) * 0.6, 0.001, 'neutron star radius');
    this.assertEqual(sim.getRadiusFromMass(4000), Math.cbrt(4000) * 0.8, 0.001, 'black hole radius');
});

tests.test('getCircularOrbitSpeed matches the shared gravity model', function() {
    this.assertEqual(getCircularOrbitSpeed(500, 200, 2), Math.sqrt(5), 0.001, 'orbit speed should follow sqrt(GM/r)');
    this.assertEqual(getCircularOrbitSpeed(500, 0, 2), 0, 0.001, 'zero radius should be clamped');
});

tests.test('spawnBlackHole creates an actual black hole under current thresholds', function() {
    const sim = new SimulationCore();

    const body = sim.spawnBlackHole(0, 0);

    this.assert(sim.bodies.length === 1, 'expected one body');
    this.assert(body.bodyType === 'black-hole', `expected black-hole, got ${body.bodyType}`);
    this.assert(body.mass >= sim.massThresholds.blackHole, 'mass should be at or above black-hole threshold');
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
    const mass1 = 25;
    const mass2 = 25;
    const radius1 = sim.getRadiusFromMass(mass1);
    const radius2 = sim.getRadiusFromMass(mass2);

    sim.spawnPlanet(0, 0, mass1);
    sim.spawnPlanet(radius1 + radius2 - 0.5, 0, mass2);
    sim.handleCollisions();

    this.assert(sim.bodies.length === 1, `expected one merged body, got ${sim.bodies.length}`);
    this.assert(sim.mergeEffects.length === 1, 'expected one active merge effect');
    this.assertEqual(sim.bodies[0].mass, 50, 0.001, 'merged mass');
});

tests.test('update finishes merge cleanup after the merge duration', function() {
    const sim = new SimulationCore();
    sim.timeScale = 1;
    const mass = 30;
    const radius = sim.getRadiusFromMass(mass);

    sim.spawnPlanet(0, 0, mass);
    sim.spawnPlanet(radius * 2 - 0.5, 0, mass);
    sim.handleCollisions();
    this.assert(sim.mergeEffects.length === 1, 'merge effect should be active');

    sim.update(0.6);

    this.assert(sim.mergeEffects.length === 0, 'merge effect should complete');
    this.assert(sim.bodies.length === 1, 'original bodies should be removed');
    this.assert(sim.bodies[0].mergeScale === 1, 'merged body should be fully visible');
});

tests.test('star to neutron-star transition creates one supernova effect', function() {
    const sim = new SimulationCore();
    const mass = 800;
    const radius = sim.getRadiusFromMass(mass);

    sim.spawnPlanet(0, 0, mass);
    sim.spawnPlanet(radius * 2 - 0.5, 0, mass);
    sim.handleCollisions();

    this.assert(sim.supernovaEffects.length === 1, `expected one supernova effect, got ${sim.supernovaEffects.length}`);
    this.assert(sim.bodies[0].bodyType === 'neutron-star', `expected neutron-star, got ${sim.bodies[0].bodyType}`);
    this.assert(sim.bodies[0].supernovaTime > 0, 'merged body should be marked as in supernova');
});

tests.test('supernova effect transitions into phase 4 and completes cleanly', function() {
    const effect = new SupernovaEffect(0, 0, null, 15);

    effect.time = 1;
    this.assert(effect.getProperties().phase === 1, 't=1 should be phase 1');
    effect.time = 3.5;
    this.assert(effect.getProperties().phase === 3, 't=3.5 should be phase 3');
    effect.time = 10;
    this.assert(effect.getProperties().phase === 4, 't=10 should be phase 4');
    effect.time = 15;
    this.assert(effect.isDone(), 'effect should be done at duration');
});

tests.test('dark matter origin case keeps acceleration finite', function() {
    const sim = new SimulationCore();
    const body = sim.spawnPlanet(0, 0, 25);
    body.vx = 0;
    body.vy = 0;

    sim.update(0.016);

    this.assert(Number.isFinite(body.ax), 'ax should remain finite');
    this.assert(Number.isFinite(body.ay), 'ay should remain finite');
});

tests.test('anchored bodies stay fixed under force and update', function() {
    const sim = new SimulationCore();
    const body = sim.spawnPlanet(0, 0, 200);
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

    sim.spawnPlanet(0, 0, 25);
    sim.createExplosion(0, 0, 50, 1);
    sim.supernovaEffects.push(new SupernovaEffect(0, 0, null, 1));
    sim.mergeEffects.push({ placeholder: true });

    sim.clearAll();

    this.assert(sim.bodies.length === 0, 'bodies should be cleared');
    this.assert(sim.particlePool.getActive().length === 0, 'particles should be cleared');
    this.assert(sim.supernovaEffects.length === 0, 'supernova effects should be cleared');
    this.assert(sim.mergeEffects.length === 0, 'merge effects should be cleared');
});

tests.run();
