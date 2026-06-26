const SourceManager = require('./SourceManager');
const ArchiveManager = require('./ArchiveManager');
const DestinationManager = require('./DestinationManager');
const path = require('path');
const fs = require('fs');

const WORKSPACE_DIR = path.resolve(process.cwd(), 'workspace_run');

class UniversalFileManager {
    constructor() {
        this.source = new SourceManager();
        this.archive = new ArchiveManager();
        this.destination = new DestinationManager();
    }

    // سير العمل الكامل: استقبال → فك ← تعديل ← ضغط ← إرسال
    async fullPipeline(options) {
        const {
            source,           // مصدر المشروع (git url, file url, local path, raw text)
            extract = true,   // هل نفك الضغط إذا كانرشيف؟
            destination,      // وجهة الإرسال (git url, local path, webhook)
            format = 'zip',   // صيغة الضغط للإرسال
            message = 'CoreFlow pipeline delivery' // رسالة commit
        } = options;

        const steps = [];
        let currentPath = null;

        // 1. استقبال
        const ingestResult = await this.source.ingest(source, {
            targetName: options.targetName
        });
        steps.push({ phase: 'ingest', ...ingestResult });

        if (ingestResult.status !== 'success') {
            return { status: "error", steps, error: 'فشل في استقبال المصدر.' };
        }

        currentPath = ingestResult.path || ingestResult.extracted?.extractedTo;

        // 2. فك الضغط إذا احتاج
        if (extract && currentPath) {
            const ext = path.extname(currentPath).toLowerCase();
            const compressible = ['.zip', '.tar', '.gz', '.rar', '.tgz'];
            
            if (compressible.includes(ext) || currentPath.endsWith('.tar.gz')) {
                const extractResult = await this.archive.extract(currentPath);
                steps.push({ phase: 'extract', ...extractResult });
                
                if (extractResult.status === 'success') {
                    currentPath = extractResult.extractedTo;
                }
            }
        }

        // 3. إرسال إلى وجهة
        if (destination && currentPath) {
            const deliverResult = await this.destination.deliver(currentPath, destination, {
                message,
                branch: options.branch || 'main'
            });
            steps.push({ phase: 'deliver', ...deliverResult });
        }

        return {
            status: steps.every(s => s.status === 'success') ? "success" : "partial",
            steps,
            finalPath: currentPath,
            summary: this.generateSummary(steps)
        };
    }

    // استقبال فقط
    async ingest(source, options = {}) {
        return this.source.ingest(source, options);
    }

    // فك ضغط فقط
    async extract(filePath, outputDir = null) {
        return this.archive.extract(filePath, outputDir);
    }

    // ضغط فقط
    async compress(sourceDir, format = 'zip') {
        return this.archive.compressSafe(sourceDir, format);
    }

    // ضغط بعدة صيغ
    async compressMultiple(sourceDir, formats = ['zip', 'tar.gz']) {
        return this.archive.compressMultiple(sourceDir, formats);
    }

    // إرسال فقط
    async deliver(sourcePath, destination, options = {}) {
        return this.destination.deliver(sourcePath, destination, options);
    }

    // سحب مستودع Git
    async pullRepo(url, branch = null) {
        return this.source.fetchFromGit(url, branch);
    }

    // دفع إلى Git
    async pushToGit(sourcePath, remoteUrl, branch = 'main', message = 'CoreFlow commit') {
        return this.destination.pushToGit(sourcePath, remoteUrl, branch, message);
    }

    // الحصول على حالة الدعم
    getCapabilities() {
        return {
            sources: this.source.getSupportedSources(),
            formats: this.archive.getSupportedFormats(),
            destinations: this.destination.getSupportedDestinations(),
            pipeline: 'ingest → extract → modify → compress → deliver'
        };
    }

    // توليد ملخص
    generateSummary(steps) {
        const successful = steps.filter(s => s.status === 'success').length;
        const total = steps.length;
        
        return {
            totalPhases: total,
            successfulPhases: successful,
            failedPhases: total - successful,
            completed: successful === total
        };
    }
}

module.exports = UniversalFileManager;
