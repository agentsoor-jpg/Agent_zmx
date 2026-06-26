import { AgentFramework, AgentSuggestion, AgentContext } from './AgentFramework';

export class MultiAgentConsensus {
  constructor(private framework: AgentFramework) {}

  async reachConsensus(goal: string, context: AgentContext, agents: string[]): Promise<{ best: AgentSuggestion | null, alternatives: AgentSuggestion[] }> {
    if (agents.length === 0) return { best: null, alternatives: [] };

    console.log(`[CONSENSUS] Gathering suggestions from: ${agents.join(', ')}`);
    const promises = agents.map(agent => this.framework.getSuggestion(agent, goal, context));
    const suggestions = await Promise.all(promises);

    // Simplistic consensus: pick the one with the most detailed reasoning or first one
    // In a real AI setup, an LLM would evaluate the best plan.
    const sorted = suggestions.sort((a, b) => b.plan.length - a.plan.length);
    
    console.log(`[CONSENSUS] Best plan selected from ${sorted[0].agentName}`);
    return {
      best: sorted[0],
      alternatives: sorted.slice(1)
    };
  }
}
