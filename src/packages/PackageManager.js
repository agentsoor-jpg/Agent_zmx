const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const WORKSPACE_DIR = path.resolve(process.cwd(), 'workspace_run');

class PackageManager {
    constructor() {
        this.packageManagers = {
            node: {
                name: 'npm',
                lockFile: 'package-lock.json',
                configFile: 'package.json',
                installCommand: 'npm install',
                addCommand: 'npm install',
                removeCommand: 'npm uninstall',
                updateCommand: 'npm update',
                runCommand: 'npm run',
                initCommand: 'npm init -y'
            },
            python: {
                name: 'pip',
                lockFile: null,
                configFile: 'requirements.txt',
                installCommand: 'pip install -r requirements.txt',
                addCommand: 'pip install',
                removeCommand: 'pip uninstall -y',
                updateCommand: 'pip install --upgrade',
                runCommand: 'python',
                initCommand: 'echo "# Requirements" > requirements.txt'
            },
            node_yarn: {
                name: 'yarn',
                lockFile: 'yarn.lock',
                configFile: 'package.json',
                installCommand: 'yarn install',
                addCommand: 'yarn add',
                removeCommand: 'yarn remove',
                updateCommand: 'yarn upgrade',
                runCommand: 'yarn',
                initCommand: 'yarn init -y'
            }
        };

        this.installedPackages = new Map();
    }

    // اكتشاف لغة المشروع
    detectProjectType(projectPath) {
        const fullPath = path.resolve(WORKSPACE_DIR, projectPath);
        
        if (!fs.existsSync(fullPath)) {
            return { type: 'unknown', error: 'المشروع غير موجود.' };
        }

        // Node.js
        if (fs.existsSync(path.join(fullPath, 'package.json'))) {
            // تحقق من yarn
            if (fs.existsSync(path.join(fullPath, 'yarn.lock'))) {
                return { type: 'node_yarn', manager: this.packageManagers.node_yarn };
            }
            return { type: 'node', manager: this.packageManagers.node };
        }

        // Python
        if (fs.existsSync(path.join(fullPath, 'requirements.txt')) ||
            fs.existsSync(path.join(fullPath, 'setup.py')) ||
            fs.existsSync(path.join(fullPath, 'pyproject.toml'))) {
            return { type: 'python', manager: this.packageManagers.python };
        }

        return { type: 'unknown', error: 'لم نتمكن من تحديد نوع المشروع.' };
    }

    // تثبيت الاعتماديات
    async install(projectPath) {
        const detection = this.detectProjectType(projectPath);
        
        if (!detection.manager) {
            return {
                status: "error",
                error: detection.error || 'نوع المشروع غير معروف.',
                projectPath
            };
        }

        const fullPath = path.resolve(WORKSPACE_DIR, projectPath);
        const manager = detection.manager;

        return new Promise((resolve) => {
            console.log(`[PackageManager] تثبيت الاعتماديات باستخدام ${manager.name}...`);
            
            exec(manager.installCommand, { 
                cwd: fullPath, 
                timeout: 120000,
                maxBuffer: 1024 * 1024 * 10
            }, (error, stdout, stderr) => {
                if (error) {
                    resolve({
                        status: "error",
                        error: stderr || error.message,
                        projectPath,
                        manager: manager.name,
                        output: stdout
                    });
                } else {
                    resolve({
                        status: "success",
                        projectPath,
                        manager: manager.name,
                        output: stdout,
                        message: `تم تثبيت الاعتماديات بنجاح باستخدام ${manager.name}.`
                    });
                }
            });
        });
    }

    // إضافة حزمة
    async addPackage(projectPath, packageName, version = null) {
        const detection = this.detectProjectType(projectPath);
        
        if (!detection.manager) {
            return { status: "error", error: 'نوع المشروع غير معروف.' };
        }

        const fullPath = path.resolve(WORKSPACE_DIR, projectPath);
        const manager = detection.manager;
        const packageWithVersion = version ? `${packageName}@${version}` : packageName;
        const command = `${manager.addCommand} ${packageWithVersion}`;

        return new Promise((resolve) => {
            exec(command, { cwd: fullPath, timeout: 60000 }, (error, stdout, stderr) => {
                if (error) {
                    resolve({
                        status: "error",
                        error: stderr || error.message,
                        package: packageName,
                        manager: manager.name
                    });
                } else {
                    // تتبع الحزمة
                    const key = `${projectPath}:${packageName}`;
                    this.installedPackages.set(key, {
                        package: packageName,
                        version: version || 'latest',
                        projectPath,
                        installedAt: new Date().toISOString()
                    });

                    resolve({
                        status: "success",
                        package: packageName,
                        version: version || 'latest',
                        manager: manager.name,
                        output: stdout
                    });
                }
            });
        });
    }

