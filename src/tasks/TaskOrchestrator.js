const PackageManager = require('../packages/PackageManager');
const TaskScheduler = require('./TaskScheduler');
const { exec } = require('child_process');
const path = require('path');

const WORKSPACE_DIR = path.resolve(process.cwd(), 'workspace_run');

class TaskOrchestrator {
    constructor() {
        this.packageManager = new PackageManager();
        this.scheduler = new TaskScheduler(5);
    }

    // سير عمل كامل: تحليل ← تثبيت ← تشغيل
    async setupAndRun(projectPath, scriptName = null) {
        const results = {
            projectPath,
            steps: [],
            status: 'unknown'
        };

        // 1. تحليل المشروع
        const analysis = this.packageManager.analyzeDependencies(projectPath);
        results.steps.push({ phase: 'analysis', ...analysis });

        // 2. تثبيت الاعتماديات إذا احتاج
        if (analysis.status === 'success' && analysis.totalDependencies > 0) {
            const installResult = await this.packageManager.install(projectPath);
            results.steps.push({ phase: 'install', ...installResult });
        }

        // 3. تشغيل السكريبت
        if (scriptName) {
            const fullPath = path.resolve(WORKSPACE_DIR, projectPath);
            const detection = this.packageManager.detectProjectType(projectPath);
            
            let command;
            if (detection.type === 'node' || detection.type === 'node_yarn') {
                command = `npm run ${scriptName}`;
            } else {
                command = `${detection.manager?.runCommand || 'python'} ${scriptName}`;
            }

            const runResult = await this.runCommand(projectPath, command);
            results.steps.push({ phase: 'run', script: scriptName, ...runResult });
        }

        results.status = results.steps.every(s => s.status === 'success') ? 'success' : 'partial';
        results.completedAt = new Date().toISOString();

        return results;
    }

    // تشغيل أمر داخل مشروع
    async runCommand(projectPath, command) {
        const fullPath = path.resolve(WORKSPACE_DIR, projectPath);
        
        return new Promise((resolve) => {
            exec(command, { cwd: fullPath, timeout: 30000 }, (error, stdout, stderr) => {
                resolve({
                    status: error ? "error" : "success",
                    command,
                    stdout,
                    stderr: stderr || error?.message,
                    exitCode: error?.code || 0
                });
            });
        });
    }

    // تشغيل مهام متوازية
    async runParallel(projectPath, scripts) {
        scripts.forEach(script => {
            this.scheduler.addTask({
                name: script,
                fn: async () => {
                    return this.runCommand(projectPath, `npm run ${script}`);
                }
            });
        });

        return this.scheduler.waitForAll();
    }

    // تثبيت حزم متعددة ثم تشغيل
    async installAndRun(projectPath, packages, scriptName = null) {
        // تثبيت الحزم
        const installResults = await this.packageManager.installMultiple(projectPath, packages);
        
        // تشغيل إذا طلب
        let runResult = null;
        if (scriptName) {
            runResult = await this.runCommand(projectPath, `npm run ${scriptName}`);
        }

        return {
            projectPath,
            install: installResults,
            run: runResult,
            timestamp: new Date().toISOString()
        };
    }

    // الحصول على حالة النظام
    getStatus() {
        return {
            scheduler: this.scheduler.getStatus(),
            packages: {
                installed: this.packageManager.getInstalledPackages().length,
                supportedLanguages: this.packageManager.getSupportedLanguages()
            }
        };
    }
}

module.exports = TaskOrchestrator;
