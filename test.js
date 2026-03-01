class BrowserTestRunner {
    constructor(outputNode) {
        this.outputNode = outputNode;
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }

    test(name, fn) {
        this.tests.push({ name, fn });
    }

    log(message, className = '') {
        const line = document.createElement('div');
        line.textContent = message;
        if (className) {
            line.className = className;
        }
        this.outputNode.appendChild(line);
    }

    assert(condition, message) {
        if (!condition) {
            throw new Error(message);
        }
    }

    async run() {
        this.outputNode.textContent = '';
        this.log('Running browser smoke tests...');

        for (const test of this.tests) {
            try {
                await test.fn.call(this);
                this.passed++;
                this.log(`PASS ${test.name}`, 'pass');
            } catch (error) {
                this.failed++;
                this.log(`FAIL ${test.name}: ${error.message}`, 'fail');
            }
        }

        const summary = document.createElement('div');
        summary.className = 'summary';
        summary.textContent = `Total: ${this.tests.length} Passed: ${this.passed} Failed: ${this.failed}`;
        this.outputNode.appendChild(summary);
    }
}

const output = document.getElementById('test-output');
const tests = new BrowserTestRunner(output);
const {
    getSpawnPresetDefinitions: getSpawnPresetDefinitionsForTest,
    getCircularOrbitSpeed: getCircularOrbitSpeedForTest,
    getBlackHoleRenderMetrics: getBlackHoleRenderMetricsForTest,
    shouldRenderBlackHoleFlares: shouldRenderBlackHoleFlaresForTest,
} = window.CosmicSimulatorCore;

tests.test('runtime exports are available', function() {
    this.assert(typeof Simulator === 'function', 'Simulator should be defined');
    this.assert(typeof Body === 'function', 'Body should be defined');
    this.assert(typeof AccretionBurstEffect === 'function', 'AccretionBurstEffect should be defined');
    this.assert(typeof KilonovaEffect === 'function', 'KilonovaEffect should be defined');
    this.assert(typeof SupernovaEffect === 'function', 'SupernovaEffect should be defined');
    this.assert(typeof seedScenario === 'function', 'seedScenario should be defined');
    this.assert(typeof bootstrapSimulatorApp === 'function', 'bootstrapSimulatorApp should be defined');
    this.assert(typeof getSpawnPresetDefinitionsForTest === 'function', 'getSpawnPresetDefinitions should be defined');
});

tests.test('test page does not auto-bootstrap the full app', function() {
    this.assert(typeof window.sim === 'undefined', 'window.sim should be undefined on test.html');
});

tests.test('standalone simulator can be constructed without control markup', function() {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    const sim = new Simulator(canvas);
    sim.spawnPlanet(0, 0, 1);

    this.assert(sim.bodies.length === 1, 'one body should be spawned');
    this.assert(sim.bodies[0].bodyType === 'planet', `expected planet, got ${sim.bodies[0].bodyType}`);
    this.assert(sim.bodies[0].texture, 'browser body should have a texture');
});

tests.test('standalone simulator can be destroyed cleanly', function() {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    const sim = new Simulator(canvas);
    sim.destroy();

    this.assert(sim.isDestroyed === true, 'simulator should be marked destroyed');
    this.assert(sim.animationFrameId === null, 'destroy should clear the pending animation frame');
});

tests.test('star merge creates a neutron star and a supernova effect', function() {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    const sim = new Simulator(canvas);
    const mass = 30;
    const radius = sim.getRadiusFromMass(mass, 'star');
    sim.spawnPlanet(0, 0, mass);
    sim.spawnPlanet(radius * 2 - 0.5, 0, mass);

    sim.handleCollisions();

    this.assert(sim.bodies.length === 1, 'collision should produce one merged body');
    this.assert(sim.bodies[0].bodyType === 'neutron-star', `expected neutron-star, got ${sim.bodies[0].bodyType}`);
    this.assert(sim.supernovaEffects.length === 1, 'expected one supernova effect');
});

tests.test('star merging into a black hole creates an accretion burst instead of a supernova', function() {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    const sim = new Simulator(canvas);
    const blackHoleMass = 20;
    const radius = sim.getRadiusFromMass(blackHoleMass, 'black-hole');
    sim.spawnPlanet(0, 0, 30);
    sim.spawnPlanet(radius * 0.1, 0, blackHoleMass, 'black-hole');

    sim.handleCollisions();

    this.assert(sim.bodies.length === 1, 'collision should produce one merged body');
    this.assert(sim.bodies[0].bodyType === 'black-hole', `expected black-hole, got ${sim.bodies[0].bodyType}`);
    this.assert(sim.supernovaEffects.length === 0, 'black-hole consumption should not create a supernova');
    this.assert(sim.accretionBurstEffects.length === 1, 'black-hole consumption should create an accretion burst');
});

