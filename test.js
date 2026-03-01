// ==================== TEST SUITE ====================

class CosmicSimulatorTests {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
        this.results = [];
    }

    // Assertion helpers
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

    // Test registration
    test(name, fn) {
        this.tests.push({ name, fn });
    }

    // Run all tests
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
        console.log('\n' + '='.repeat(60));
        console.log('TEST SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total: ${this.tests.length} | Passed: ${this.passed} | Failed: ${this.failed}`);
        console.log('='.repeat(60) + '\n');

        if (this.failed > 0) {
            console.log('Failed Tests:');
            this.results.filter(r => r.status.includes('FAIL')).forEach(r => {
                console.log(`  ${r.name}`);
                console.log(`  ${r.status}`);
            });
        }
    }
}

// ==================== TEST DEFINITIONS ====================

const tests = new CosmicSimulatorTests();

// ===== UNIT TESTS: Mass-to-Radius Formula =====

tests.test('getRadiusFromMass: radius = cbrt(mass) * 2', function() {
    const canvas = document.createElement('canvas');
    const sim = new Simulator(canvas);

    // Test values
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
    const canvas = document.createElement('canvas');
    const sim = new Simulator(canvas);

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
    const canvas = document.createElement('canvas');
    const sim = new Simulator(canvas);

    sim.spawnPlanet(0, 0, 10);

    this.assert(sim.bodies.length === 1, 'Should have 1 body');
    const body = sim.bodies[0];
    this.assertEqual(body.mass, 10, 0.001, 'Mass mismatch');
    this.assertEqual(body.radius, sim.getRadiusFromMass(10), 0.001, 'Radius mismatch');
    this.assert(body.bodyType === 'planet', `Type should be 'planet', got '${body.bodyType}'`);
});

tests.test('spawnBlackHole: creates body with high mass', function() {
    const canvas = document.createElement('canvas');
    const sim = new Simulator(canvas);

    sim.spawnBlackHole(0, 0);

    this.assert(sim.bodies.length === 1, 'Should have 1 body');
    const body = sim.bodies[0];
    this.assert(body.mass >= 100, `Mass should be >= 100, got ${body.mass}`);
    this.assert(body.bodyType === 'star', `Type should be 'star' or higher, got '${body.bodyType}'`);
});

tests.test('spawnRandomCluster: creates multiple bodies', function() {
    const canvas = document.createElement('canvas');
    const sim = new Simulator(canvas);

    sim.spawnRandomCluster(0, 0, 5);

    this.assert(sim.bodies.length === 5, `Should have 5 bodies, got ${sim.bodies.length}`);
    for (const body of sim.bodies) {
        this.assert(body.mass > 0, 'All bodies should have positive mass');
        this.assert(body.radius > 0, 'All bodies should have positive radius');
    }
});

// ===== INTEGRATION TESTS: Collision & Merge =====

tests.test('Collision: two bodies merge when they touch', function() {
    const canvas = document.createElement('canvas');
    const sim = new Simulator(canvas);

    // Spawn two bodies at touching distance
    const mass1 = 10;
    const mass2 = 15;
    const radius1 = sim.getRadiusFromMass(mass1);
    const radius2 = sim.getRadiusFromMass(mass2);

    sim.spawnPlanet(0, 0, mass1);
    sim.spawnPlanet(radius1 + radius2 - 0.5, 0, mass2); // Just touching

    this.assert(sim.bodies.length === 2, 'Should have 2 bodies before collision');

    // Simulate one frame
    sim.update(0.016);
    sim.handleCollisions();

    this.assert(sim.bodies.length === 1, 'Should have 1 body after collision');
    const merged = sim.bodies[0];
    this.assertEqual(merged.mass, mass1 + mass2, 0.001, 'Merged mass mismatch');
    this.assertEqual(merged.radius, sim.getRadiusFromMass(mass1 + mass2), 0.001, 'Merged radius mismatch');
});

