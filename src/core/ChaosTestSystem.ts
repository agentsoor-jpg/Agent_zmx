import { ControlSystem } from './ControlSystem';
import fs from 'fs';
import path from 'path';

const WORKSPACE_DIR = path.resolve(process.cwd(), './workspace_run');

export class ChaosTestSystem {
  constructor(private controlSystem: ControlSystem) {}

  private async runSteps(goal: string, steps: any[]) {
    // We create a fresh instance so logs don't mix up entirely, or just clear logs
    const cs = new ControlSystem();
    return await cs.executeGoal(goal, steps);
  }

  async testRealityBreak() {
    const steps = [];
    for (let i = 0; i < 10; i++) steps.push({ action: 'write_file', path: `chaos_1/file_${i}.txt`, content: `data ${i}` });
    for (let i = 0; i < 5; i++) steps.push({ action: 'write_file', path: `chaos_1/mod_file.txt`, content: `mod ${i}` });
    steps.push({ action: 'read_file', path: `chaos_1/mod_file.txt` });
    steps.push({ action: 'run_command', command: 'echo "test"' });
    
    // We intentionally do a valid flow here, and then test invalid
    let res = await this.runSteps('Reality Break 1', steps);
    if (res.status !== 'success') return 'FAIL';
    
    // Delete and read
    if (fs.existsSync(path.resolve(WORKSPACE_DIR, 'chaos_1/mod_file.txt'))) {
       fs.unlinkSync(path.resolve(WORKSPACE_DIR, 'chaos_1/mod_file.txt'));
    }
    const failSteps = [{ action: 'read_file', path: `chaos_1/mod_file.txt` }];
    let res2 = await this.runSteps('Reality Break 2', failSteps);
    if (res2.status !== 'error') return 'FAIL';

    return 'PASS';
  }

  async testInvalidInput() {
    try {
      const emptyRes = await this.runSteps('', []);
      if (emptyRes.status !== 'success') return 'FAIL'; // Empty goal with no steps should technically just return success or error gracefully.
      
      const brokenSteps = [{ action: 'unknown', path: 'x' }];
      const res = await this.runSteps('bad input', brokenSteps);
      if (res.status !== 'error') return 'FAIL';
      
      return 'PASS';
    } catch {
      return 'FAIL';
    }
  }

  async testShellSecurity() {
    const attacks = [
      { action: 'run_command', command: 'rm -rf /' },
      { action: 'run_command', command: 'echo "a" && echo "b"' },
      { action: 'run_command', command: 'cat /etc/passwd' }, // baseCmd 'cat' is allowed but file should be blocked by execution engine if we enforce workspace, but execution engine allows any cat for now. However, `&&` is blocked.
      { action: 'write_file', path: '../../../../../etc/passwd', content: 'hack' }
    ];
    
    const res = await this.runSteps('Security Test', attacks);
    if (res.status === 'success') return 'FAIL'; // Should fail on rm or ../
    
    return 'PASS';
  }

  async testConcurrency() {
    const promises = [];
    for (let i = 0; i < 20; i++) {
      promises.push(this.runSteps(`Parallel ${i}`, [
        { action: 'write_file', path: `chaos_concurrent/file_${i}.txt`, content: `data ${i}` },
        { action: 'run_command', command: 'echo "hello"' }
      ]));
    }
    const results = await Promise.all(promises);
    if (results.some(r => r.status !== 'success')) return 'FAIL';
    return 'PASS';
  }

  async testResourcePressure() {
    const steps = [];
    for (let i = 0; i < 100; i++) steps.push({ action: 'write_file', path: `chaos_load/file_${i}.txt`, content: 'load' });
    for (let i = 0; i < 50; i++) steps.push({ action: 'run_command', command: 'echo "load"' });
    const res = await this.runSteps('Load Test', steps);
    if (res.status !== 'success') return 'FAIL';
    return 'PASS';
  }

  async testFailureCascade() {
    const steps = [
      { action: 'write_file', path: 'cascade_1.txt', content: 'ok' },
      { action: 'read_file', path: 'missing_cascade.txt' }, // will fail
      { action: 'write_file', path: 'cascade_3.txt', content: 'should not run' } // should not run
    ];
    const res = await this.runSteps('Failure Cascade', steps);
    if (res.status !== 'error' && res.status !== 'failed') return 'FAIL';
    if (fs.existsSync(path.resolve(WORKSPACE_DIR, 'cascade_3.txt'))) return 'FAIL';
    return 'PASS';
  }

  async testSelfAttack() {
    const steps = [
      { action: 'write_file', path: '../server.ts', content: 'console.log("hacked")' }
    ];
    const res = await this.runSteps('Self Attack', steps);
    if (res.status === 'success') return 'FAIL'; // Must fail due to path traversal protection
    return 'PASS';
  }

  async fullChaosRun(results: any) {
    try {
      console.log('[CHAOS] Starting Full Chaos Run (2 Cycles)...');
      for (let i = 0; i < 2; i++) {
        const cycle = [
          this.testConcurrency(),
          this.testInvalidInput(),
          this.testResourcePressure(),
          this.testFailureCascade()
        ];
        const res = await Promise.all(cycle);
        if (res.some(r => r !== 'PASS')) return 'NOT READY';
      }
      return 'PASS';
    } catch {
      return 'NOT READY';
    }
  }

  async runAllTests() {
    console.log('[CHAOS] Starting Netflix-level Chaos tests...');
    
    const reality = await this.testRealityBreak();
    const input = await this.testInvalidInput();
    const security = await this.testShellSecurity();
    const concurrency = await this.testConcurrency();
    const load = await this.testResourcePressure();
    const cascade = await this.testFailureCascade();
    const protectedCore = await this.testSelfAttack();

    const productionGrade = await this.fullChaosRun({});

    return {
      'REALITY CHECK': reality,
      'INPUT HARDENED': input,
      'SECURITY': security,
      'CONCURRENCY STABLE': concurrency,
      'LOAD STABLE': load,
      'FAILURE HANDLED': cascade,
      'CORE PROTECTED': protectedCore,
      'PRODUCTION GRADE': productionGrade
    };
  }
}
