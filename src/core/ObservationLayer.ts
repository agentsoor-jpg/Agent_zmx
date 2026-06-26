export interface LogEntry {
  action: string;
  command?: string;
  targetPath?: string;
  timestamp: number;
  duration: number;
  stdout?: string;
  stderr?: string;
  exit_code?: number;
  status: string;
  error?: string;
  step_index: number;
}

export class ObservationLayer {
  private logs: LogEntry[] = [];

  record(entry: Omit<LogEntry, 'timestamp'> & { timestamp?: number }) {
    const log: LogEntry = {
      ...entry,
      timestamp: entry.timestamp || Date.now()
    };
    this.logs.push(log);
    console.log(`[OBSERVATION] Step ${log.step_index}: ${log.action} - Status: ${log.status}`);
  }

  getLogs() {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
  }
}
