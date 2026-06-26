import { ExecutionEngine } from './ExecutionEngine';
import { ObservationLayer } from './ObservationLayer';
import { QualityEngine } from './QualityEngine';
import { AnalysisEngine } from './AnalysisEngine';

export class ControlSystem {
  engine = new ExecutionEngine();
  observer = new ObservationLayer();
  quality = new QualityEngine();
  analyzer = new AnalysisEngine();

  async executeGoal(goal: string, steps: any[]) {
    console.log(`[CONTROL] Executing goal: ${goal}`);
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const startTime = Date.now();
      let result: any;

      try {
        if (step.action === 'write_file') {
          result = await this.engine.write_file(step.path, step.content);
        } else if (step.action === 'create_directory') {
          result = await this.engine.create_directory(step.path);
        } else if (step.action === 'run_command') {
          result = await this.engine.run_command(step.command);
        } else if (step.action === 'read_file') {
          result = await this.engine.read_file(step.path);
        } else {
          throw new Error(`Unknown action: ${step.action}`);
        }

        const duration = Date.now() - startTime;
        
        // Quality Validation
        if (step.action === 'write_file' && result.status === 'success') {
          const qRes = this.quality.validateFile(step.path);
          if (qRes.status === 'failed') result.status = 'failed';
        }
        if (step.action === 'run_command' && result.status === 'success') {
          const qRes = this.quality.validateCommand(result);
          if (qRes.status === 'failed') result.status = 'failed';
        }

        this.observer.record({
          action: step.action,
          command: step.command,
          targetPath: step.path,
          duration,
          stdout: result.stdout,
          stderr: result.stderr,
          exit_code: result.exit_code,
          status: result.status,
          error: result.error,
          step_index: i
        });

        if (result.status !== 'success') {
          console.error(`[CONTROL] Workflow stopped due to failure at step ${i}`);
          return { status: 'failed', error: result, step: i, logs: this.observer.getLogs() };
        }
      } catch (err: any) {
        const duration = Date.now() - startTime;
        this.observer.record({
          action: step.action,
          duration,
          status: 'error',
          error: err.message,
          step_index: i
        });
        return { status: 'error', error: err.message, step: i, logs: this.observer.getLogs() };
      }
    }

    const analysis = this.analyzer.analyze(this.observer.getLogs());
    return { status: 'success', logs: this.observer.getLogs(), analysis };
  }
}
