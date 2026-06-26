export interface AgentScore {
  success_rate: number; // 0-1
  correctness: number;  // 0-1
  usefulness: number;   // 0-1
  total_uses: number;
  successful_uses: number;
}

export class AgentPerformanceTracking {
  private scores: Map<string, AgentScore> = new Map();

  constructor() {
    // Initialize base scores
    ['aider', 'replit', 'bolt', 'openhands'].forEach(agent => {
      this.scores.set(agent, {
        success_rate: 1.0,
        correctness: 1.0,
        usefulness: 1.0,
        total_uses: 0,
        successful_uses: 0
      });
    });
  }

  recordPerformance(agentName: string, success: boolean, correctnessRating: number, usefulnessRating: number) {
    const score = this.scores.get(agentName);
    if (!score) return;

    score.total_uses++;
    if (success) score.successful_uses++;
    
    score.success_rate = score.successful_uses / score.total_uses;
    // Moving average for ratings
    score.correctness = (score.correctness * (score.total_uses - 1) + correctnessRating) / score.total_uses;
    score.usefulness = (score.usefulness * (score.total_uses - 1) + usefulnessRating) / score.total_uses;
  }

  getScore(agentName: string) {
    return this.scores.get(agentName);
  }

  getAllScores() {
    return Object.fromEntries(this.scores);
  }
}
