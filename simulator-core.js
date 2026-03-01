// Backwards-compatible shim. The shared core now lives in sim-core.js.
const core = require('./sim-core.js');

module.exports = {
    ...core,
    SimulatorCore: core.SimulationCore,
};
