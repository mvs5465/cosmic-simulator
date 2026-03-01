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
    getBlackHoleRenderMetrics: getBlackHoleRenderMetricsForTest,
    shouldRenderBlackHoleFlares: shouldRenderBlackHoleFlaresForTest,
} = window.CosmicSimulatorCore;

tests.test('runtime exports are available', function() {
    this.assert(typeof Simulator === 'function', 'Simulator should be defined');
    this.assert(typeof Body === 'function', 'Body should be defined');
    this.assert(typeof SupernovaEffect === 'function', 'SupernovaEffect should be defined');
    this.assert(typeof bootstrapSimulatorApp === 'function', 'bootstrapSimulatorApp should be defined');
});

tests.test('test page does not auto-bootstrap the full app', function() {
    this.assert(typeof window.sim === 'undefined', 'window.sim should be undefined on test.html');
});

tests.test('standalone simulator can be constructed without control markup', function() {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    const sim = new Simulator(canvas);
    sim.spawnPlanet(0, 0, 25);

    this.assert(sim.bodies.length === 1, 'one body should be spawned');
    this.assert(sim.bodies[0].bodyType === 'planet', `expected planet, got ${sim.bodies[0].bodyType}`);
    this.assert(sim.bodies[0].texture, 'browser body should have a texture');
});

tests.test('star merge creates a neutron star and a supernova effect', function() {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    const sim = new Simulator(canvas);
    const mass = 800;
    const radius = sim.getRadiusFromMass(mass);
    sim.spawnPlanet(0, 0, mass);
    sim.spawnPlanet(radius * 2 - 0.5, 0, mass);

    sim.handleCollisions();

    this.assert(sim.bodies.length === 1, 'collision should produce one merged body');
    this.assert(sim.bodies[0].bodyType === 'neutron-star', `expected neutron-star, got ${sim.bodies[0].bodyType}`);
    this.assert(sim.supernovaEffects.length === 1, 'expected one supernova effect');
});

tests.test('draw runs without throwing for a minimal scene', function() {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    const sim = new Simulator(canvas);
    sim.spawnPlanet(-100, 0, 25);
    sim.spawnPlanet(100, 0, 60);
    sim.draw();

    this.assert(true, 'draw completed');
});

tests.test('black-hole merge keeps flare detail visible on the merged body during the active merge', function() {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    const sim = new Simulator(canvas);
    const mass = 1100000;
    const radius = sim.getRadiusFromMass(mass);
    sim.spawnPlanet(0, 0, mass);
    sim.spawnPlanet(radius * 0.2, 0, mass);

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

    const metrics = getBlackHoleRenderMetricsForTest(body.radius * body.mergeScale);
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
    sim.spawnPlanet(0, 0, 2200000);
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