    // إزالة حزمة
    async removePackage(projectPath, packageName) {
        const detection = this.detectProjectType(projectPath);
        
        if (!detection.manager) {
            return { status: "error", error: 'نوع المشروع غير معروف.' };
        }

        const fullPath = path.resolve(WORKSPACE_DIR, projectPath);
        const manager = detection.manager;
        const command = `${manager.removeCommand} ${packageName}`;

        return new Promise((resolve) => {
            exec(command, { cwd: fullPath, timeout: 60000 }, (error, stdout, stderr) => {
                if (error) {
                    resolve({
                        status: "error",
                        error: stderr || error.message,
                        package: packageName
                    });
                } else {
                    const key = `${projectPath}:${packageName}`;
                    this.installedPackages.delete(key);

                    resolve({
                        status: "success",
                        package: packageName,
                        manager: manager.name,
                        output: stdout
                    });
                }
            });
        });
    }

    // تثبيت حزم متعددة دفعة واحدة
    async installMultiple(projectPath, packages) {
        const results = [];
        
        for (const pkg of packages) {
            const name = typeof pkg === 'string' ? pkg : pkg.name;
            const version = typeof pkg === 'string' ? null : pkg.version;
            
            const result = await this.addPackage(projectPath, name, version);
            results.push(result);
        }

        const succeeded = results.filter(r => r.status === 'success').length;
        
        return {
            status: succeeded === packages.length ? "success" : "partial",
            total: packages.length,
            succeeded,
            failed: packages.length - succeeded,
            results
        };
    }

    // تحليل ملف package.json أو requirements.txt
    analyzeDependencies(projectPath) {
        const detection = this.detectProjectType(projectPath);
        const fullPath = path.resolve(WORKSPACE_DIR, projectPath);
        const dependencies = [];

        try {
            if (detection.type === 'node' || detection.type === 'node_yarn') {
                const packageJson = JSON.parse(fs.readFileSync(path.join(fullPath, 'package.json'), 'utf8'));
                
                if (packageJson.dependencies) {
                    Object.entries(packageJson.dependencies).forEach(([name, version]) => {
                        dependencies.push({ name, version, type: 'production' });
                    });
                }
                
                if (packageJson.devDependencies) {
                    Object.entries(packageJson.devDependencies).forEach(([name, version]) => {
                        dependencies.push({ name, version, type: 'development' });
                    });
                }

                return {
                    status: "success",
                    type: detection.type,
                    totalDependencies: dependencies.length,
                    dependencies,
                    scripts: packageJson.scripts || {}
                };
            }

            if (detection.type === 'python') {
                const reqPath = path.join(fullPath, 'requirements.txt');
                if (fs.existsSync(reqPath)) {
                    const content = fs.readFileSync(reqPath, 'utf8');
                    const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));
                    
                    lines.forEach(line => {
                        const parts = line.split('==');
                        dependencies.push({
                            name: parts[0].trim(),
                            version: parts[1]?.trim() || 'latest',
                            type: 'production'
                        });
                    });
                }

                return {
                    status: "success",
                    type: 'python',
                    totalDependencies: dependencies.length,
                    dependencies
                };
            }

            return { status: "error", error: 'نوع المشروع غير معروف.' };
        } catch (error) {
            return { status: "error", error: error.message };
        }
    }

    // تحديث كل الاعتماديات
    async updateAll(projectPath) {
        const detection = this.detectProjectType(projectPath);
        
        if (!detection.manager) {
            return { status: "error", error: 'نوع المشروع غير معروف.' };
        }

        const fullPath = path.resolve(WORKSPACE_DIR, projectPath);
        const manager = detection.manager;

        return new Promise((resolve) => {
            exec(manager.updateCommand, { cwd: fullPath, timeout: 120000 }, (error, stdout, stderr) => {
                resolve({
                    status: error ? "error" : "success",
                    manager: manager.name,
                    output: stdout || stderr,
                    error: error?.message
                });
            });
        });
    }

    // الحصول على الحزم المثبتة
    getInstalledPackages(projectPath = null) {
        if (projectPath) {
            const result = [];
            for (const [key, value] of this.installedPackages) {
                if (value.projectPath === projectPath) {
                    result.push(value);
                }
            }
            return result;
        }
        return [...this.installedPackages.values()];
    }

    // دعم لغات إضافية
    getSupportedLanguages() {
        return {
            node: 'Node.js (npm/yarn)',
            python: 'Python (pip)',
            comingSoon: ['Go (go mod)', 'Rust (cargo)', 'Ruby (bundler)', 'PHP (composer)']
        };
    }
}

module.exports = PackageManager;
