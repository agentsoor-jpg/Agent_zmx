import { Weakness } from './AnalyzerSystem';

export interface Suggestion {
  issue: Weakness;
  suggestion: {
    action: string;
    targetPath?: string;
    command?: string;
    content?: string;
  };
  risk_level: 'low' | 'medium' | 'high';
}

export class ImprovementPlanner {
  plan(weaknesses: Weakness[]): Suggestion[] {
    const suggestions: Suggestion[] = [];

    for (const weakness of weaknesses) {
      if (weakness.type === 'invalid_patterns') {
        suggestions.push({
          issue: weakness,
          suggestion: {
            action: 'run_command',
            command: 'echo "alternative safe logic"'
          },
          risk_level: 'low'
        });
      } else if (weakness.type === 'repeated_failures') {
        suggestions.push({
          issue: weakness,
          suggestion: {
            action: 'write_file',
            targetPath: 'docs/retries.md',
            content: 'Need to implement better retry mechanisms for failed operations.'
          },
          risk_level: 'low'
        });
      }
    }

    return suggestions;
  }
}
