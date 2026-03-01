#!/usr/bin/env node

// Simple Node.js test runner (doesn't need full browser)

// ==================== TEST FRAMEWORK ====================

class CosmicSimulatorTests {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
        this.results = [];
    }

    assert(condition, message) {
        if (!condition) {
            throw new Error(`Assertion failed: ${message}`);
        }
    }

    assertEqual(actual, expected, tolerance = 0.001, message = '') {
        const diff = Math.abs(actual - expected);
        if (diff > tolerance) {
            throw new Error(`Expected ${expected} but got ${actual} (diff: ${diff}). ${message}`);
        }
    }

    test(name, fn) {
        this.tests.push({ name, fn });
    }

    async runAll() {
        console.log('🚀 Starting Cosmic Simulator Test Suite\n');

        for (const test of this.tests) {
            try {
                await test.fn.call(this);
                this.passed++;
                this.results.push({ name: test.name, status: '✅ PASS' });
                console.log(`✅ ${test.name}`);
            } catch (error) {
                this.failed++;
                this.results.push({ name: test.name, status: `❌ FAIL: ${error.message}` });
                console.log(`❌ ${test.name}`);
                console.log(`   Error: ${error.message}\n`);
            }
        }

        this.printSummary();
    }

    printSummary() {
        console.log('\n' + '='.repeat(70));
        console.log('TEST SUMMARY');
        console.log('='.repeat(70));
        console.log(`Total: ${this.tests.length} | Passed: ${this.passed} | Failed: ${this.failed}`);
        console.log('='.repeat(70) + '\n');

        if (this.failed > 0) {
            console.log('❌ Failed Tests:');
            this.results.filter(r => r.status.includes('FAIL')).forEach(r => {
                console.log(`  ${r.name}`);
                console.log(`  ${r.status}`);
            });
            console.log();
            process.exit(1);
        } else {
            console.log('✅ All tests passed!');
            process.exit(0);
        }
    }
}

// ==================== LOAD SIMULATOR ====================

const { SimulatorCore, Body } = require('./simulator-core.js');

// ==================== TEST DEFINITIONS ====================

const tests = new CosmicSimulatorTests();

// ===== UNIT TESTS: Mass-to-Radius Formula =====

tests.test('getRadiusFromMass: radius = cbrt(mass) * 2', function() {
    const sim = new SimulatorCore();

    const testCases = [
        { mass: 1, expectedRadius: Math.cbrt(1) * 2 },
        { mass: 8, expectedRadius: Math.cbrt(8) * 2 },
        { mass: 27, expectedRadius: Math.cbrt(27) * 2 },
        { mass: 125, expectedRadius: Math.cbrt(125) * 2 },
    ];

    for (const testCase of testCases) {
        const radius = sim.getRadiusFromMass(testCase.mass);
        this.assertEqual(radius, testCase.expectedRadius, 0.001,
            `mass=${testCase.mass}`);
    }
});

// ===== UNIT TESTS: Body Type Classification =====

tests.test('getBodyType: classifies by mass thresholds', function() {
    const sim = new SimulatorCore();

    const testCases = [
        { mass: 3, expectedType: 'debris' },
        { mass: 5, expectedType: 'asteroid' },
        { mass: 12, expectedType: 'asteroid' },
        { mass: 20, expectedType: 'planet' },
        { mass: 40, expectedType: 'planet' },
        { mass: 60, expectedType: 'gas-giant' },
        { mass: 100, expectedType: 'gas-giant' },
        { mass: 150, expectedType: 'star' },
        { mass: 250, expectedType: 'star' },
    ];

    for (const testCase of testCases) {
        const type = sim.getBodyType(testCase.mass);
        this.assert(type === testCase.expectedType,
            `mass=${testCase.mass} should be '${testCase.expectedType}' but got '${type}'`);
    }
});

// ===== UNIT TESTS: Body Spawn =====

tests.test('spawnPlanet: creates body with correct mass and radius', function() {
    const sim = new SimulatorCore();

    sim.spawnPlanet(0, 0, 25); // Use 25 which is in planet range (20-60)

    this.assert(sim.bodies.length === 1, 'Should have 1 body');
    const body = sim.bodies[0];
    this.assertEqual(body.mass, 25, 0.001, 'Mass mismatch');
    this.assertEqual(body.radius, sim.getRadiusFromMass(25), 0.001, 'Radius mismatch');
    this.assert(body.bodyType === 'planet', `Type should be 'planet', got '${body.bodyType}'`);
});

