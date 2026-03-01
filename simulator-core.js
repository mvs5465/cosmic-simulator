// ==================== PHYSICS ENGINE (Core, no DOM) ====================

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
        this.texture = null;
        this.rotationAngle = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.02;
    }

    applyForce(fx, fy) {
        this.ax += fx / this.mass;
        this.ay += fy / this.mass;
    }

    update(dt) {
        this.vx += this.ax * dt;
        this.vy += this.ay * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.ax = 0;
        this.ay = 0;

        if (this.isEarthlike) {
            this.rotationAngle += this.rotationSpeed;
        }
    }

    // Stub texture generators for testing
    generateEarthTexture(radius = this.radius) {
        const mockCanvas = { width: Math.ceil(radius * 4), height: Math.ceil(radius * 4) };
        return mockCanvas;
    }

    generateGasGiantTexture(radius = this.radius) {
        const mockCanvas = { width: Math.ceil(radius * 4), height: Math.ceil(radius * 4) };
        return mockCanvas;
    }

    generateStarTexture(radius = this.radius) {
        const mockCanvas = { width: Math.ceil(radius * 4), height: Math.ceil(radius * 4) };
        return mockCanvas;
    }

    generateAsteroidTexture(radius = this.radius) {
        const mockCanvas = { width: Math.ceil(radius * 4), height: Math.ceil(radius * 4) };
        return mockCanvas;
    }
}

class SimulatorCore {
    constructor() {
        this.bodies = [];
        this.gravityConstant = 0.5;
        this.timeScale = 2;

        // Dark matter attractor at origin (invisible)
        this.darkMatterX = 0;
        this.darkMatterY = 0;
        this.darkMatterMass = 50;
        this.darkMatterStrength = 3;

        // Mass thresholds for body types
        this.massThresholds = {
            asteroid: 5,
            planet: 20,
            gasGiant: 60,
            star: 150,
        };
    }

    getBodyType(mass) {
        if (mass < this.massThresholds.asteroid) return 'debris';
        if (mass < this.massThresholds.planet) return 'asteroid';
        if (mass < this.massThresholds.gasGiant) return 'planet';
        if (mass < this.massThresholds.star) return 'gas-giant';
        return 'star';
    }

    getRadiusFromMass(mass) {
        return Math.cbrt(mass) * 2;
    }

    spawnPlanet(x, y, mass = null) {
        if (mass === null) {
            mass = Math.random() * 30 + 5;
        }
        const radius = this.getRadiusFromMass(mass);
        const bodyType = this.getBodyType(mass);

        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 15 + 5;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        const body = new Body(x, y, vx, vy, mass, radius, '#ffffff', bodyType);
        this.bodies.push(body);
    }

    spawnBlackHole(x, y) {
        const mass = Math.random() * 150 + 100;
        const radius = this.getRadiusFromMass(mass);
        const bodyType = this.getBodyType(mass);

        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 15 + 5;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        const body = new Body(x, y, vx, vy, mass, radius, '#ffffff', bodyType);
        this.bodies.push(body);
    }

    spawnRandomCluster(x, y, count = 5) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 100 + 50;
            const px = x + Math.cos(angle) * distance;
            const py = y + Math.sin(angle) * distance;
            const vx = Math.random() * 200 - 100;
            const vy = Math.random() * 200 - 100;
            const mass = Math.random() * 40 + 5;
            const radius = this.getRadiusFromMass(mass);
            const bodyType = this.getBodyType(mass);

            const body = new Body(px, py, vx, vy, mass, radius, '#ffffff', bodyType);
            this.bodies.push(body);
        }
    }

    update(dt) {
        dt *= this.timeScale;

        // Calculate gravitational forces between bodies
        for (let i = 0; i < this.bodies.length; i++) {
            for (let j = i + 1; j < this.bodies.length; j++) {
                const b1 = this.bodies[i];
                const b2 = this.bodies[j];

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

        // Dark matter attractor
        for (const body of this.bodies) {
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

        // Update positions
        for (const body of this.bodies) {
            body.update(dt);
        }

        // Handle collisions
        this.handleCollisions();

        // Remove bodies too far away
        this.bodies = this.bodies.filter(b => {
            const distance = Math.sqrt(b.x * b.x + b.y * b.y);
            return distance < 10000;
        });
    }

    handleCollisions() {
        for (let i = 0; i < this.bodies.length; i++) {
            for (let j = i + 1; j < this.bodies.length; j++) {
                const b1 = this.bodies[i];
                const b2 = this.bodies[j];

                const dx = b2.x - b1.x;
                const dy = b2.y - b1.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const minDist = b1.radius + b2.radius;

                if (dist < minDist) {
                    const totalMass = b1.mass + b2.mass;
                    const newVx = (b1.vx * b1.mass + b2.vx * b2.mass) / totalMass;
                    const newVy = (b1.vy * b1.mass + b2.vy * b2.mass) / totalMass;
                    const newX = (b1.x * b1.mass + b2.x * b2.mass) / totalMass;
                    const newY = (b1.y * b1.mass + b2.y * b2.mass) / totalMass;

                    const newRadius = this.getRadiusFromMass(totalMass);
                    const newBodyType = this.getBodyType(totalMass);

                    b1.mass = totalMass;
                    b1.radius = newRadius;
                    b1.bodyType = newBodyType;
                    b1.x = newX;
                    b1.y = newY;
                    b1.vx = newVx;
                    b1.vy = newVy;

                    this.bodies.splice(j, 1);
                    j--;
                }
            }
        }
    }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Body, SimulatorCore };
}
