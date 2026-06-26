import { LogEntry } from './ObservationLayer';

export class AnalysisEngine {
  analyze(logs: LogEntry[]) {
    const issues = [];
    
    // 1. Detect repeated failures
    const failedSteps = logs.filter(log => log.status === 'failed' || log.status === 'error');
    if (failedSteps.length > 0) {
      issues.push({ type: 'failures_detected', count: failedSteps.length, steps: failedSteps.map(s => s.step_index) });
    }

    // 2. Long execution time
    const slowSteps = logs.filter(log => log.duration > 10000); // > 10 seconds
    if (slowSteps.length > 0) {
      issues.push({ type: 'slow_execution', steps: slowSteps.map(s => s.step_index) });
    }

    // 3. Invalid commands
    const invalidCommands = logs.filter(log => log.error && log.error.includes('not allowed'));
    if (invalidCommands.length > 0) {
      issues.push({ type: 'invalid_commands', steps: invalidCommands.map(s => s.step_index) });
    }

    // 4. Missing files
    const missingFiles = logs.filter(log => log.error && log.error.includes('File not found'));
    if (missingFiles.length > 0) {
      issues.push({ type: 'missing_files', steps: missingFiles.map(s => s.step_index) });
    }

    return {
      status: issues.length > 0 ? 'issues_found' : 'clean',
      insights: issues
    };
  }
}
