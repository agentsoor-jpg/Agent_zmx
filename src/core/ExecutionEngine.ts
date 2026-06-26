import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const WORKSPACE_DIR = path.resolve(process.cwd(), './workspace_run');

function resolveSafePath(targetPath: string): string {
  const resolved = path.resolve(WORKSPACE_DIR, targetPath);
  if (!resolved.startsWith(WORKSPACE_DIR)) {
    throw new Error('Security Error: Path traversal detected');
  }
  return resolved;
}

export class ExecutionEngine {
  constructor() {
    if (!fs.existsSync(WORKSPACE_DIR)) {
      fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
    }
  }

  async write_file(targetPath: string, content: string): Promise<any> {
    const safePath = resolveSafePath(targetPath);
    const dir = path.dirname(safePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(safePath, content, 'utf-8');
    return { status: 'success', action: 'write_file', path: targetPath };
  }

  async read_file(targetPath: string): Promise<any> {
    const safePath = resolveSafePath(targetPath);
    if (!fs.existsSync(safePath)) {
      throw new Error(`File not found: ${targetPath}`);
    }
    const content = fs.readFileSync(safePath, 'utf-8');
    return { status: 'success', action: 'read_file', content };
  }

  async create_directory(targetPath: string): Promise<any> {
    const safePath = resolveSafePath(targetPath);
    if (!fs.existsSync(safePath)) {
      fs.mkdirSync(safePath, { recursive: true });
    }
    return { status: 'success', action: 'create_directory', path: targetPath };
  }

  async run_command(command: string): Promise<any> {
    const allowList = ['node', 'npm', 'python', 'python3', 'pip', 'ls', 'cat', 'echo'];
    const baseCmd = command.split(' ')[0];

    if (command.includes(';') || command.includes('&&') || command.includes('||') || command.includes('|') || command.includes('>') || command.includes('<')) {
      return {
        status: 'failed',
        action: 'run_command',
        command,
        error: `Security Error: Nested or piped commands are not allowed.`,
        exit_code: -1
      };
    }

    if (command.includes('../') || command.includes(' /') || command.startsWith('/')) {
      return {
        status: 'failed',
        action: 'run_command',
        command,
        error: `Security Error: Absolute paths and path traversal are not allowed in commands.`,
        exit_code: -1
      };
    }

    if (!allowList.includes(baseCmd)) {
      return {
        status: 'failed',
        action: 'run_command',
        command,
        error: `Security Error: Command '${baseCmd}' not allowed.`,
        exit_code: -1
      };
    }

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      // 20 seconds timeout protection
      const child = spawn(command, { shell: true, cwd: WORKSPACE_DIR, timeout: 20000 });

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          status: code === 0 ? 'success' : 'failed',
          action: 'run_command',
          command,
          stdout,
          stderr,
          exit_code: code,
        });
      });

      child.on('error', (err) => {
        resolve({
          status: 'failed',
          action: 'run_command',
          command,
          error: err.message,
          exit_code: -1
        });
      });
    });
  }
}
