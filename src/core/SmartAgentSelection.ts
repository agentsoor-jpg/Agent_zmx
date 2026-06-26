import { AgentSelector } from './AgentSelector';
import { AgentPerformanceTracking } from './AgentPerformanceTracking';

export class SmartAgentSelection extends AgentSelector {
  constructor(private performance: AgentPerformanceTracking) {
    super();
  }

  selectSmartly(goal: string): string[] {
    const baseSelection = super.select(goal);
    if (baseSelection.length === 0) return [];

    // Filter out bad agents (e.g., success rate < 0.5)
    // Sort by overall score (success * correctness * usefulness)
    const sorted = baseSelection.filter(agent => {
      const score = this.performance.getScore(agent);
      return score && score.success_rate > 0.4; // minimum threshold
    }).sort((a, b) => {
      const scoreA = this.performance.getScore(a)!;
      const scoreB = this.performance.getScore(b)!;
      const metricA = scoreA.success_rate * scoreA.correctness * scoreA.usefulness;
      const metricB = scoreB.success_rate * scoreB.correctness * scoreB.usefulness;
      return metricB - metricA; // Descending
    });

    console.log(`[SMART SELECTION] Filtered to best agents: ${sorted.join(', ')}`);
    return sorted;
  }
}
