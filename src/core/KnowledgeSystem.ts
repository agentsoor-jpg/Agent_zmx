export class KnowledgeSystem {
  private memory = {
    bestSolutions: [] as any[],
    failures: [] as any[]
  };

  storeSuccess(goal: string, steps: any[]) {
    console.log(`[KNOWLEDGE] Storing successful pattern for: ${goal}`);
    this.memory.bestSolutions.push({ goal, steps });
  }

  storeFailure(goal: string, error: any) {
    console.log(`[KNOWLEDGE] Storing failure pattern to avoid for: ${goal}`);
    this.memory.failures.push({ goal, error });
  }

  getKnowledge() {
    return this.memory;
  }
}
