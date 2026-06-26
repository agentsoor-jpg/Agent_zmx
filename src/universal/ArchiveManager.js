const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { pipeline } = require('stream');
const { createReadStream, createWriteStream } = require('fs');

const WORKSPACE_DIR = path.resolve(process.cwd(), 'workspace_run');

class ArchiveManager {
    constructor() {
        this.supportedFormats = ['zip', 'tar', 'tar.gz', 'tgz', 'gz', 'rar'];
    }

    // تحديد نوع الأرشيف من الامتداد
    detectFormat(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const name = path.basename(filePath).toLowerCase();
        
        if (name.endsWith('.tar.gz') || name.endsWith('.tgz')) return 'tar.gz';
        if (ext === '.zip') return 'zip';
        if (ext === '.tar') return 'tar';
        if (ext === '.gz') return 'gz';
        if (ext === '.rar') return 'rar';
        
        return 'unknown';
    }

    // فك الضغط
    async extract(filePath, outputDir = null) {
        const format = this.detectFormat(filePath);
        
        if (!fs.existsSync(filePath)) {
            return { status: "error", error: 'الملف غير موجود', path: filePath };
        }

        const extractDir = outputDir || path.join(
            path.dirname(filePath),
            path.basename(filePath, path.extname(filePath)).replace('.tar', '')
        );

        if (!fs.existsSync(extractDir)) {
            fs.mkdirSync(extractDir, { recursive: true });
        }

        return new Promise((resolve) => {
            let command = '';

            switch (format) {
                case 'zip':
                    command = `unzip -o "${filePath}" -d "${extractDir}"`;
                    break;
                case 'tar.gz':
                case 'tgz':
                    command = `tar -xzf "${filePath}" -C "${extractDir}"`;
                    break;
                case 'tar':
                    command = `tar -xf "${filePath}" -C "${extractDir}"`;
                    break;
                case 'gz':
                    // GZIP فقط - يفك الملف الواحد
                    command = `gunzip -c "${filePath}" > "${extractDir}/$(basename "${filePath}" .gz)"`;
                    break;
                case 'rar':
                    command = `unrar x -o+ "${filePath}" "${extractDir}/"`;
                    break;
                default:
                    return resolve({
                        status: "error",
                        error: `صيغة غير مدعومة: ${format}`,
                        format,
                        path: filePath
                    });
            }

            exec(command, { timeout: 120000 }, (error, stdout, stderr) => {
                if (error) {
                    // محاولة بديلة لـ ZIP باستخدام Node.js
                    if (format === 'zip') {
                        this.extractZipNode(filePath, extractDir).then(resolve);
                        return;
                    }
                    
                    resolve({
                        status: "error",
                        error: stderr || error.message,
                        format,
                        path: filePath
                    });
                } else {
                    resolve({
                        status: "success",
                        format,
                        extractedTo: extractDir,
                        path: filePath,
                        stdout
                    });
                }
            });
        });
    }

    // فك ZIP باستخدام Node.js (بدون اعتماديات خارجية)
    async extractZipNode(zipPath, outputDir) {
        try {
            // محاولة باستخدام execSync مع unzip أولاً
            const { execSync } = require('child_process');
            execSync(`unzip -o "${zipPath}" -d "${outputDir}"`, { stdio: 'pipe' });
            
            return {
                status: "success",
                format: 'zip',
                extractedTo: outputDir,
                path: zipPath,
                method: 'unzip'
            };
        } catch {
            // إذا فشل unzip، نحاول tar (بعض الأنظمة تستخدم tar لفك zip)
            try {
                const { execSync } = require('child_process');
                execSync(`tar -xf "${zipPath}" -C "${outputDir}"`, { stdio: 'pipe' });
                
                return {
                    status: "success",
                    format: 'zip',
                    extractedTo: outputDir,
                    path: zipPath,
                    method: 'tar'
                };
            } catch (e) {
                return {
                    status: "error",
                    format: 'zip',
                    error: 'فشل فك الضغط. تأكد من تثبيت unzip أو tar.',
                    path: zipPath
                };
            }
        }
    }

