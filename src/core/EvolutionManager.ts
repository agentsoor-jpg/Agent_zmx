import { ControlSystem } from './ControlSystem';
import { ObserverSystem } from './ObserverSystem';
import { AnalyzerSystem } from './AnalyzerSystem';
import { ImprovementPlanner } from './ImprovementPlanner';
import { ValidationGate } from './ValidationGate';
import { ControlledSelfModification } from './ControlledSelfModification';
import { ImprovementQueue } from './ImprovementQueue';
import { SelfLearningLoop } from './SelfLearningLoop';
import { ExternalKnowledgeIngestion } from './ExternalKnowledgeIngestion';
import { SystemSelfAwareness } from './SystemSelfAwareness';

export class EvolutionManager {
  observer = new ObserverSystem();
  analyzer = new AnalyzerSystem(this.observer);
  planner = new ImprovementPlanner();
  validator = new ValidationGate();
  awareness = new SystemSelfAwareness();
  knowledge = new ExternalKnowledgeIngestion();
  
  controlSystem: ControlSystem;
  selfMod: ControlledSelfModification;
  queue: ImprovementQueue;
  learningLoop: SelfLearningLoop;

  constructor() {
    this.controlSystem = new ControlSystem();
    this.selfMod = new ControlledSelfModification(this.controlSystem);
    this.queue = new ImprovementQueue(this.validator, this.selfMod);
    this.learningLoop = new SelfLearningLoop(
      this.controlSystem, 
      this.observer, 
      this.analyzer, 
      this.planner, 
      this.queue
    );
  }

  async runEvolutionCycle(goal: string, steps: any[]) {
    console.log('[EVOLUTION] Starting safe evolution cycle...');
    const result = await this.learningLoop.runLoop(goal, steps, 3);
    return { status: 'EVOLUTION ACTIVE', result };
  }
}
