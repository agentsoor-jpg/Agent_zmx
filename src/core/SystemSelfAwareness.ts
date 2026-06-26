import { Weakness } from './AnalyzerSystem';

export class SystemSelfAwareness {
  private awarenessState = {
    strengths: ['Execution Engine', 'Validation Gate'],
    weaknesses: [] as string[],
    past_failures: [] as Weakness[],
    improvements_applied: 0
  };

  updateAwareness(weaknesses: Weakness[], applied: boolean) {
    for (const w of weaknesses) {
      if (!this.awarenessState.weaknesses.includes(w.type)) {
        this.awarenessState.weaknesses.push(w.type);
      }
      this.awarenessState.past_failures.push(w);
    }
    if (applied) {
      this.awarenessState.improvements_applied++;
    }
  }

  getAwareness() {
    return this.awarenessState;
  }
}
