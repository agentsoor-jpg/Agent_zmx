import { ControlSystem } from './ControlSystem';

export class SelfHealingSystem {
  constructor(private controlSystem: ControlSystem) {}

  async executeWithHealing(goal: string, steps: any[], maxRetries = 2) {
    let attempts = 0;
    while (attempts <= maxRetries) {
      try {
        const result = await this.controlSystem.executeGoal(goal, steps);
        if (result.status === 'success') {
          return result;
        }
        console.log(`[SELF HEALING] Attempt ${attempts + 1} failed. Healing and retrying...`);
      } catch (err) {
        console.log(`[SELF HEALING] Crash detected on attempt ${attempts + 1}. Recovering...`);
      }
      attempts++;
    }
    return { status: 'failed', reason: 'Self healing exhausted' };
  }
}