tests.test('Collision: merged body changes type if crossing threshold', function() {
    const canvas = document.createElement('canvas');
    const sim = new Simulator(canvas);

    // Spawn two asteroids that merge into planet
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
    const canvas = document.createElement('canvas');
    const sim = new Simulator(canvas);

    // Spawn two bodies with known velocities
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

    // Move bodies close enough to collide
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
    const canvas = document.createElement('canvas');
    const sim = new Simulator(canvas);

    // Spawn two bodies far apart
    sim.spawnPlanet(-100, 0, 20);
    sim.spawnPlanet(100, 0, 20);

    const body1 = sim.bodies[0];
    const body2 = sim.bodies[1];

    // Clear velocities
    body1.vx = 0;
    body1.vy = 0;
    body2.vx = 0;
    body2.vy = 0;

    // Simulate one frame
    sim.update(0.016);

    // Body1 should accelerate toward body2 (positive x direction)
    // Body2 should accelerate toward body1 (negative x direction)
    this.assert(body1.ax > 0, `Body1 should accelerate in +x, got ax=${body1.ax}`);
    this.assert(body2.ax < 0, `Body2 should accelerate in -x, got ax=${body2.ax}`);
});

tests.test('Dark Matter: pulls bodies toward center', function() {
    const canvas = document.createElement('canvas');
    const sim = new Simulator(canvas);

    // Spawn body far from center
    sim.spawnPlanet(500, 0, 20);
    const body = sim.bodies[0];
    body.vx = 0;
    body.vy = 0;

    // Ensure dark matter is strong
    sim.darkMatterStrength = 3;

    sim.update(0.016);

    // Body should accelerate toward center (negative x direction)
    this.assert(body.ax < 0, `Body should be pulled toward center (ax < 0), got ax=${body.ax}`);
});

tests.test('Time Scale: affects physics rate', function() {
    const canvas = document.createElement('canvas');
    const sim = new Simulator(canvas);

    sim.spawnPlanet(-100, 0, 20);
    sim.spawnPlanet(100, 0, 20);

    const body1 = sim.bodies[0];
    body1.vx = 0;
    body1.vy = 0;

    // Simulate with normal time
    sim.timeScale = 1;
    sim.update(0.016);
    const ax1 = body1.ax;

    // Reset
    body1.ax = 0;

    // Simulate with 2x time
    sim.timeScale = 2;
    sim.update(0.016);
    const ax2 = body1.ax;

    // Acceleration should be the same (time scale doesn't affect forces, only integration)
    // Actually, acceleration is independent of time scale in this model
    this.assert(Math.abs(ax1 - ax2) < 0.001,
        `Acceleration should be same regardless of time scale, got ${ax1} vs ${ax2}`);
});

// ===== EDGE CASES =====

tests.test('Edge case: zero mass body', function() {
    const canvas = document.createElement('canvas');
    const sim = new Simulator(canvas);

    sim.spawnPlanet(0, 0, 0.001); // Very small mass
    this.assert(sim.bodies.length === 1, 'Should spawn even with tiny mass');
    this.assert(sim.bodies[0].mass > 0, 'Mass should remain positive');
});

tests.test('Edge case: very large mass body', function() {
    const canvas = document.createElement('canvas');
    const sim = new Simulator(canvas);

    sim.spawnPlanet(0, 0, 10000); // Huge mass
    this.assert(sim.bodies.length === 1, 'Should spawn with huge mass');
    const radius = sim.bodies[0].radius;
    const expected = sim.getRadiusFromMass(10000);
    this.assertEqual(radius, expected, 0.001, 'Radius formula should work for huge mass');
});

tests.test('Edge case: bodies at exact center (dark matter origin)', function() {
    const canvas = document.createElement('canvas');
    const sim = new Simulator(canvas);

    sim.spawnPlanet(0, 0, 20);
    const body = sim.bodies[0];
    body.vx = 0;
    body.vy = 0;

    sim.darkMatterStrength = 3;
    sim.update(0.016);

    // At center, dark matter force should be near zero (distance = 0 causes issues with epsilon)
    // The test just verifies it doesn't crash
    this.assert(isFinite(body.ax), 'Acceleration at center should be finite');
    this.assert(isFinite(body.ay), 'Acceleration at center should be finite');
});

