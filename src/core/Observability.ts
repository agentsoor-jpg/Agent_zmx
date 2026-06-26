export class Observability {
  private metrics = {
    totalRequests: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    averageResponseTimeMs: 0
  };

  recordExecution(duration: number, success: boolean) {
    this.metrics.totalRequests++;
    if (success) {
      this.metrics.successfulExecutions++;
    } else {
      this.metrics.failedExecutions++;
    }

    // Moving average
    this.metrics.averageResponseTimeMs = 
      ((this.metrics.averageResponseTimeMs * (this.metrics.totalRequests - 1)) + duration) / this.metrics.totalRequests;
  }

  getMetrics() {
    return {
      ...this.metrics,
      health: this.metrics.failedExecutions > this.metrics.successfulExecutions ? 'DEGRADED' : 'HEALTHY',
      successRate: this.metrics.totalRequests ? (this.metrics.successfulExecutions / this.metrics.totalRequests) : 1
    };
  }
}
