import { SelfImprovementSystem } from './SelfImprovementSystem';

export class HardTestSystem {
  constructor(private sys: SelfImprovementSystem) {}

  async runHardTest() {
    console.log('[HARD_TEST] Starting stress tests...');
    const steps = [];
    
    // 1) create 20 files
    for (let i = 0; i < 20; i++) {
      steps.push({ action: 'write_file', path: `test_files/file_${i}.txt`, content: `content ${i}` });
    }
    
    // 2) run valid command
    steps.push({ action: 'run_command', command: 'echo "hello valid"' });
    
    // 3) run invalid command (will be rejected by allowlist or OS)
    steps.push({ action: 'run_command', command: 'unknown_cmd' });
    
    // 4) run missing file
    steps.push({ action: 'read_file', path: 'missing_file_404.txt' });
    
    // 5) try path traversal
    steps.push({ action: 'write_file', path: '../../traversal.txt', content: 'bad' });

    const result = await this.sys.executeWithRetry('Run Stress Test', steps);
    
    // Verify results
    const logs = result.logs || [];
    const hasStderr = logs.some(l => l.stderr || l.error);
    
    if (logs.length > 0 && hasStderr) {
      return { status: 'SYSTEM STABLE', result };
    } else {
      return { status: 'FAIL', result };
    }
  }
}