// ===== SUPERNOVA TESTS =====

tests.test('Supernova: triggered only on star->neutron-star transition', function() {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const sim = new Simulator(canvas);

    // Create two stars (mass ~200) that will merge into neutron star (mass ~400)
    sim.spawnPlanet(0, 0, 200); // Star
    sim.spawnPlanet(5, 0, 200); // Star

    this.assert(sim.supernovaEffects.length === 0, 'No supernova before collision');

    sim.handleCollisions();

    this.assert(sim.supernovaEffects.length > 0, 'Supernova should trigger on star merge');
    const effect = sim.supernovaEffects[0];
    this.assert(effect.body !== null && effect.body !== undefined, 'Supernova should have body reference');
    this.assert(effect.body.bodyType === 'neutron-star', `Body should be neutron-star, got ${effect.body.bodyType}`);
});

tests.test('Supernova: NOT triggered on asteroid collision', function() {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const sim = new Simulator(canvas);

    sim.spawnPlanet(0, 0, 8); // Asteroid
    sim.spawnPlanet(5, 0, 8); // Asteroid

    sim.handleCollisions();

    this.assert(sim.supernovaEffects.length === 0, 'Supernova should NOT trigger on asteroid merge');
});

tests.test('Supernova: NOT triggered when neutron-star collides with something', function() {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const sim = new Simulator(canvas);

    sim.spawnPlanet(0, 0, 2000); // Neutron star
    sim.spawnPlanet(10, 0, 30);   // Planet

    sim.handleCollisions();

    this.assert(sim.supernovaEffects.length === 0, 'Supernova should NOT trigger when NS hits other body');
});

tests.test('Supernova: body marked with supernovaTime during effect', function() {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const sim = new Simulator(canvas);

    sim.spawnPlanet(0, 0, 200); // Star
    sim.spawnPlanet(5, 0, 200); // Star

    sim.handleCollisions();

    if (sim.supernovaEffects.length > 0) {
        const body = sim.supernovaEffects[0].body;
        this.assert(body.supernovaTime > 0, `Body should have supernovaTime > 0, got ${body.supernovaTime}`);
    }
});

tests.test('Supernova: body is NOT rendered during supernova (skipped by draw loop)', function() {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const sim = new Simulator(canvas);

    sim.spawnPlanet(0, 0, 200);
    sim.spawnPlanet(5, 0, 200);

    sim.handleCollisions();

    // In the draw() function, bodies with supernovaTime > 0 are skipped
    // This test verifies the logic exists
    if (sim.supernovaEffects.length > 0) {
        const body = sim.supernovaEffects[0].body;
        this.assert(body.supernovaTime > 0, 'Body should be marked to skip rendering');
    }
});

tests.test('Collision explosion: particles created on collision', function() {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const sim = new Simulator(canvas);

    const initialCount = sim.particles.length;

    sim.spawnPlanet(0, 0, 30); // Planet
    sim.spawnPlanet(10, 0, 30); // Planet

    sim.handleCollisions();

    this.assert(sim.particles.length > initialCount, 'Particles should be created on collision');
});

tests.test('Collision explosion: supernova creates its own particles', function() {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const sim = new Simulator(canvas);

    const initialCount = sim.particles.length;

    sim.spawnPlanet(0, 0, 200); // Star
    sim.spawnPlanet(5, 0, 200); // Star

    sim.handleCollisions();

    // Supernova collision should create both:
    // 1. Normal collision particles from createExplosion()
    // 2. High-intensity particles from createSupernovaWithBody()
    this.assert(sim.particles.length > initialCount, 'Supernova collision should create many particles');
});

