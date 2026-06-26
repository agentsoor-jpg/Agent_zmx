const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const ledger = require('../integrity/Ledger');

const WORKSPACE_DIR = path.resolve(process.cwd(), 'workspace_run');

function validatePath(relativePath) {
    const absolutePath = path.resolve(WORKSPACE_DIR, relativePath);
    if (!absolutePath.startsWith(WORKSPACE_DIR)) {
        throw new Error("Path traversal detected! Cannot access files outside workspace_run.");
    }
    return absolutePath;
}

function ensureWorkspace() {
    if (!fs.existsSync(WORKSPACE_DIR)) {
        fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
    }
}

function createFile(relativePath, content) {
    try {
        ensureWorkspace();
        const absolutePath = validatePath(relativePath);
        const dir = path.dirname(absolutePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(absolutePath, content, 'utf8');
        // سجل في الـ ledger
        ledger.recordCreate(relativePath);
        return { status: "success", path: absolutePath };
    } catch (error) {
        return { status: "error", error: error.message };
    }
}

function readFile(relativePath) {
    try {
        const absolutePath = validatePath(relativePath);
        if (!fs.existsSync(absolutePath)) {
            return { status: "error", error: "File not found" };
        }
        const content = fs.readFileSync(absolutePath, 'utf8');
        return { status: "success", content };
    } catch (error) {
        return { status: "error", error: error.message };
    }
}

function createDirectory(relativePath) {
    try {
        ensureWorkspace();
        const absolutePath = validatePath(relativePath);
        if (!fs.existsSync(absolutePath)) {
            fs.mkdirSync(absolutePath, { recursive: true });
        }
        // سجل في الـ ledger
        ledger.recordCreate(relativePath);
        return { status: "success", path: absolutePath };
    } catch (error) {
        return { status: "error", error: error.message };
    }
}

function isCommandAllowed(command) {
    const allowedCommands = ['node', 'npm', 'npx', 'python', 'python3', 'pip', 'pip3', 'ls', 'cat', 'echo', 'mkdir'];
    const firstWord = command.trim().split(/\s+/)[0];
    return allowedCommands.includes(firstWord);
}

function runCommand(command, cwd = '') {
    return new Promise((resolve) => {
        if (!isCommandAllowed(command)) {
            return resolve({
                status: "error",
                stdout: "",
                stderr: "Command not allowed",
                exitCode: 1
            });
        }
        
        let targetCwd = WORKSPACE_DIR;
        if (cwd) {
            try {
                targetCwd = validatePath(cwd);
            } catch (error) {
                return resolve({
                    status: "error",
                    stdout: "",
                    stderr: error.message,
                    exitCode: 1
                });
            }
        }
        
        ensureWorkspace();
        
        exec(command, { cwd: targetCwd, timeout: 30000 }, (error, stdout, stderr) => {
            if (error) {
                let errorMessage = stderr || error.message;
                if (error.killed) {
                    errorMessage = "Command timed out after 30 seconds";
                }
                return resolve({
                    status: "error",
                    stdout: stdout || "",
                    stderr: errorMessage,
                    exitCode: error.code !== undefined && error.code !== null ? error.code : 1
                });
            }
            resolve({
                status: "success",
                stdout: stdout || "",
                stderr: stderr || "",
                exitCode: 0
            });
        });
    });
}

function deleteFile(relativePath) {
    try {
        const absolutePath = validatePath(relativePath);
        if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
            // سجل في الـ ledger
            ledger.recordDelete(relativePath);
        }
        return { status: "success", path: absolutePath };
    } catch (error) {
        return { status: "error", error: error.message };
    }
}

function deleteDirectory(relativePath) {
    try {
        const absolutePath = validatePath(relativePath);
        if (fs.existsSync(absolutePath)) {
            fs.rmSync(absolutePath, { recursive: true, force: true });
        }
        return { status: "success", path: absolutePath };
    } catch (error) {
        return { status: "error", error: error.message };
    }
}

function getIntegrityReport() {
    const integrityChecker = require('../integrity/IntegrityChecker');
    return integrityChecker.runFullCheck();
}

module.exports = {
    ensureWorkspace,
    createFile,
    readFile,
    createDirectory,
    isCommandAllowed,
    runCommand,
    deleteFile,
    deleteDirectory,
    getIntegrityReport
};
