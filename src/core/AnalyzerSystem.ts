import { ObserverSystem, WorkflowLog } from './ObserverSystem';

export interface Weakness {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  affected_steps: number[];
}

export class AnalyzerSystem {
  constructor(private observer: ObserverSystem) {}

  analyzeWorkflow(workflow_id: string): Weakness[] {
    const workflow = this.observer.getWorkflow(workflow_id);
    if (!workflow) return [];

    const weaknesses: Weakness[] = [];

    // 1. Repeated failures
    const failedSteps = workflow.steps.filter(s => s.status === 'failed' || s.status === 'error');
    if (failedSteps.length > 0) {
      weaknesses.push({
        type: 'repeated_failures',
        description: 'Workflow encountered failed steps during execution',
        severity: failedSteps.length > 2 ? 'high' : 'medium',
        affected_steps: failedSteps.map(s => s.step_index)
      });
    }

    // 2. Slow execution
    const slowSteps = workflow.steps.filter(s => s.duration > 15000);
    if (slowSteps.length > 0) {
      weaknesses.push({
        type: 'slow_execution',
        description: 'Steps taking longer than 15 seconds detected',
        severity: 'low',
        affected_steps: slowSteps.map(s => s.step_index)
      });
    }

    // 3. Invalid patterns (like blocked commands)
    const blockedCommands = workflow.steps.filter(s => s.error && s.error.includes('Security Error'));
    if (blockedCommands.length > 0) {
      weaknesses.push({
        type: 'invalid_patterns',
        description: 'Workflow attempted to execute blocked commands',
        severity: 'high',
        affected_steps: blockedCommands.map(s => s.step_index)
      });
    }

    return weaknesses;
  }
}
