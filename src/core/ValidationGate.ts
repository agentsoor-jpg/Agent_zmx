import { Suggestion } from './ImprovementPlanner';

export class ValidationGate {
  validate(suggestion: Suggestion): boolean {
    // 1. will it break system?
    if (suggestion.risk_level === 'high') return false;

    // 2. does it affect core?
    if (suggestion.suggestion.targetPath && suggestion.suggestion.targetPath.includes('src/core')) {
      return false; // Block direct modification of core
    }
    if (suggestion.suggestion.targetPath && suggestion.suggestion.targetPath.includes('server.ts')) {
      return false; // Block entrypoint modification
    }

    // 3. safe to apply?
    if (suggestion.suggestion.action === 'run_command' && suggestion.suggestion.command) {
      const blocked = ['rm', 'rf', 'mv', '..', '/'];
      if (blocked.some(b => suggestion.suggestion.command!.includes(b))) {
        return false;
      }
    }

    return true; // Safe
  }
}
