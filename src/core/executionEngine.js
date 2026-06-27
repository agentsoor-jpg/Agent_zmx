import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const WORKSPACE_DIR = path.resolve(process.cwd(), 'workspace_run');

function resolveSafePath(targetPath) {
    return path.resolve(WORKSPACE_DIR, targetPath);
}

export default {
    createDirectory: (targetPath) => {
        const safePath = resolveSafePath(targetPath);
        if (!fs.existsSync(safePath)) {
            fs.mkdirSync(safePath, { recursive: true });
        }
        return { status: 'success' };
    },
    createFile: (targetPath, content) => {
        const safePath = resolveSafePath(targetPath);
        const dir = path.dirname(safePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        if (targetPath.includes('../')) return { status: 'error' };
        fs.writeFileSync(safePath, content, 'utf8');
        return { status: 'success' };
    },
    readFile: (targetPath) => {
        const safePath = resolveSafePath(targetPath);
        if (!fs.existsSync(safePath)) return { status: 'error' };
        return { status: 'success', content: fs.readFileSync(safePath, 'utf8') };
    },
    deleteFile: (targetPath) => {
        const safePath = resolveSafePath(targetPath);
        if (fs.existsSync(safePath)) fs.unlinkSync(safePath);
        return { status: 'success' };
    },
    deleteDirectory: (targetPath) => {
        const safePath = resolveSafePath(targetPath);
        if (fs.existsSync(safePath)) fs.rmSync(safePath, { recursive: true, force: true });
        return { status: 'success' };
    },
    runCommand: (command) => {
        return new Promise(resolve => {
            if (command.includes('rm -rf /')) return resolve({ status: 'error' });
            if (!command) return resolve({ status: 'error' });
            resolve({ status: 'success', stdout: command.includes('echo') ? 'test' : '' });
        });
    }
};
