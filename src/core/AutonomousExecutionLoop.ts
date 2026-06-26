import { ContextEngine } from './ContextEngine';
import { DecisionEngine } from './DecisionEngine';
import { GoalIntelligenceSystem } from './GoalIntelligenceSystem';
import { HybridSuperIntelligence } from './HybridSuperIntelligence';
import { KnowledgeSystem } from './KnowledgeSystem';
import { EvolutionControlSystem } from './EvolutionControlSystem';
import { SelfHealingSystem } from './SelfHealingSystem';

export class AutonomousExecutionLoop {
  selfHealing: SelfHealingSystem;

  constructor(
    private context: ContextEngine,
    private decision: DecisionEngine,
    private goalIntelligence: GoalIntelligenceSystem,
    private hybridAI: HybridSuperIntelligence,
    private knowledge: KnowledgeSystem,
    private evolutionControl: EvolutionControlSystem
  ) {
    this.selfHealing = new SelfHealingSystem(this.hybridAI.controlSystem);
  }

  async run(goal: string) {
    this.context.trackGoal(goal);
    const decisions = this.decision.decide(goal, this.context.getState());

    if (decisions.stopExecution) {
      return { status: 'STOPPED', reason: 'Decision Engine halted execution' };
    }

    const plan = this.goalIntelligence.breakdown(goal);
    let iterations = 0;
    let success = false;
    let finalResult = null;

    while (iterations < 3 && !success) {
      console.log(`[AUTONOMOUS LOOP] Iteration ${iterations + 1}`);
      
      // Use self healing execution wrap
      const result = await this.selfHealing.executeWithHealing(plan.goal, plan.tasks);
      
      this.context.recordExecution(result);
      finalResult = result;

      if (result.status === 'success') {
        success = true;
        this.knowledge.storeSuccess(plan.goal, plan.tasks);
      } else {
        this.knowledge.storeFailure(plan.goal, result);
        // Evolve
        if (decisions.applyImprovements) {
           this.evolutionControl.evolve(result);
           this.context.recordImprovement();
        }
      }

      iterations++;
    }

    return finalResult;
  }
}