tests.test('black holes create accretion bursts when consuming non-stellar bodies too', function() {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    const sim = new Simulator(canvas);
    const blackHoleMass = 20;
    const radius = sim.getRadiusFromMass(blackHoleMass, 'black-hole');
    sim.spawnPlanet(0, 0, blackHoleMass, 'black-hole');
    sim.spawnPlanet(radius * 0.1, 0, 1, 'planet');

    sim.handleCollisions();

    this.assert(sim.bodies.length === 1, 'collision should produce one merged body');
    this.assert(sim.bodies[0].bodyType === 'black-hole', `expected black-hole, got ${sim.bodies[0].bodyType}`);
    this.assert(sim.supernovaEffects.length === 0, 'black-hole consumption should not create a supernova');
    this.assert(sim.accretionBurstEffects.length === 1, 'black-hole consumption should always create an accretion burst');
});

tests.test('neutron-star mergers create a kilonova instead of a supernova', function() {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    const sim = new Simulator(canvas);
    const neutronStarMass = 12;
    const radius = sim.getRadiusFromMass(neutronStarMass, 'neutron-star');
    sim.spawnPlanet(0, 0, neutronStarMass, 'neutron-star');
    sim.spawnPlanet(radius * 1.9, 0, neutronStarMass, 'neutron-star');

    sim.handleCollisions();

    this.assert(sim.bodies.length === 1, 'collision should produce one merged body');
    this.assert(sim.bodies[0].bodyType === 'neutron-star', `expected neutron-star, got ${sim.bodies[0].bodyType}`);
    this.assert(sim.supernovaEffects.length === 0, 'neutron-star mergers should not create a supernova');
    this.assert(sim.kilonovaEffects.length === 1, 'neutron-star mergers should create a kilonova');
});

tests.test('draw runs without throwing for a minimal scene', function() {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    const sim = new Simulator(canvas);
    sim.spawnPlanet(-100, 0, 1);
    sim.spawnPlanet(100, 0, 4);
    sim.draw();

    this.assert(true, 'draw completed');
});

tests.test('drawTrails renders line segments for bodies with motion history', function() {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    const sim = new Simulator(canvas);
    const body = sim.spawnPlanet(0, 0, 1);
    body.trailPoints = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 20, y: 5 },
    ];

    let lineSegments = 0;
    sim.ctx = {
        beginPath() {},
        moveTo() {},
        lineTo() { lineSegments++; },
        stroke() {},
        set strokeStyle(_value) {},
        set lineWidth(_value) {},
        set lineCap(_value) {},
    };

    sim.drawTrails();

    this.assert(lineSegments === 2, `expected two trail line segments, got ${lineSegments}`);
});

tests.test('sandbox scenario seeding creates the expected starting bodies', function() {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    const sim = new Simulator(canvas);
    seedScenario(sim, 'sandbox');

    this.assert(sim.bodies.length === 2, `expected two seeded bodies, got ${sim.bodies.length}`);
});

tests.test('spawn presets expose the menu options from shared config', function() {
    const presetKeys = getSpawnPresetDefinitionsForTest().map((preset) => preset.key);
    const expectedKeys = [
        'random',
        'asteroid',
        'planet',
        'gas-giant',
        'star',
        'white-dwarf',
        'neutron-star',
        'black-hole',
        'supermassive-black-hole',
    ];

    this.assert(
        JSON.stringify(presetKeys) === JSON.stringify(expectedKeys),
        `expected shared preset keys ${expectedKeys.join(', ')}, got ${presetKeys.join(', ')}`
    );
});

tests.test('click spawning respects explicit compact-object presets', function() {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0 });

    const select = document.createElement('select');
    select.id = 'spawn-type';
    const option = document.createElement('option');
    option.value = 'white-dwarf';
    option.selected = true;
    select.appendChild(option);
    document.body.appendChild(select);

    const sim = new Simulator(canvas);
    sim.handleClick({ clientX: 400, clientY: 300 });

    document.body.removeChild(select);

    this.assert(sim.bodies.length === 1, 'click spawning should create one body');
    this.assert(sim.bodies[0].bodyType === 'white-dwarf', `expected white-dwarf, got ${sim.bodies[0].bodyType}`);
});

