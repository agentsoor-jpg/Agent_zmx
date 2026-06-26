const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const WORKSPACE_DIR = path.resolve(process.cwd(), 'workspace_run');

class DestinationManager {
    constructor() {
        this.supportedDestinations = [
            'git', 'github', 'gitlab', 'bitbucket',
            'local', 'download',
            's3', 'google_drive', 'dropbox',
            'ftp', 'ftps', 'webdav',
            'api', 'webhook'
        ];
    }

    // تحديد نوع الوجهة
    detectDestinationType(destination) {
        if (!destination || typeof destination !== 'string') return 'local';
        
        if (destination.startsWith('git@') || destination.includes('github.com') || 
            destination.includes('gitlab.com') || destination.includes('bitbucket.org')) {
            return 'git';
        }
        if (destination.startsWith('s3://') || destination.includes('amazonaws.com')) return 's3';
        if (destination.includes('drive.google.com')) return 'google_drive';
        if (destination.includes('dropbox.com')) return 'dropbox';
        if (destination.startsWith('ftp://') || destination.startsWith('ftps://')) return 'ftp';
        if (destination.startsWith('http://') || destination.startsWith('https://')) {
            if (destination.includes('webdav')) return 'webdav';
            return 'webhook';
        }
        if (destination === 'local' || destination.startsWith('/') || destination.startsWith('./')) return 'local';
        
        return 'unknown';
    }

    // دفع إلى Git
    async pushToGit(sourcePath, remoteUrl, branch = 'main', message = 'CoreFlow auto commit') {
        return new Promise((resolve) => {
            const steps = [];

            // 1. init إذا لم يكن موجوداً
            const gitDir = path.join(sourcePath, '.git');
            const needsInit = !fs.existsSync(gitDir);

            const executeInDir = (cmd, cwd) => {
                return new Promise((res) => {
                    exec(cmd, { cwd, timeout: 30000 }, (error, stdout, stderr) => {
                        res({ status: error ? "error" : "success", stdout, stderr });
                    });
                });
            };

            (async () => {
                if (needsInit) {
                    const initResult = await executeInDir('git init', sourcePath);
                    steps.push({ step: 'init', ...initResult });
                    
                    const remoteResult = await executeInDir(`git remote add origin ${remoteUrl}`, sourcePath);
                    steps.push({ step: 'add_remote', ...remoteResult });
                }

                const addResult = await executeInDir('git add .', sourcePath);
                steps.push({ step: 'add', ...addResult });

                const statusResult = await executeInDir('git status --porcelain', sourcePath);
                if (!statusResult.stdout.trim()) {
                    return resolve({
                        status: "no_changes",
                        steps,
                        message: 'لا توجد تغييرات للدفع.'
                    });
                }

                const commitResult = await executeInDir(`git commit -m "${message}"`, sourcePath);
                steps.push({ step: 'commit', ...commitResult });

                const pushResult = await executeInDir(`git push ${remoteUrl} ${branch} -f`, sourcePath);
                steps.push({ step: 'push', ...pushResult });

                resolve({
                    status: pushResult.status,
                    steps,
                    remoteUrl,
                    branch
                });
            })();
        });
    }

    // حفظ محلي (نسخ إلى مسار آخر)
    async saveToLocal(sourcePath, destinationPath) {
        return this.saveFileOrDirectory(sourcePath, destinationPath);
    }

    // نسخ ملف أو مجلد (يدعم الاثنين)
    async saveFileOrDirectory(sourcePath, destinationPath) {
        try {
            const stat = fs.statSync(sourcePath);
            
            if (stat.isFile()) {
                // نسخ ملف فردي
                const destDir = path.dirname(destinationPath);
                if (!fs.existsSync(destDir)) {
                    fs.mkdirSync(destDir, { recursive: true });
                }
                fs.copyFileSync(sourcePath, destinationPath);
                
                return {
                    status: "success",
                    type: 'file',
                    source: sourcePath,
                    destination: destinationPath,
                    size: stat.size
                };
            } else if (stat.isDirectory()) {
                // نسخ مجلد
                this.copyDirectorySync(sourcePath, destinationPath);
                
                return {
                    status: "success",
                    type: 'directory',
                    source: sourcePath,
                    destination: destinationPath
                };
            }
            
            return {
                status: "error",
                error: 'المسار ليس ملفاً ولا مجلداً.',
                source: sourcePath
            };
        } catch (error) {
            return {
                status: "error",
                error: error.message,
                source: sourcePath,
                destination: destinationPath
            };
        }
    }

