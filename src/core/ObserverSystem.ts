import { LogEntry } from './ObservationLayer';

export interface WorkflowLog {
  workflow_id: string;
  goal: string;
  steps: LogEntry[];
  total_duration: number;
  status: 'running' | 'success' | 'failed';
  errors: any[];
}

export class ObserverSystem {
  private workflows: Map<string, WorkflowLog> = new Map();

  startWorkflow(goal: string): string {
    const workflow_id = `wf_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    this.workflows.set(workflow_id, {
      workflow_id,
      goal,
      steps: [],
      total_duration: 0,
      status: 'running',
      errors: []
    });
    return workflow_id;
  }

  recordStep(workflow_id: string, stepLog: LogEntry) {
    const workflow = this.workflows.get(workflow_id);
    if (workflow) {
      workflow.steps.push(stepLog);
      if (stepLog.status === 'failed' || stepLog.status === 'error') {
        workflow.errors.push(stepLog.error);
      }
    }
  }

  endWorkflow(workflow_id: string, duration: number, finalStatus: 'success' | 'failed') {
    const workflow = this.workflows.get(workflow_id);
    if (workflow) {
      workflow.total_duration = duration;
      workflow.status = finalStatus;
    }
  }

  getWorkflow(workflow_id: string) {
    return this.workflows.get(workflow_id);
  }

  getAllWorkflows() {
    return Array.from(this.workflows.values());
  }
}
