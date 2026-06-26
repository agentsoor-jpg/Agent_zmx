import { AgentSuggestion } from './AgentFramework';

export class AgentValidationLayer {
  validate(suggestion: AgentSuggestion): boolean {
    console.log(`[AGENT VALIDATION] Validating suggestion from ${suggestion.agentName}...`);
    
    for (const step of suggestion.plan) {
      // Safety Check
      if (step.action === 'run_command' && step.command) {
        const blocked = ['rm -rf /', '..', '>', '<', '|', '&&', ';'];
        if (blocked.some(b => step.command.includes(b))) {
          console.warn(`[AGENT VALIDATION] Rejected: Unsafe command detected -> ${step.command}`);
          return false;
        }
      }

      // Compatibility Check
      if (step.action === 'write_file' && step.path && step.path.startsWith('/')) {
        console.warn(`[AGENT VALIDATION] Rejected: Absolute paths not allowed -> ${step.path}`);
        return false;
      }
      
      // Syntax Check (very basic mock)
      if (!step.action) {
        console.warn(`[AGENT VALIDATION] Rejected: Missing action`);
        return false;
      }
    }

    console.log(`[AGENT VALIDATION] Suggestion validated successfully.`);
    return true;
  }
}
