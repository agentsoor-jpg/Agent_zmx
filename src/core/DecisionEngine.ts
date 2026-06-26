import { IntelligencePrioritySystem } from './IntelligencePrioritySystem';

export class DecisionEngine {
  constructor(private priority: IntelligencePrioritySystem) {}

  decide(goal: string, contextState: any) {
    console.log('[DECISION ENGINE] Analyzing decisions...');
    
    // Priority check
    const currentPriority = this.priority.getPriority();
    console.log(`[DECISION ENGINE] Current Priority: ${currentPriority[0]}`);

    // Decisions
    const useAgents = goal.split(' ').length > 3 || goal.includes('complex');
    const applyImprovements = contextState.pastExecutions.length > 0;
    const stopExecution = contextState.activeGoals.length > 5; // throttle

    return {
      useAgents,
      applyImprovements,
      stopExecution
    };
  }
}
