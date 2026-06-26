export class AgentSelector {
  select(goal: string): string[] {
    const goalLower = goal.toLowerCase();
    const selected: string[] = [];

    // Simple routing logic based on keywords
    if (goalLower.includes('code') || goalLower.includes('refactor') || goalLower.includes('script')) {
      selected.push('aider');
    }
    if (goalLower.includes('runtime') || goalLower.includes('deploy') || goalLower.includes('server')) {
      selected.push('replit');
    }
    if (goalLower.includes('ui') || goalLower.includes('design') || goalLower.includes('frontend')) {
      selected.push('bolt');
    }
    if (goalLower.includes('complex') || goalLower.includes('architecture') || goalLower.includes('system')) {
      selected.push('openhands');
    }

    // Default to a fallback if none matched
    if (selected.length === 0) {
      if (goalLower.includes('simple')) {
        return []; // Choose NONE
      }
      return ['aider']; 
    }

    // Allow multiple agents (up to 2 for now)
    return selected.slice(0, 2);
  }
}