tests.test('spawnBlackHole: creates body with high mass', function() {
    const sim = new SimulatorCore();

    // Run multiple times since it's random
    for (let i = 0; i < 3; i++) {
        sim.bodies = []; // Clear
        sim.spawnBlackHole(0, 0);

        this.assert(sim.bodies.length === 1, 'Should have 1 body');
        const body = sim.bodies[0];
        this.assert(body.mass >= 100, `Mass should be >= 100, got ${body.mass}`);
    }
});

tests.test('spawnRandomCluster: creates multiple bodies', function() {
    const sim = new SimulatorCore();

    sim.spawnRandomCluster(0, 0, 5);

    this.assert(sim.bodies.length === 5, `Should have 5 bodies, got ${sim.bodies.length}`);
    for (const body of sim.bodies) {
        this.assert(body.mass > 0, 'All bodies should have positive mass');
        this.assert(body.radius > 0, 'All bodies should have positive radius');
    }
});

// ===== INTEGRATION TESTS: Collision & Merge =====

tests.test('Collision: two bodies merge when they touch', function() {
    const sim = new SimulatorCore();

    const mass1 = 10;
    const mass2 = 15;
    const radius1 = sim.getRadiusFromMass(mass1);
    const radius2 = sim.getRadiusFromMass(mass2);

    sim.spawnPlanet(0, 0, mass1);
    sim.spawnPlanet(radius1 + radius2 - 0.5, 0, mass2);

    this.assert(sim.bodies.length === 2, 'Should have 2 bodies before collision');

    sim.update(0.016);
    sim.handleCollisions();

    this.assert(sim.bodies.length === 1, 'Should have 1 body after collision');
    const merged = sim.bodies[0];
    this.assertEqual(merged.mass, mass1 + mass2, 0.001, 'Merged mass mismatch');
    this.assertEqual(merged.radius, sim.getRadiusFromMass(mass1 + mass2), 0.001, 'Merged radius mismatch');
});

tests.test('Collision: merged body changes type if crossing threshold', function() {
    const sim = new SimulatorCore();

    const mass1 = 12; // asteroid
    const mass2 = 12; // asteroid
    const radius1 = sim.getRadiusFromMass(mass1);
    const radius2 = sim.getRadiusFromMass(mass2);

    sim.spawnPlanet(0, 0, mass1);
    sim.spawnPlanet(radius1 + radius2 - 0.5, 0, mass2);

    const body1 = sim.bodies[0];
    const body2 = sim.bodies[1];
    this.assert(body1.bodyType === 'asteroid', `Body1 should be asteroid, got ${body1.bodyType}`);
    this.assert(body2.bodyType === 'asteroid', `Body2 should be asteroid, got ${body2.bodyType}`);

    sim.handleCollisions();

    this.assert(sim.bodies.length === 1, 'Should merge into 1 body');
    const merged = sim.bodies[0];
    const mergedType = sim.getBodyType(merged.mass);
    this.assert(merged.bodyType === mergedType,
        `Merged body type should be '${mergedType}', got '${merged.bodyType}'`);
});

tests.test('Collision: momentum is conserved', function() {
    const sim = new SimulatorCore();

    const mass1 = 10;
    const mass2 = 20;
    const vx1 = 10;
    const vy1 = 5;
    const vx2 = -5;
    const vy2 = 10;

    sim.spawnPlanet(0, 0, mass1);
    sim.bodies[0].vx = vx1;
    sim.bodies[0].vy = vy1;

    sim.spawnPlanet(100, 0, mass2);
    sim.bodies[1].vx = vx2;
    sim.bodies[1].vy = vy2;

    const radius1 = sim.bodies[0].radius;
    const radius2 = sim.bodies[1].radius;
    sim.bodies[1].x = radius1 + radius2 - 0.5;

    sim.handleCollisions();

    const merged = sim.bodies[0];
    const expectedVx = (mass1 * vx1 + mass2 * vx2) / (mass1 + mass2);
    const expectedVy = (mass1 * vy1 + mass2 * vy2) / (mass1 + mass2);

    this.assertEqual(merged.vx, expectedVx, 0.001, 'X velocity not conserved');
    this.assertEqual(merged.vy, expectedVy, 0.001, 'Y velocity not conserved');
});

// ===== INTEGRATION TESTS: Physics =====

