import { ControlSystem } from './ControlSystem';
import { ObserverSystem } from './ObserverSystem';
import { AnalyzerSystem } from './AnalyzerSystem';
import { ImprovementPlanner } from './ImprovementPlanner';
import { ImprovementQueue } from './ImprovementQueue';

export class SelfLearningLoop {
  constructor(
    private controlSystem: ControlSystem,
    private observer: ObserverSystem,
    private analyzer: AnalyzerSystem,
    private planner: ImprovementPlanner,
    private queue: ImprovementQueue
  ) {}

  async runLoop(goal: string, steps: any[], maxIterations: number = 3) {
    let currentIteration = 0;
    
    while (currentIteration < maxIterations) {
      console.log(`[LEARNING_LOOP] Iteration ${currentIteration + 1}`);
      const workflow_id = this.observer.startWorkflow(goal);
      
      const startTime = Date.now();
      const res = await this.controlSystem.executeGoal(goal, steps);
      this.observer.endWorkflow(workflow_id, Date.now() - startTime, res.status as any);

      // We need ControlSystem to record to our ObserverSystem, but we can do it by reading ControlSystem's local logs and dumping them here
      for (const log of res.logs || []) {
        this.observer.recordStep(workflow_id, log);
      }

      const weaknesses = this.analyzer.analyzeWorkflow(workflow_id);
      if (weaknesses.length === 0) {
        console.log('[LEARNING_LOOP] No weaknesses found. Stable.');
        break;
      }

      const suggestions = this.planner.plan(weaknesses);
      this.queue.addSuggestions(suggestions);

      await this.queue.processNext();
      
      currentIteration++;
    }

    return { status: 'LEARNING LOOP COMPLETE' };
  }
}