    // ضغط مجلد
    async compress(sourceDir, format = 'zip', outputName = null) {
        if (!fs.existsSync(sourceDir)) {
            return { status: "error", error: 'المجلد المصدر غير موجود', path: sourceDir };
        }

        const dirName = path.basename(sourceDir);
        const outputFile = outputName || `${dirName}.${format === 'tar.gz' ? 'tar.gz' : format}`;
        const outputPath = path.join(WORKSPACE_DIR, 'archives', outputFile);

        // تأكد من وجود مجلد الأرشيفات
        const archiveDir = path.dirname(outputPath);
        if (!fs.existsSync(archiveDir)) {
            fs.mkdirSync(archiveDir, { recursive: true });
        }

        return new Promise((resolve) => {
            let command = '';
            const parentDir = path.dirname(sourceDir);
            const baseName = path.basename(sourceDir);

            switch (format) {
                case 'zip':
                    command = `cd "${parentDir}" && zip -r "${outputPath}" "${baseName}"`;
                    break;
                case 'tar.gz':
                case 'tgz':
                    command = `cd "${parentDir}" && tar -czf "${outputPath}" "${baseName}"`;
                    break;
                case 'tar':
                    command = `cd "${parentDir}" && tar -cf "${outputPath}" "${baseName}"`;
                    break;
                default:
                    return resolve({
                        status: "error",
                        error: `صيغة ضغط غير مدعومة: ${format}`
                    });
            }

            exec(command, { timeout: 120000 }, (error, stdout, stderr) => {
                if (error) {
                    resolve({
                        status: "error",
                        error: stderr || error.message,
                        format
                    });
                } else {
                    const size = fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0;
                    resolve({
                        status: "success",
                        format,
                        outputPath,
                        size,
                        sizeMB: (size / (1024 * 1024)).toFixed(2)
                    });
                }
            });
        });
    }

    // ضغط بتنسيقات متعددة
    async compressMultiple(sourceDir, formats = ['zip', 'tar.gz']) {
        const results = [];
        
        for (const format of formats) {
            const result = await this.compressSafe(sourceDir, format);
            results.push(result);
        }

        return {
            status: results.some(r => r.status === 'success') ? 'success' : 'error',
            results,
            sourceDir
        };
    }

    // ضغط باستخدام Node.js原生 (للاحتياط)
    async compressNodeNative(sourceDir, outputPath) {
        return new Promise((resolve) => {
            try {
                const { createWriteStream } = require('fs');
                const { createGzip } = require('zlib');
                const tar = require('tar');
                
                tar.c(
                    { gzip: true, file: outputPath, cwd: path.dirname(sourceDir) },
                    [path.basename(sourceDir)]
                ).then(() => {
                    const size = fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0;
                    resolve({
                        status: "success",
                        format: 'tar.gz',
                        outputPath,
                        size,
                        sizeMB: (size / (1024 * 1024)).toFixed(2),
                        method: 'node_native'
                    });
                }).catch((err) => {
                    resolve({
                        status: "error",
                        error: err.message,
                        method: 'node_native'
                    });
                });
            } catch (error) {
                resolve({
                    status: "error",
                    error: 'مكتبة tar غير متوفرة. استخدم أمر النظام بدلاً.',
                    method: 'node_native'
                });
            }
        });
    }

    // محاولة ضغط بطريقتين: أمر النظام أولاً، ثم Node.js
    async compressSafe(sourceDir, format = 'zip', outputName = null) {
        // المحاولة الأولى: أمر النظام
        const result = await this.compress(sourceDir, format, outputName);
        
        if (result.status === 'success') {
            return result;
        }

        // المحاولة الثانية: Node.js native لـ tar.gz فقط
        if (format === 'tar.gz' || format === 'tgz') {
            const dirName = path.basename(sourceDir);
            const outputFile = outputName || `${dirName}.tar.gz`;
            const outputPath = path.join(WORKSPACE_DIR, 'archives', outputFile);
            
            const archiveDir = path.dirname(outputPath);
            if (!fs.existsSync(archiveDir)) {
                fs.mkdirSync(archiveDir, { recursive: true });
            }

            return this.compressNodeNative(sourceDir, outputPath);
        }

        return result;
    }

    // الحصول على قائمة الصيغ المدعومة
    getSupportedFormats() {
        return {
            compression: ['zip', 'tar.gz', 'tar'],
            extraction: ['zip', 'tar.gz', 'tar', 'gz', 'rar'],
            notes: 'RAR extraction requires unrar to be installed.'
        };
    }
}

module.exports = ArchiveManager;