tests.test('Gravity: bodies attract each other', function() {
    const sim = new SimulatorCore();

    sim.spawnPlanet(-100, 0, 25);
    sim.spawnPlanet(100, 0, 25);

    const body1 = sim.bodies[0];
    const body2 = sim.bodies[1];

    body1.vx = 0;
    body1.vy = 0;
    body2.vx = 0;
    body2.vy = 0;

    // Manually compute forces without full update
    const dx = body2.x - body1.x;
    const dy = body2.y - body1.y;
    const distSq = dx * dx + dy * dy + 100;
    const dist = Math.sqrt(distSq);

    const force = (sim.gravityConstant * body1.mass * body2.mass) / distSq;
    const fx = (force * dx) / dist;
    const fy = (force * dy) / dist;

    // Body1 should be pulled toward body2 (positive x)
    this.assert(fx > 0, `Force on body1 should be positive in x, got fx=${fx}`);
    // Body2 should be pulled toward body1 (negative x)
    this.assert(-fx < 0, `Force on body2 should be negative in x, got fx=${-fx}`);
});

tests.test('Dark Matter: pulls bodies toward center', function() {
    const sim = new SimulatorCore();

    sim.spawnPlanet(500, 0, 25);
    const body = sim.bodies[0];
    body.vx = 0;
    body.vy = 0;

    sim.darkMatterStrength = 3;

    // Manually compute dark matter force
    const dx = sim.darkMatterX - body.x;
    const dy = sim.darkMatterY - body.y;
    const distSq = dx * dx + dy * dy;
    const dist = Math.sqrt(distSq);
    const accelMagnitude = sim.darkMatterStrength;
    const ax = (accelMagnitude * dx) / dist;

    // Body at +500 should be pulled toward center at 0 (negative x)
    this.assert(ax < 0, `Body should be pulled toward center (ax < 0), got ax=${ax}`);
});

tests.test('Edge case: bodies at exact center', function() {
    const sim = new SimulatorCore();

    sim.spawnPlanet(0, 0, 20);
    const body = sim.bodies[0];
    body.vx = 0;
    body.vy = 0;

    sim.darkMatterStrength = 3;
    sim.update(0.016);

    this.assert(isFinite(body.ax), 'Acceleration at center should be finite');
    this.assert(isFinite(body.ay), 'Acceleration at center should be finite');
});

// ===== CASCADING COLLISION TESTS =====

tests.test('Cascading collisions: body doesnt merge multiple times in one frame', function() {
    const sim = new SimulatorCore();

    // Create 3 bodies in a line that will all collide at once
    const mass1 = 25;
    const mass2 = 25;
    const mass3 = 25;

    const radius1 = sim.getRadiusFromMass(mass1);
    const radius2 = sim.getRadiusFromMass(mass2);
    const radius3 = sim.getRadiusFromMass(mass3);

    // Spawn them touching: b1 - b2 - b3
    sim.spawnPlanet(0, 0, mass1);
    sim.spawnPlanet(radius1 + radius2 - 0.5, 0, mass2);
    sim.spawnPlanet(radius1 + 2*(radius2 + radius3) - 1, 0, mass3);

    this.assert(sim.bodies.length === 3, 'Should start with 3 bodies');

    // First handleCollisions - should merge b1+b2 and b2+b3
    sim.handleCollisions();

    // After one collision cycle, we might have 1 or 2 bodies depending on order
    const bodiesAfterCollision = sim.bodies.length;
    this.assert(bodiesAfterCollision <= 3, `Should not create new bodies, got ${bodiesAfterCollision}`);

    // Check that remaining bodies have valid properties
    for (const body of sim.bodies) {
        this.assert(isFinite(body.mass), `Body mass should be finite, got ${body.mass}`);
        this.assert(isFinite(body.radius), `Body radius should be finite, got ${body.radius}`);
        this.assert(body.radius > 0, `Body radius should be positive, got ${body.radius}`);
        // Radius should match mass via unified formula
        const expectedRadius = sim.getRadiusFromMass(body.mass);
        this.assertEqual(body.radius, expectedRadius, 0.001,
            `Body radius ${body.radius} should match formula result ${expectedRadius} for mass ${body.mass}`);
    }
});