tests.test('solar-system scenario seeds a central star and orbiting planets', function() {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    const sim = new Simulator(canvas);
    seedScenario(sim, 'solar-system');

    this.assert(sim.darkMatterStrength === 0, `expected no dark matter, got ${sim.darkMatterStrength}`);
    this.assert(sim.bodies.length >= 4 && sim.bodies.length <= 10,
        `expected 4-10 total bodies, got ${sim.bodies.length}`);

    const star = sim.bodies[0];
    const maxInitialOrbit = (sim.canvas.width / (2 * sim.zoom)) * 0.75;
    let orbitalSign = null;
    let totalMomentumX = 0;
    let totalMomentumY = 0;
    const orbitBodies = [];
    this.assert(star.bodyType === 'star', `expected central star, got ${star.bodyType}`);
    this.assert(star.isAnchored === false, 'central star should not be anchored');
    this.assert(star.x === 0 && star.y === 0, `expected star at origin, got (${star.x}, ${star.y})`);
    this.assert(Number.isFinite(star.vx) && Number.isFinite(star.vy), 'expected a valid barycentric star velocity');

    for (const body of sim.bodies) {
        totalMomentumX += body.vx * body.mass;
        totalMomentumY += body.vy * body.mass;
    }

    this.assert(Math.abs(totalMomentumX) < 0.001, `expected near-zero total momentum x, got ${totalMomentumX}`);
    this.assert(Math.abs(totalMomentumY) < 0.001, `expected near-zero total momentum y, got ${totalMomentumY}`);

    for (let i = 1; i < sim.bodies.length; i++) {
        const body = sim.bodies[i];
        this.assert(
            body.bodyType === 'asteroid' || body.bodyType === 'planet' || body.bodyType === 'gas-giant',
            `expected orbital body type asteroid/planet/gas-giant, got ${body.bodyType}`
        );

        const relativeX = body.x - star.x;
        const relativeY = body.y - star.y;
        const relativeVx = body.vx - star.vx;
        const relativeVy = body.vy - star.vy;
        const distance = Math.hypot(relativeX, relativeY);
        const radialDotVelocity = relativeX * relativeVx + relativeY * relativeVy;
        const angularMomentumSign = Math.sign((relativeX * relativeVy) - (relativeY * relativeVx));
        const expectedSpeed = getCircularOrbitSpeedForTest(
            star.mass,
            distance,
            sim.gravityConstant,
            sim.massRealizationScale
        );
        const actualSpeed = Math.hypot(relativeVx, relativeVy);

        this.assert(distance > star.radius, `expected planet outside star radius, got distance ${distance}`);
        this.assert(distance <= maxInitialOrbit + 0.001,
            `expected planet within the initial viewport radius ${maxInitialOrbit}, got ${distance}`);
        this.assert(Math.abs(radialDotVelocity) < 0.001, `expected tangential velocity, got dot ${radialDotVelocity}`);
        this.assert(angularMomentumSign !== 0, 'expected a non-zero orbital direction');
        if (orbitalSign === null) {
            orbitalSign = angularMomentumSign;
        } else {
            this.assert(angularMomentumSign === orbitalSign, 'expected all orbiters to share one orbital direction');
        }
        this.assert(Math.abs(actualSpeed - expectedSpeed) < 0.001,
            `expected orbital speed ${expectedSpeed}, got ${actualSpeed}`);
        orbitBodies.push({ distance, radius: body.radius });
    }

    for (let i = 1; i < orbitBodies.length; i++) {
        const previousOrbit = orbitBodies[i - 1];
        const nextOrbit = orbitBodies[i];
        const previousDistance = previousOrbit.distance;
        const nextDistance = nextOrbit.distance;
        const orbitalRatio = nextDistance / previousDistance;
        const periodRatio = Math.pow(orbitalRatio, 1.5);
        const radialGap = nextDistance - previousDistance;
        const minimumExpectedGap = Math.max(14, previousOrbit.radius + nextOrbit.radius + 8);

        this.assert(nextDistance > previousDistance, 'expected orbital distances to increase outward');
        this.assert(orbitalRatio > 1.02, `expected separated orbital radii, got ratio ${orbitalRatio}`);
        this.assert(radialGap >= minimumExpectedGap,
            `expected orbital gap >= ${minimumExpectedGap}, got ${radialGap}`);
        this.assert(periodRatio < 6.1, `expected a bounded resonance-biased period ratio below 6.1, got ${periodRatio}`);
    }
});

