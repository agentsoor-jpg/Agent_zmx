export interface AgentContext {
  files: string[];
  recentErrors: string[];
}

export interface AgentSuggestion {
  agentName: string;
  plan: any[];
  reasoning: string;
}

export interface IAgent {
  name: string;
  execute(goal: string, context: AgentContext): Promise<AgentSuggestion>;
}

class BaseAgent implements IAgent {
  constructor(public name: string) {}

  async execute(goal: string, context: AgentContext): Promise<AgentSuggestion> {
    console.log(`[AGENT FRAMEWORK] ${this.name} analyzing goal: ${goal}`);
    // Mocked suggestion. In reality, this would call an LLM.
    return {
      agentName: this.name,
      plan: [
        { action: 'run_command', command: `echo "Executed plan from ${this.name}"` }
      ],
      reasoning: `Suggested by ${this.name} based on context.`
    };
  }
}

export class AgentFramework {
  agents: Map<string, IAgent> = new Map();

  constructor() {
    this.agents.set('aider', new BaseAgent('aider'));
    this.agents.set('replit', new BaseAgent('replit'));
    this.agents.set('bolt', new BaseAgent('bolt'));
    this.agents.set('openhands', new BaseAgent('openhands'));
  }

  async getSuggestion(agentName: string, goal: string, context: AgentContext): Promise<AgentSuggestion> {
    const agent = this.agents.get(agentName);
    if (!agent) throw new Error(`Agent ${agentName} not found`);
    return await agent.execute(goal, context);
  }
}
