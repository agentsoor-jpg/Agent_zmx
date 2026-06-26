import { AgentSelector } from './AgentSelector';

export class HybridModeSystem {
  constructor(private selector: AgentSelector) {}

  decideMode(goal: string): { useAgents: boolean, selectedAgents: string[] } {
    const isSimple = goal.split(' ').length < 3 || goal.toLowerCase().includes('simple') || goal.toLowerCase().includes('echo');
    
    if (isSimple) {
      console.log(`[HYBRID MODE] Simple task detected. Skipping agents.`);
      return { useAgents: false, selectedAgents: [] };
    }

    const agents = this.selector.select(goal);
    if (agents.length === 0) {
      return { useAgents: false, selectedAgents: [] };
    }

    console.log(`[HYBRID MODE] Complex task detected. Activating agents: ${agents.join(', ')}`);
    return { useAgents: true, selectedAgents: agents };
  }
}
