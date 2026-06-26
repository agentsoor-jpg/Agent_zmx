import fs from 'fs';
import path from 'path';

const WORKSPACE_DIR = path.resolve(process.cwd(), './workspace_run');

export class QualityEngine {
  validateFile(targetPath: string) {
    const fullPath = path.resolve(WORKSPACE_DIR, targetPath);
    if (!fs.existsSync(fullPath)) {
      return { status: 'failed', reason: 'file does not exist', step: 'validation' };
    }
    const content = fs.readFileSync(fullPath, 'utf-8');
    if (!content.trim()) {
      return { status: 'failed', reason: 'file is empty', step: 'validation' };
    }
    return { status: 'success' };
  }

  validateCommand(result: any) {
    if (result.exit_code !== 0) {
      return { status: 'failed', reason: 'command failed with non-zero exit code', step: 'validation' };
    }
    return { status: 'success' };
  }
}
