export class ContextEngine {
  private state = {
    activeGoals: [] as string[],
    pastExecutions: [] as any[],
    systemState: 'IDLE',
    filesHistory: [] as string[],
    improvementsApplied: 0
  };

  trackGoal(goal: string) {
    this.state.activeGoals.push(goal);
    this.state.systemState = 'EXECUTING';
  }

  recordExecution(result: any) {
    this.state.pastExecutions.push(result);
  }

  recordImprovement() {
    this.state.improvementsApplied++;
  }

  getState() {
    return this.state;
  }
}
