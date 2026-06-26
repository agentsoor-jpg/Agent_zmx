const executionEngine = require('../core/executionEngine');
const observer = require('../monitoring/observer');
const integrityChecker = require('../integrity/IntegrityChecker');
const fs = require('fs');
const path = require('path');

const WORKSPACE_DIR = path.resolve(process.cwd(), 'workspace_run');

class ChaosEngine {
    constructor() {
        this.results = [];
        this.startTime = null;
    }

    // ========== الاختبار 1: إنشاء 1000 ملف ==========
    async testMassiveFileCreation() {
        const testName = "إنشاء 1000 ملف";
        const startTime = Date.now();
        const errors = [];
        let created = 0;

        try {
            // إنشاء مجلد الاختبار
            executionEngine.createDirectory('chaos_test/massive_files');

            // إنشاء 1000 ملف
            for (let i = 1; i <= 1000; i++) {
                const fileName = `chaos_test/massive_files/file_${i}.txt`;
                const content = `File number ${i}\nCreated at ${new Date().toISOString()}\nLine 1\nLine 2\nLine 3\n`;
                
                const result = executionEngine.createFile(fileName, content);
                
                if (result.status === 'success') {
                    created++;
                } else {
                    errors.push({ file: fileName, error: result.error });
                }

                // كل 100 ملف، نتحقق من التقدم
                if (i % 100 === 0) {
                    observer.addLog({
                        action: "chaos_test",
                        test: testName,
                        progress: `${i}/1000`,
                        status: "in_progress"
                    });
                }
            }

            // التحقق النهائي: عد الملفات فعليًا
            const actualFiles = this.countFilesInDir('chaos_test/massive_files');
            
            return {
                testName,
                status: created === 1000 && actualFiles === 1000 ? "passed" : "failed",
                duration: Date.now() - startTime,
                expected: 1000,
                created,
                actualOnDisk: actualFiles,
                errors,
                memoryUsage: process.memoryUsage()
            };
        } catch (error) {
            return {
                testName,
                status: "crashed",
                duration: Date.now() - startTime,
                error: error.message
            };
        }
    }

    // ========== الاختبار 2: إنشاء ملف 30000 سطر ==========
    async testMassiveFile() {
        const testName = "إنشاء ملف 30000 سطر";
        const startTime = Date.now();

        try {
            executionEngine.createDirectory('chaos_test/massive_file');
            
            let content = '';
            for (let i = 1; i <= 30000; i++) {
                content += `Line ${i}: This is a test line for massive file generation. Testing system stability under extreme conditions.\n`;
            }

            const result = executionEngine.createFile('chaos_test/massive_file/huge_file.txt', content);

            // التحقق
            const readResult = executionEngine.readFile('chaos_test/massive_file/huge_file.txt');
            let actualLines = 0;
            let fileSize = 0;

            if (readResult.status === 'success') {
                actualLines = readResult.content.split('\n').filter(l => l.trim()).length;
                const absolutePath = path.resolve(WORKSPACE_DIR, 'chaos_test/massive_file/huge_file.txt');
                if (fs.existsSync(absolutePath)) {
                    fileSize = fs.statSync(absolutePath).size;
                }
            }

            return {
                testName,
                status: result.status === 'success' && actualLines >= 30000 ? "passed" : "failed",
                duration: Date.now() - startTime,
                expectedLines: 30000,
                actualLines,
                fileSizeBytes: fileSize,
                fileSizeKB: Math.round(fileSize / 1024),
                memoryUsage: process.memoryUsage()
            };
        } catch (error) {
            return {
                testName,
                status: "crashed",
                duration: Date.now() - startTime,
                error: error.message
            };
        }
    }