    // نسخ مجلد بشكل تكراري
    copyDirectorySync(source, destination) {
        if (!fs.existsSync(destination)) {
            fs.mkdirSync(destination, { recursive: true });
        }

        const items = fs.readdirSync(source);
        
        for (const item of items) {
            const srcPath = path.join(source, item);
            const destPath = path.join(destination, item);
            const stat = fs.statSync(srcPath);

            if (stat.isDirectory()) {
                this.copyDirectorySync(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }

    // رفع إلى URL (محاكاة - للتمديد المستقبلي)
    async uploadToUrl(sourcePath, url, options = {}) {
        // للتمديد المستقبلي: رفع إلى S3، Google Drive، Dropbox
        // حالياً: إنشاء حزمة ZIP للتحميل المحلي
        const ArchiveManager = require('./ArchiveManager');
        const archive = new ArchiveManager();
        
        const compressResult = await archive.compress(sourcePath, 'zip');
        
        return {
            status: compressResult.status,
            type: 'upload_ready',
            archivePath: compressResult.outputPath,
            size: compressResult.size,
            sizeMB: compressResult.sizeMB,
            message: 'الملف جاهز للرفع. استخدم هذا المسار للرفع اليدوي أو API خارجي.',
            destination: url
        };
    }

    // إرسال إلى Webhook
    async sendToWebhook(sourcePath, webhookUrl) {
        const ArchiveManager = require('./ArchiveManager');
        const archive = new ArchiveManager();
        
        const compressResult = await archive.compress(sourcePath, 'tar.gz');
        
        if (compressResult.status !== 'success') {
            return { status: "error", error: 'فشل ضغط الملفات.' };
        }

        return new Promise((resolve) => {
            const fileContent = fs.readFileSync(compressResult.outputPath);
            
            const urlObj = new URL(webhookUrl);
            const protocol = urlObj.protocol === 'https:' ? https : http;
            
            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port,
                path: urlObj.pathname + urlObj.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/gzip',
                    'Content-Length': fileContent.length,
                    'X-CoreFlow-Source': path.basename(sourcePath)
                }
            };

            const req = protocol.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    resolve({
                        status: res.statusCode >= 200 && res.statusCode < 300 ? "success" : "error",
                        httpStatus: res.statusCode,
                        response: data.substring(0, 500),
                        destination: webhookUrl
                    });
                });
            });

            req.on('error', (error) => {
                resolve({
                    status: "error",
                    error: error.message,
                    destination: webhookUrl
                });
            });

            req.write(fileContent);
            req.end();
        });
    }

    // الواجهة الموحدة: تستقبل مشروع وترسله لأي وجهة
    async deliver(sourcePath, destination, options = {}) {
        const type = this.detectDestinationType(destination);
        
        let result;
        
        switch (type) {
            case 'git':
                result = await this.pushToGit(
                    sourcePath,
                    destination,
                    options.branch || 'main',
                    options.message || 'CoreFlow delivery'
                );
                break;
            case 'local':
                result = await this.saveToLocal(
                    sourcePath,
                    destination === 'local' ? path.join(WORKSPACE_DIR, 'exports', path.basename(sourcePath)) : destination
                );
                break;
            case 'webhook':
                result = await this.sendToWebhook(sourcePath, destination);
                break;
            case 's3':
            case 'google_drive':
            case 'dropbox':
                result = await this.uploadToUrl(sourcePath, destination, options);
                break;
            default:
                result = {
                    status: "error",
                    error: `وجهة غير مدعومة: ${type}`,
                    destination
                };
        }

        return {
            ...result,
            detectedType: type,
            timestamp: new Date().toISOString()
        };
    }

    // قائمة الوجهات المدعومة
    getSupportedDestinations() {
        return {
            git: 'Git repositories (GitHub, GitLab, Bitbucket)',
            local: 'Local file system copy',
            webhook: 'HTTP/HTTPS webhook endpoints',
            s3: 'Amazon S3 (coming soon)',
            google_drive: 'Google Drive (coming soon)',
            dropbox: 'Dropbox (coming soon)',
            ftp: 'FTP/FTPS servers (coming soon)'
        };
    }
}

module.exports = DestinationManager;
