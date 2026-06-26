const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const WORKSPACE_DIR = path.resolve(process.cwd(), 'workspace_run');

class SourceManager {
    constructor() {
        this.supportedSources = [
            'git', 'github', 'gitlab', 'bitbucket',
            'url', 'https', 'http',
            'ftp', 'ftps',
            'local', 'upload',
            'raw', 'text'
        ];
    }

    // تحديد نوع المصدر
    detectSourceType(source) {
        if (!source || typeof source !== 'string') return 'unknown';
        
        if (source.startsWith('git@') || source.endsWith('.git')) return 'git';
        if (source.includes('github.com')) return 'github';
        if (source.includes('gitlab.com')) return 'gitlab';
        if (source.includes('bitbucket.org')) return 'bitbucket';
        if (source.startsWith('ftp://') || source.startsWith('ftps://')) return 'ftp';
        if (source.startsWith('http://') || source.startsWith('https://')) {
            if (source.endsWith('.zip') || source.endsWith('.tar.gz') || source.endsWith('.rar')) {
                return 'archive_url';
            }
            return 'url';
        }
        if (fs.existsSync(source)) return 'local';
        
        return 'unknown';
    }

    // استقبال من Git
    async fetchFromGit(url, branch = null, targetName = null) {
        return new Promise((resolve) => {
            const repoName = targetName || url.split('/').pop().replace('.git', '');
            const targetPath = path.join(WORKSPACE_DIR, repoName);

            if (fs.existsSync(targetPath)) {
                // موجود مسبقاً - نجلب التحديثات
                exec(`git pull origin ${branch || 'main'}`, { cwd: targetPath, timeout: 30000 }, (error, stdout, stderr) => {
                    resolve({
                        status: error ? "error" : "success",
                        source: url,
                        type: 'git',
                        action: 'pull',
                        path: targetPath,
                        stdout, stderr
                    });
                });
            } else {
                // استنساخ جديد
                let cmd = `git clone ${url}`;
                if (branch) cmd += ` -b ${branch}`;
                cmd += ` ${repoName}`;
                
                exec(cmd, { cwd: WORKSPACE_DIR, timeout: 60000 }, (error, stdout, stderr) => {
                    resolve({
                        status: error ? "error" : "success",
                        source: url,
                        type: 'git',
                        action: 'clone',
                        path: targetPath,
                        stdout, stderr
                    });
                });
            }
        });
    }

    // تحميل من URL
    async fetchFromUrl(url, targetName = null) {
        return new Promise((resolve) => {
            const fileName = targetName || url.split('/').pop() || 'downloaded_file';
            const targetPath = path.join(WORKSPACE_DIR, fileName);
            
            const protocol = url.startsWith('https') ? https : http;
            
            protocol.get(url, (response) => {
                // متابعة التوجيه
                if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                    return this.fetchFromUrl(response.headers.location, targetName).then(resolve);
                }

                if (response.statusCode !== 200) {
                    return resolve({
                        status: "error",
                        source: url,
                        type: 'url',
                        error: `HTTP ${response.statusCode}`
                    });
                }

                const fileStream = fs.createWriteStream(targetPath);
                response.pipe(fileStream);
                
                fileStream.on('finish', () => {
                    resolve({
                        status: "success",
                        source: url,
                        type: 'url',
                        path: targetPath,
                        size: fs.statSync(targetPath).size
                    });
                });

                fileStream.on('error', (error) => {
                    resolve({
                        status: "error",
                        source: url,
                        type: 'url',
                        error: error.message
                    });
                });
            }).on('error', (error) => {
                resolve({
                    status: "error",
                    source: url,
                    type: 'url',
                    error: error.message
                });
            });
        });
    }

    // استقبال من ملف محلي
    async fetchFromLocal(localPath, targetName = null) {
        return new Promise((resolve) => {
            try {
                if (!fs.existsSync(localPath)) {
                    return resolve({
                        status: "error",
                        source: localPath,
                        type: 'local',
                        error: 'الملف غير موجود'
                    });
                }

                const fileName = targetName || path.basename(localPath);
                const targetPath = path.join(WORKSPACE_DIR, fileName);
                
                fs.copyFileSync(localPath, targetPath);
                
                resolve({
                    status: "success",
                    source: localPath,
                    type: 'local',
                    path: targetPath,
                    size: fs.statSync(targetPath).size
                });
            } catch (error) {
                resolve({
                    status: "error",
                    source: localPath,
                    type: 'local',
                    error: error.message
                });
            }
        });
    }

    // استقبال من نص خام (إنشاء ملف من نص)
    async fetchFromRawText(text, fileName = 'raw_input.txt') {
        try {
            if (!fs.existsSync(WORKSPACE_DIR)) {
                fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
            }
            const targetPath = path.join(WORKSPACE_DIR, fileName);
            fs.writeFileSync(targetPath, text, 'utf8');
            
            return {
                status: "success",
                source: 'raw_text',
                type: 'raw',
                path: targetPath,
                size: text.length
            };
        } catch (error) {
            return {
                status: "error",
                source: 'raw_text',
                type: 'raw',
                error: error.message
            };
        }
    }

    // استقبال من FTP
    async fetchFromFtp(url, targetName = null) {
        // تنفيذ مستقبلي باستخدام مكتبة ftp
        return {
            status: "not_implemented",
            source: url,
            type: 'ftp',
            message: 'FTP support coming soon. Use URL download for now.'
        };
    }

    // الواجهة الموحدة: تستقبل أي مصدر وتعيد الملفات
    async ingest(source, options = {}) {
        const type = this.detectSourceType(source);
        
        let result;
        
        switch (type) {
            case 'git':
            case 'github':
            case 'gitlab':
            case 'bitbucket':
                result = await this.fetchFromGit(source, options.branch, options.targetName);
                break;
            case 'archive_url':
                result = await this.fetchFromUrl(source, options.targetName);
                // بعد التحميل، نفك الضغط تلقائياً
                if (result.status === 'success' && result.path) {
                    const ArchiveManager = require('./ArchiveManager');
                    const archive = new ArchiveManager();
                    const extractResult = await archive.extract(result.path);
                    result.extracted = extractResult;
                }
                break;
            case 'url':
            case 'https':
            case 'http':
                result = await this.fetchFromUrl(source, options.targetName);
                break;
            case 'ftp':
                result = await this.fetchFromFtp(source, options.targetName);
                break;
            case 'local':
                result = await this.fetchFromLocal(source, options.targetName);
                break;
            case 'raw':
                result = await this.fetchFromRawText(source, options.targetName);
                break;
            default:
                // افتراض أنه نص خام
                if (source && source.length > 0) {
                    result = await this.fetchFromRawText(source, options.targetName || 'input.txt');
                } else {
                    result = {
                        status: "error",
                        source,
                        type: 'unknown',
                        error: 'لم نتمكن من تحديد نوع المصدر.'
                    };
                }
        }

        return {
            ...result,
            detectedType: type,
            timestamp: new Date().toISOString()
        };
    }

    // قائمة المصادر المدعومة
    getSupportedSources() {
        return {
            git: 'Git repositories (GitHub, GitLab, Bitbucket)',
            url: 'Direct file URLs',
            archive_url: 'Archive URLs (.zip, .tar.gz, .rar)',
            ftp: 'FTP/FTPS servers',
            local: 'Local file paths',
            raw: 'Raw text input'
        };
    }
}

module.exports = SourceManager;