    // ========== الاختبار 3: إنشاء متزامن ==========
    async testConcurrentCreation() {
        const testName = "إنشاء متزامن - 50 ملف متوازي";
        const startTime = Date.now();

        try {
            executionEngine.createDirectory('chaos_test/concurrent');
            
            const promises = [];
            for (let i = 1; i <= 50; i++) {
                promises.push(
                    Promise.resolve().then(() => {
                        return executionEngine.createFile(
                            `chaos_test/concurrent/file_${i}.js`,
                            `// Concurrent file ${i}\nconst x = ${i};\nmodule.exports = x;`
                        );
                    })
                );
            }

            const results = await Promise.all(promises);
            const successful = results.filter(r => r.status === 'success').length;
            const failed = results.filter(r => r.status === 'error').length;
            
            // التحقق
            const actualFiles = this.countFilesInDir('chaos_test/concurrent');

            return {
                testName,
                status: successful === 50 && actualFiles === 50 ? "passed" : "failed",
                duration: Date.now() - startTime,
                expected: 50,
                successful,
                failed,
                actualOnDisk: actualFiles,
                memoryUsage: process.memoryUsage()
            };
        } catch (error) {
            return {
                testName,
                status: "crashed",
                duration: Date.now() - startTime,
                error: error.message
            };
        }
    }

    // ========== الاختبار 4: أوامر غير صالحة ==========
    async testInvalidCommands() {
        const testName = "اختبار أوامر غير صالحة";
        const startTime = Date.now();
        const results = [];

        const invalidCommands = [
            { command: "rm -rf /", expectedStatus: "error", reason: "أمر خطير" },
            { command: "sudo rm -rf /*", expectedStatus: "error", reason: "sudo ممنوع" },
            { command: "curl http://evil.com", expectedStatus: "error", reason: "curl غير مسموح" },
            { command: "wget http://evil.com", expectedStatus: "error", reason: "wget غير مسموح" },
            { command: "", expectedStatus: "error", reason: "أمر فارغ" },
            { command: "invalid_command_xyz", expectedStatus: "error", reason: "أمر غير معروف" },
            { command: "node -e \"require('child_process').exec('rm -rf /')\"", expectedStatus: "error", reason: "محاولة تجاوز" },
        ];

        for (const test of invalidCommands) {
            const result = await executionEngine.runCommand(test.command);
            results.push({
                command: test.command,
                reason: test.reason,
                expectedStatus: test.expectedStatus,
                actualStatus: result.status,
                passed: result.status === test.expectedStatus
            });
        }

        const allPassed = results.every(r => r.passed);

        return {
            testName,
            status: allPassed ? "passed" : "failed",
            duration: Date.now() - startTime,
            totalTests: results.length,
            passed: results.filter(r => r.passed).length,
            failed: results.filter(r => !r.passed).length,
            details: results
        };
    }

    // ========== الاختبار 5: Path Traversal ==========
    async testPathTraversal() {
        const testName = "اختبار Path Traversal";
        const startTime = Date.now();
        const results = [];

        const traversalAttempts = [
            { path: "../outside_file.txt", shouldFail: true },
            { path: "../../etc/passwd", shouldFail: true },
            { path: "valid_file.txt", shouldFail: false },
            { path: "subfolder/../outside.txt", shouldFail: true },
            { path: "./././valid.txt", shouldFail: false },
        ];

        for (const attempt of traversalAttempts) {
            const result = executionEngine.createFile(attempt.path, "test content");
            const passed = attempt.shouldFail ? result.status === "error" : result.status === "success";
            
            results.push({
                path: attempt.path,
                expectedToFail: attempt.shouldFail,
                actualStatus: result.status,
                passed
            });
        }

        const allPassed = results.every(r => r.passed);

        return {
            testName,
            status: allPassed ? "passed" : "failed",
            duration: Date.now() - startTime,
            totalTests: results.length,
            passed: results.filter(r => r.passed).length,
            failed: results.filter(r => !r.passed).length,
            details: results
        };
    }