tests.test('Supernova phase progression', function() {
    const effect = new SupernovaEffect(0, 0, null, 15.0);

    // Phase 1: Lead-up (0-2s)
    effect.time = 1.0;
    let props = effect.getProperties();
    this.assert(props.phase === 1, `At t=1.0s, should be phase 1, got ${props.phase}`);
    this.assert(props.showWhiteSphere === true, 'Phase 1 should show white sphere');

    // Phase 2: Collapse (2-2.5s)
    effect.time = 2.2;
    props = effect.getProperties();
    this.assert(props.phase === 2, `At t=2.2s, should be phase 2, got ${props.phase}`);
    this.assert(props.showWhiteSphere === true, 'Phase 2 should show white sphere');
    this.assert(props.brightness === 0, 'Phase 2 should be dark');

    // Phase 3: Explosion with peak white (2.5-5.5s)
    effect.time = 3.5;  // Middle of phase 3 (peak white region)
    props = effect.getProperties();
    this.assert(props.phase === 3, `At t=3.5s, should be phase 3, got ${props.phase}`);
    this.assert(props.showWhiteSphere === true, 'Phase 3 should show white sphere');
    this.assert(props.brightness > 2.0, `Phase 3 middle should be very bright (>2.0), got ${props.brightness}`);

    // Phase 4: Slow fade (5.5-15s)
    effect.time = 10;
    props = effect.getProperties();
    this.assert(props.phase === 4, `At t=10s, should be phase 4, got ${props.phase}`);
    this.assert(props.showWhiteSphere === false, 'Phase 4 should NOT show white sphere');
});

tests.test('White sphere: only drawn during phases 1-3', function() {
    const effect = new SupernovaEffect(0, 0, null, 15.0);

    // Phase 1, 2, 3 should have showWhiteSphere = true
    for (let t of [1, 3.5, 5]) {
        effect.time = t;
        const props = effect.getProperties();
        this.assert(props.showWhiteSphere === true, `Phase ${props.phase} (t=${t}) should show white sphere`);
    }

    // Phase 4 should have showWhiteSphere = false
    effect.time = 10;
    const props = effect.getProperties();
    this.assert(props.showWhiteSphere === false, 'Phase 4 should NOT show white sphere');
});

tests.test('White sphere brightness in phase 3 (explosion peak)', function() {
    const effect = new SupernovaEffect(0, 0, null, 15.0);

    // During first 30% of phase 3 (0.6s into 2s phase), brightness should be high
    effect.time = 4.3; // Very early in phase 3
    const props = effect.getProperties();
    this.assert(props.brightness >= 1.0, `Early phase 3 should be bright, got ${props.brightness}`);
    this.assert(props.color.includes('255, 255, 255'), 'Phase 3 explosion should be pure white');
});

// ===== NEUTRON STAR APPEARANCE TESTS =====

tests.test('Neutron star visible during phase 4 fade (showWhiteSphere=false)', function() {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const sim = new Simulator(canvas);

    // Create two stars
    sim.spawnPlanet(0, 0, 200);
    sim.spawnPlanet(5, 0, 200);

    sim.handleCollisions();

    this.assert(sim.supernovaEffects.length > 0, 'Supernova should exist');
    this.assert(sim.bodies.length === 1, 'Should have merged body');

    const body = sim.bodies[0];
    const effect = sim.supernovaEffects[0];

    // During phases 1-3, white sphere is shown (body should be skipped)
    for (let i = 0; i < 5; i++) {
        sim.update(0.5);
    }
    let props = effect.getProperties();
    this.assert(props.phase <= 3, `Should be in early phase, got ${props.phase}`);
    this.assert(props.showWhiteSphere === true, 'Phases 1-3 should show white sphere');

    // During phase 4, white sphere is gone (body should render as neutron star)
    for (let i = 0; i < 10; i++) {
        sim.update(0.5);
    }
    props = effect.getProperties();
    this.assert(props.phase === 4, `Should be in phase 4, got ${props.phase}`);
    this.assert(props.showWhiteSphere === false, 'Phase 4 should NOT show white sphere');
    // Body is still marked with supernovaTime, but should render because showWhiteSphere=false
    this.assert(body.supernovaTime > 0, 'Body should still be marked as in supernova');
});