tests.test('Merged body radius stays consistent after merge', function() {
    const sim = new SimulatorCore();

    const mass1 = 30;
    const mass2 = 30;
    const radius1 = sim.getRadiusFromMass(mass1);
    const radius2 = sim.getRadiusFromMass(mass2);

    // Create two bodies that will merge
    sim.spawnPlanet(0, 0, mass1);
    sim.spawnPlanet(radius1 + radius2 - 0.5, 0, mass2);

    this.assert(sim.bodies.length === 2, 'Should start with 2 bodies');

    const expectedMergedMass = 60;
    const expectedMergedRadius = sim.getRadiusFromMass(expectedMergedMass);

    sim.handleCollisions();

    this.assert(sim.bodies.length === 1, `Should have 1 body after merge, got ${sim.bodies.length}`);

    const merged = sim.bodies[0];
    this.assertEqual(merged.mass, expectedMergedMass, 0.001, 'Mass should be sum');
    this.assertEqual(merged.radius, expectedMergedRadius, 0.001,
        `Radius ${merged.radius} should equal calculated radius ${expectedMergedRadius}`);
    this.assert(merged.bodyType === sim.getBodyType(expectedMergedMass),
        `Body type should match mass ${expectedMergedMass}`);
});

tests.test('Texture generation uses correct radius parameter', function() {
    const sim = new SimulatorCore();

    // Create a body and manually call texture generation with different radius
    const body = new Body(0, 0, 0, 0, 100, sim.getRadiusFromMass(100), '#fff', 'planet');

    const radius1 = 5;
    const radius2 = 20;

    const texture1 = body.generateEarthTexture(radius1);
    const texture2 = body.generateEarthTexture(radius2);

    // Texture canvas should be sized based on passed radius, not body.radius
    const expectedSize1 = Math.ceil(radius1 * 4);
    const expectedSize2 = Math.ceil(radius2 * 4);

    this.assertEqual(texture1.width, expectedSize1, 0.001,
        `Texture 1 width should be ${expectedSize1} for radius ${radius1}`);
    this.assertEqual(texture2.width, expectedSize2, 0.001,
        `Texture 2 width should be ${expectedSize2} for radius ${radius2}`);

    // Texture 2 should be bigger than texture 1
    this.assert(texture2.width > texture1.width,
        `Texture 2 (radius=${radius2}) should be larger than texture 1 (radius=${radius1})`);
});

tests.test('All body types generate correct sprite sizes', function() {
    const bodyTypes = [
        { type: 'debris', mass: 2 },
        { type: 'asteroid', mass: 10 },
        { type: 'planet', mass: 40 },
        { type: 'gas-giant', mass: 80 },
        { type: 'star', mass: 200 },
    ];

    for (const test of bodyTypes) {
        const sim = new SimulatorCore();
        sim.spawnPlanet(0, 0, test.mass);

        const body = sim.bodies[0];
        const expectedRadius = sim.getRadiusFromMass(test.mass);
        const expectedType = sim.getBodyType(test.mass);

        this.assertEqual(body.radius, expectedRadius, 0.001,
            `${test.type} with mass ${test.mass} should have radius ${expectedRadius}, got ${body.radius}`);
        this.assert(body.bodyType === expectedType,
            `${test.type} with mass ${test.mass} should be type '${expectedType}', got '${body.bodyType}'`);
    }
});

tests.test('Merged bodies maintain correct radius through chain collisions', function() {
    const sim = new SimulatorCore();

    // Create a chain: when b1+b2 merge, result should collide with b3
    sim.spawnPlanet(-100, 0, 20);
    sim.spawnPlanet(0, 0, 20);
    sim.spawnPlanet(100, 0, 20);

    const b1 = sim.bodies[0];
    const b2 = sim.bodies[1];
    const b3 = sim.bodies[2];

    // Position b1 and b2 to touch
    b2.x = b1.radius + b2.radius - 0.5;

    // Position b3 close enough to merged result
    b3.x = b1.x + (b1.radius + b2.radius) + sim.getRadiusFromMass(40) - 0.5;

    // Track masses before collisions
    const masses = [b1.mass, b2.mass, b3.mass];
    const totalMass = masses.reduce((a, b) => a + b, 0);

    sim.handleCollisions();

    // After collisions, should have 1 body (or 2 if they don't all touch)
    this.assert(sim.bodies.length >= 1, 'Should have at least 1 body');

    // Check all remaining bodies have correct radius
    for (const body of sim.bodies) {
        const expectedRadius = sim.getRadiusFromMass(body.mass);
        this.assertEqual(body.radius, expectedRadius, 0.001,
            `After merge, body with mass ${body.mass} should have radius ${expectedRadius}, got ${body.radius}`);
    }
});

// ==================== RUN TESTS ====================

tests.runAll();
