import { ControlSystem } from './ControlSystem';
import { Suggestion } from './ImprovementPlanner';

export class ControlledSelfModification {
  constructor(private controlSystem: ControlSystem) {}

  async apply(suggestion: Suggestion) {
    console.log(`[SELF_MOD] Applying safe improvement for issue: ${suggestion.issue.type}`);
    const steps = [
      {
        action: suggestion.suggestion.action,
        path: suggestion.suggestion.targetPath,
        content: suggestion.suggestion.content,
        command: suggestion.suggestion.command
      }
    ];

    // Execution goes through the safe Execution Engine
    const res = await this.controlSystem.executeGoal('Apply self modification', steps);
    return res;
  }
}