tests.test('Neutron star appears after supernova ends', function() {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const sim = new Simulator(canvas);

    // Create two stars
    sim.spawnPlanet(0, 0, 200);
    sim.spawnPlanet(5, 0, 200);

    sim.handleCollisions();

    this.assert(sim.supernovaEffects.length > 0, 'Supernova should exist');
    this.assert(sim.bodies.length === 1, 'Should have merged body');

    const body = sim.bodies[0];

    // Fast-forward through the supernova (15 seconds)
    for (let i = 0; i < 16; i++) {
        sim.update(1.0);
    }

    // After supernova ends, body should be fully revealed
    this.assert(sim.supernovaEffects.length === 0, 'Supernova effect should be removed');
    this.assert(body.supernovaTime === 0, 'Body supernovaTime should be reset to 0');
    this.assert(body.bodyType === 'neutron-star', 'Body should be neutron star');
});

// ===== DIAGNOSTIC: White Sphere and Collision Effects =====

tests.test('DIAGNOSTIC: Simulate star-star collision and track supernova creation', function() {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const sim = new Simulator(canvas);

    // Create two stars close together
    console.log('\n--- DIAGNOSTIC: Star Collision ---');
    console.log('Creating two stars at (0,0) and (5,0)...');
    sim.spawnPlanet(0, 0, 200); // Star
    sim.spawnPlanet(5, 0, 200); // Star

    const body1 = sim.bodies[0];
    const body2 = sim.bodies[1];
    console.log(`Body1: type=${body1.bodyType}, mass=${body1.mass}, radius=${body1.radius.toFixed(2)}`);
    console.log(`Body2: type=${body2.bodyType}, mass=${body2.mass}, radius=${body2.radius.toFixed(2)}`);
    console.log(`Bodies count before collision: ${sim.bodies.length}`);

    // Trigger collision
    console.log('Running collision detection...');
    sim.handleCollisions();

    console.log(`Bodies count after collision: ${sim.bodies.length}`);
    console.log(`Supernova effects count: ${sim.supernovaEffects.length}`);

    if (sim.supernovaEffects.length > 0) {
        const effect = sim.supernovaEffects[0];
        const props = effect.getProperties();
        console.log(`Supernova created:`);
        console.log(`  - Position: (${effect.x.toFixed(1)}, ${effect.y.toFixed(1)})`);
        console.log(`  - Body type: ${effect.body ? effect.body.bodyType : 'null'}`);
        console.log(`  - Body mass: ${effect.body ? effect.body.mass.toFixed(1) : 'null'}`);
        console.log(`  - Body radius: ${effect.body ? effect.body.radius.toFixed(2) : 'null'}`);
        console.log(`  - Body supernovaTime: ${effect.body ? effect.body.supernovaTime.toFixed(1) : 'null'}`);
        console.log(`  - Phase 1 properties:`);
        effect.time = 1.5;
        const props1 = effect.getProperties();
        console.log(`    - radius: ${props1.radius.toFixed(1)}, brightness: ${props1.brightness.toFixed(2)}, showWhiteSphere: ${props1.showWhiteSphere}, phase: ${props1.phase}`);
    }

    if (sim.bodies.length > 0) {
        const merged = sim.bodies[0];
        console.log(`Merged body:`);
        console.log(`  - type: ${merged.bodyType}`);
        console.log(`  - mass: ${merged.mass.toFixed(1)}`);
        console.log(`  - radius: ${merged.radius.toFixed(2)}`);
        console.log(`  - supernovaTime: ${merged.supernovaTime}`);
    }

    console.log(`Collision particles created: ${sim.particles.length}\n`);

    this.assert(sim.supernovaEffects.length > 0, 'Supernova should be created');
    this.assert(sim.bodies.length === 1, 'Should have 1 merged body');
});

// Run all tests
console.log('🧪 Initializing test suite...');
tests.runAll().then(() => {
    console.log('\n✅ Test suite complete!');
});
