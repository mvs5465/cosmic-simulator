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

tests.run();
