import { MultiAgentConsensus } from './MultiAgentConsensus';
import { AgentValidationLayer } from './AgentValidationLayer';
import { ControlSystem } from './ControlSystem';
import { AgentContext } from './AgentFramework';

export class AgentExecutionBridge {
  constructor(
    private consensus: MultiAgentConsensus,
    private validation: AgentValidationLayer,
    private controlSystem: ControlSystem
  ) {}

  async executeViaAgents(goal: string, context: AgentContext, selectedAgents: string[]) {
    console.log('[BRIDGE] Starting agent flow...');
    
    // 1) Agent -> Suggestion (via Consensus)
    const { best } = await this.consensus.reachConsensus(goal, context, selectedAgents);
    if (!best) {
      console.log('[BRIDGE] No valid agent suggestion found.');
      return { status: 'skipped', reason: 'No agent plan' };
    }

    // 2) Validation
    const isValid = this.validation.validate(best);
    if (!isValid) {
      console.log('[BRIDGE] Execution blocked by validation layer.');
      return { status: 'rejected', reason: 'Failed validation' };
    }

    // 3) Execution Engine
    console.log('[BRIDGE] Proceeding to safe execution engine...');
    const result = await this.controlSystem.executeGoal(`Agent Flow: ${goal}`, best.plan);
    return { status: 'executed', result, agentUsed: best.agentName };
  }
}