    // ========== الاختبار 6: تعديل ملفات متكرر ==========
    async testRepeatedModification() {
        const testName = "تعديل متكرر لنفس الملف";
        const startTime = Date.now();

        try {
            executionEngine.createDirectory('chaos_test/repeated');
            const filePath = 'chaos_test/repeated/mutable.txt';
            
            executionEngine.createFile(filePath, "Version 0");
            
            for (let i = 1; i <= 100; i++) {
                executionEngine.createFile(filePath, `Version ${i}\nModified at ${new Date().toISOString()}`);
            }

            const readResult = executionEngine.readFile(filePath);
            const finalContent = readResult.status === 'success' ? readResult.content : '';

            return {
                testName,
                status: readResult.status === 'success' && finalContent.includes('Version 100') ? "passed" : "failed",
                duration: Date.now() - startTime,
                modifications: 100,
                finalContentFirstLine: finalContent.split('\n')[0],
                memoryUsage: process.memoryUsage()
            };
        } catch (error) {
            return {
                testName,
                status: "crashed",
                duration: Date.now() - startTime,
                error: error.message
            };
        }
    }

    // ========== الاختبار 7: اختبار نفاد الذاكرة ==========
    async testMemoryPressure() {
        const testName = "اختبار ضغط الذاكرة";
        const startTime = Date.now();

        try {
            executionEngine.createDirectory('chaos_test/memory_pressure');
            
            const largeContent = 'A'.repeat(100000); // 100KB per file
            
            let created = 0;
            const maxFiles = 100;
            
            for (let i = 1; i <= maxFiles; i++) {
                const result = executionEngine.createFile(
                    `chaos_test/memory_pressure/large_${i}.txt`,
                    largeContent
                );
                if (result.status === 'success') created++;
            }

            return {
                testName,
                status: created === maxFiles ? "passed" : "failed",
                duration: Date.now() - startTime,
                filesCreated: created,
                totalSizeKB: Math.round((created * 100000) / 1024),
                memoryUsage: process.memoryUsage()
            };
        } catch (error) {
            return {
                testName,
                status: "crashed",
                duration: Date.now() - startTime,
                error: error.message
            };
        }
    }

    // ========== الاختبار 8: حذف وإعادة إنشاء ==========
    async testDeleteAndRecreate() {
        const testName = "حذف وإعادة إنشاء";
        const startTime = Date.now();

        try {
            executionEngine.createDirectory('chaos_test/delete_recreate');
            
            // إنشاء 50 ملف
            for (let i = 1; i <= 50; i++) {
                executionEngine.createFile(`chaos_test/delete_recreate/file_${i}.txt`, `Content ${i}`);
            }

            // حذف 25 ملف
            for (let i = 1; i <= 25; i++) {
                executionEngine.deleteFile(`chaos_test/delete_recreate/file_${i}.txt`);
            }

            // إعادة إنشاء المحذوفة
            for (let i = 1; i <= 25; i++) {
                executionEngine.createFile(`chaos_test/delete_recreate/file_${i}.txt`, `Recreated ${i}`);
            }

            const actualFiles = this.countFilesInDir('chaos_test/delete_recreate');

            return {
                testName,
                status: actualFiles === 50 ? "passed" : "failed",
                duration: Date.now() - startTime,
                expected: 50,
                actualOnDisk: actualFiles,
                memoryUsage: process.memoryUsage()
            };
        } catch (error) {
            return {
                testName,
                status: "crashed",
                duration: Date.now() - startTime,
                error: error.message
            };
        }
    }

    // ========== الاختبار 9: سلامة البيانات بعد العمليات ==========
    async testIntegrityAfterChaos() {
        const testName = "فحص التطابق بعد الفوضى";
        const startTime = Date.now();

        try {
            const integrityReport = await integrityChecker.runFullCheck();
            
            return {
                testName,
                status: integrityReport.isClean ? "passed" : "failed",
                duration: Date.now() - startTime,
                totalIssues: integrityReport.totalIssues,
                issues: integrityReport.issues.slice(0, 10), // أول 10 مشاكل
                summary: integrityReport.summary
            };
        } catch (error) {
            return {
                testName,
                status: "crashed",
                duration: Date.now() - startTime,
                error: error.message
            };
        }
    }

    // ========== تنظيف ==========
    cleanup() {
        try {
            executionEngine.deleteDirectory('chaos_test');
            return { status: "cleaned" };
        } catch (error) {
            return { status: "error", error: error.message };
        }
    }

