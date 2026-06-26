import { GlobalSystemOrchestrator } from './GlobalSystemOrchestrator';

export class AutonomousEngineeringOS {
  orchestrator = new GlobalSystemOrchestrator();

  async processRequest(goal: string) {
    console.log('================================================');
    console.log('[AUTONOMOUS OS] Activating full autonomous mode.');
    console.log('================================================');
    const res = await this.orchestrator.manageGlobalWorkflow(goal);
    return res;
  }
}
