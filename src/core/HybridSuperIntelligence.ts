import { ControlSystem } from './ControlSystem';
import { AgentFramework } from './AgentFramework';
import { SmartAgentSelection } from './SmartAgentSelection';
import { AgentPerformanceTracking } from './AgentPerformanceTracking';
import { MultiAgentConsensus } from './MultiAgentConsensus';
import { AgentValidationLayer } from './AgentValidationLayer';
import { AgentExecutionBridge } from './AgentExecutionBridge';
import { HybridModeSystem } from './HybridModeSystem';
import { EvolutionManager } from './EvolutionManager';
import { ExternalAgentIntegration } from './ExternalAgentIntegration';

export class HybridSuperIntelligence {
  controlSystem = new ControlSystem();
  framework = new AgentFramework();
  performance = new AgentPerformanceTracking();
  selector = new SmartAgentSelection(this.performance);
  hybridMode = new HybridModeSystem(this.selector);
  consensus = new MultiAgentConsensus(this.framework);
  validation = new AgentValidationLayer();
  bridge = new AgentExecutionBridge(this.consensus, this.validation, this.controlSystem);
  evolution = new EvolutionManager();
  external = new ExternalAgentIntegration();

  constructor() {
    this.framework.agents.set('external', this.external);
    this.evolution.controlSystem = this.controlSystem; // Link the core engine
  }

  async executeTask(goal: string, stepsIfSimple?: any[]) {
    console.log('[HYBRID_SUPER_INT] Starting task processing...');
    
    // 1. Decide Mode
    const { useAgents, selectedAgents } = this.hybridMode.decideMode(goal);

    let executionResult;

    if (!useAgents) {
      console.log('[HYBRID_SUPER_INT] Simple mode. Bypassing agents.');
      // Execute directly via Evolution Loop (Observer, Analyzer, etc.)
      executionResult = await this.evolution.runEvolutionCycle(goal, stepsIfSimple || []);
    } else {
      console.log('[HYBRID_SUPER_INT] Complex mode. Activating Multi-Agent Consensus.');
      
      let agentsToUse = selectedAgents;
      if (agentsToUse.length === 0) agentsToUse = ['external']; // Fallback
      
      // Agent -> Consensus -> Validation -> Execution Engine
      const res = await this.bridge.executeViaAgents(goal, { files: [], recentErrors: [] }, agentsToUse);
      
      if (res.status === 'executed') {
        // Track success
        const isSuccess = res.result.status === 'success';
        if (res.agentUsed) {
          this.performance.recordPerformance(res.agentUsed, isSuccess, isSuccess ? 1 : 0, isSuccess ? 1 : 0);
        }
      } else {
         console.log('[HYBRID_SUPER_INT] Agent flow blocked or skipped. Falling back to external or failing.');
      }
      executionResult = res;
    }

    return {
      status: 'HYBRID SUPER INTELLIGENCE ACTIVE',
      mode: useAgents ? 'complex' : 'simple',
      result: executionResult
    };
  }
}