    // ========== تشغيل كل الاختبارات ==========
    async runAll() {
        this.startTime = Date.now();
        this.results = [];
        
        // Clean environment
        const ledger = require('../integrity/Ledger');
        const semanticIndex = require('../integrity/SemanticIndex');
        ledger.reset();
        semanticIndex.reset();
        if (fs.existsSync(WORKSPACE_DIR)) {
            fs.rmSync(WORKSPACE_DIR, { recursive: true, force: true });
        }
        
        const tests = [
            { name: "1. إنشاء 1000 ملف", fn: () => this.testMassiveFileCreation() },
            { name: "2. إنشاء ملف 30000 سطر", fn: () => this.testMassiveFile() },
            { name: "3. إنشاء متزامن", fn: () => this.testConcurrentCreation() },
            { name: "4. أوامر غير صالحة", fn: () => this.testInvalidCommands() },
            { name: "5. Path Traversal", fn: () => this.testPathTraversal() },
            { name: "6. تعديل متكرر", fn: () => this.testRepeatedModification() },
            { name: "7. ضغط الذاكرة", fn: () => this.testMemoryPressure() },
            { name: "8. حذف وإعادة إنشاء", fn: () => this.testDeleteAndRecreate() },
            { name: "9. فحص التطابق بعد الفوضى", fn: () => this.testIntegrityAfterChaos() },
        ];

        console.log('\n🔥 ========== بدء غرفة التعذيب ========== 🔥\n');

        for (const test of tests) {
            console.log(`⏳ جاري تنفيذ: ${test.name}...`);
            
            const result = await test.fn();
            this.results.push(result);
            
            const icon = result.status === 'passed' ? '✅' : result.status === 'crashed' ? '💀' : '❌';
            const duration = result.duration ? `${(result.duration / 1000).toFixed(2)}s` : 'N/A';
            
            console.log(`${icon} ${test.name} - ${result.status.toUpperCase()} (${duration})`);
            
            observer.addLog({
                action: "chaos_test_result",
                test: test.name,
                status: result.status,
                duration: result.duration
            });
        }

        const totalDuration = Date.now() - this.startTime;
        const passed = this.results.filter(r => r.status === 'passed').length;
        const failed = this.results.filter(r => r.status === 'failed').length;
        const crashed = this.results.filter(r => r.status === 'crashed').length;

        const summary = {
            totalTests: this.results.length,
            passed,
            failed,
            crashed,
            totalDuration,
            totalDurationSeconds: (totalDuration / 1000).toFixed(2),
            grade: this.calculateGrade(passed, this.results.length),
            results: this.results,
            systemState: {
                memory: process.memoryUsage(),
                uptime: process.uptime()
            }
        };

        console.log('\n📊 ========== النتيجة النهائية ==========');
        console.log(`✅ نجح: ${passed}/${this.results.length}`);
        console.log(`❌ فشل: ${failed}/${this.results.length}`);
        console.log(`💀 انهيار: ${crashed}/${this.results.length}`);
        console.log(`🏆 التقييم: ${summary.grade}`);
        console.log(`⏱️ الزمن الكلي: ${summary.totalDurationSeconds}s`);
        console.log('=====================================\n');

        // تنظيف
        this.cleanup();

        return summary;
    }

    calculateGrade(passed, total) {
        const ratio = passed / total;
        if (ratio === 1) return 'A+ - النظام صلب';
        if (ratio >= 0.9) return 'A - النظام قوي جداً';
        if (ratio >= 0.7) return 'B - النظام جيد ويحتاج تحسينات';
        if (ratio >= 0.5) return 'C - النظام ضعيف';
        return 'F - النظام هش ويحتاج إعادة بناء';
    }

    countFilesInDir(relativePath) {
        try {
            const absolutePath = path.resolve(WORKSPACE_DIR, relativePath);
            if (!fs.existsSync(absolutePath)) return 0;
            
            let count = 0;
            const items = fs.readdirSync(absolutePath);
            
            for (const item of items) {
                const fullPath = path.join(absolutePath, item);
                if (fs.statSync(fullPath).isFile()) count++;
            }
            
            return count;
        } catch {
            return 0;
        }
    }
}

module.exports = ChaosEngine;