tests.test('globular-cluster scenario seeds a bounded swarm of stars', function() {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    const sim = new Simulator(canvas);
    seedScenario(sim, 'globular-cluster');

    const minimumZoom = 1 / 3;
    const maxZoomOutHalfWidth = sim.canvas.width / (2 * minimumZoom);
    const maxZoomOutHalfHeight = sim.canvas.height / (2 * minimumZoom);
    const clusterRadiusLimit = Math.min(maxZoomOutHalfWidth, maxZoomOutHalfHeight) * 0.8;
    let totalMomentumX = 0;
    let totalMomentumY = 0;
    let movingStars = 0;

    this.assert(sim.darkMatterStrength === 0.25, `expected cluster dark matter 0.25, got ${sim.darkMatterStrength}`);
    this.assert(sim.bodies.length >= 20 && sim.bodies.length <= 40,
        `expected 20-40 stars, got ${sim.bodies.length}`);

    for (const body of sim.bodies) {
        const distance = Math.hypot(body.x, body.y);
        const speed = Math.hypot(body.vx, body.vy);

        this.assert(body.bodyType === 'star', `expected star body type, got ${body.bodyType}`);
        this.assert(distance <= clusterRadiusLimit + 0.001,
            `expected star within max zoom-out radius ${clusterRadiusLimit}, got ${distance}`);

        totalMomentumX += body.vx * body.mass;
        totalMomentumY += body.vy * body.mass;

        if (speed > 0.001) {
            movingStars++;
        }
    }

    this.assert(movingStars === sim.bodies.length, 'expected every cluster star to start with motion');
    this.assert(Math.abs(totalMomentumX) < 0.001, `expected near-zero total momentum x, got ${totalMomentumX}`);
    this.assert(Math.abs(totalMomentumY) < 0.001, `expected near-zero total momentum y, got ${totalMomentumY}`);
});

tests.test('black-hole merge keeps flare detail visible on the merged body during the active merge', function() {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    const sim = new Simulator(canvas);
    const mass = 12000;
    const radius = sim.getRadiusFromMass(mass, 'black-hole');
    sim.spawnPlanet(0, 0, mass, 'black-hole');
    sim.spawnPlanet(radius * 0.2, 0, mass, 'black-hole');

    sim.handleCollisions();

    this.assert(sim.mergeEffects.length === 1, 'expected an active merge effect');
    const mergedBody = sim.mergeEffects[0].mergedBody;

    this.assert(mergedBody.bodyType === 'black-hole', `expected black-hole, got ${mergedBody.bodyType}`);
    this.assert(Array.isArray(mergedBody.blackHoleFlares) && mergedBody.blackHoleFlares.length > 0,
        'merged black hole should have flare data');

    sim.update(0.05);

    this.assert(mergedBody.mergeScale > 0 && mergedBody.mergeScale < 1,
        `expected merged body to still be animating in, got scale ${mergedBody.mergeScale}`);
    this.assert(
        shouldRenderBlackHoleFlaresForTest(mergedBody),
        'merged black hole should keep rendering flare detail while the merge animation is active'
    );
});

tests.test('black-hole merge overlay draws the center core during the active merge', function() {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    const sim = new Simulator(canvas);
    const body = {
        x: 0,
        y: 0,
        radius: 120,
        pulseTime: 0,
        mergeScale: 0.5,
        mergeAlpha: 0.5,
        bodyType: 'black-hole',
    };

    const arcRadii = [];
    sim.ctx = {
        save() {},
        restore() {},
        translate() {},
        rotate() {},
        beginPath() {},
        clip() {},
        fill() {},
        stroke() {},
        arc(_x, _y, radius) { arcRadii.push(radius); },
        createRadialGradient() { return { addColorStop() {} }; },
        set fillStyle(_value) {},
        set strokeStyle(_value) {},
        set lineWidth(_value) {},
        set globalAlpha(_value) {},
    };

    sim.drawAccretionDisk(body);

    const metrics = getBlackHoleRenderMetricsForTest(body.radius * sim.zoom * body.mergeScale);
    const hasCoreRadius = arcRadii.some((radius) => Math.abs(radius - metrics.coreRadius) < 0.001);
    const hasDiskRadius = arcRadii.some((radius) => Math.abs(radius - metrics.diskOuterRadius) < 0.001);

    this.assert(hasCoreRadius, 'merge overlay should draw the black-hole core radius');
    this.assert(hasDiskRadius, 'merge overlay should draw the outer disk radius');
});

tests.test('large black holes still use the same texture render path when texture exists', function() {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    const sim = new Simulator(canvas);
    sim.zoom = 2;
    sim.spawnPlanet(0, 0, 50000, 'black-hole');
    const body = sim.bodies[0];

    this.assert(body.bodyType === 'black-hole', `expected black-hole, got ${body.bodyType}`);
    this.assert(!!body.texture, 'large black hole should have a texture');
    this.assert(body.radius * sim.zoom > 100, 'test setup should exceed the old procedural threshold');

    let proceduralCalls = 0;
    const originalProcedural = sim.drawProceduralBlackHole;
    sim.drawProceduralBlackHole = () => {
        proceduralCalls++;
    };

    sim.draw();
    sim.drawProceduralBlackHole = originalProcedural;

    this.assert(proceduralCalls === 0, 'textured black holes should not switch to the procedural renderer');
});

tests.run();
