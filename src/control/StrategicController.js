const executionPlanner = require('../strategy/ExecutionPlanner');

function executeStrategy(analysis, comparison, research) {
    const plan = executionPlanner.plan(
        analysis.refinedGoal,
        comparison.recommended,
        research.recommendedStructure,
        research.starterCode || {}
    );
    return plan;
}

module.exports = { executeStrategy };
