import SmartErrorAnalyzer from './SmartErrorAnalyzer.js';
import executionEngine from '../core/executionEngine.js';
import fs from 'fs';
import path from 'path';

const WORKSPACE_DIR = path.resolve(process.cwd(), 'workspace_run');

class SelfTester {
    constructor() {
        this.errorAnalyzer = new SmartErrorAnalyzer();
        this.testResults = [];
        this.startTime = null;
    }

    // اختبار وحدة
    async testUnit(unitName, testFn) {
        const startTime = Date.now();
        let result;

        try {
            result = await Promise.resolve(testFn());
            
            const success = result === true || (result && result.status === 'success');
            
            return {
                unit: unitName,
                status: success ? 'passed' : 'failed',
                duration: Date.now() - startTime,
                result,
                error: success ? null : (result?.error || 'فشل غير معروف')
            };
        } catch (error) {
            const analysis = this.errorAnalyzer.analyze(error.message, { unit: unitName });
            
            return {
                unit: unitName,
                status: 'failed',
                duration: Date.now() - startTime,
                error: error.message,
                analysis,
                suggestedFixes: analysis.suggestedFixes
            };
        }
    }

    // اختبار نظام الملفات
    async testFileSystem() {
        const results = [];
        const testDir = 'self_test_filesystem';

        // تنظيف
        executionEngine.deleteDirectory(testDir);

        // اختبار إنشاء مجلد
        results.push(await this.testUnit('create_directory', () => {
            const result = executionEngine.createDirectory(testDir);
            return result.status === 'success' && fs.existsSync(path.join(WORKSPACE_DIR, testDir));
        }));

        // اختبار إنشاء ملف
        results.push(await this.testUnit('create_file', () => {
            const result = executionEngine.createFile(`${testDir}/test.txt`, 'Hello Self Test');
            return result.status === 'success' && 
                   fs.existsSync(path.join(WORKSPACE_DIR, testDir, 'test.txt'));
        }));

        // اختبار قراءة ملف
        results.push(await this.testUnit('read_file', () => {
            const result = executionEngine.readFile(`${testDir}/test.txt`);
            return result.status === 'success' && result.content === 'Hello Self Test';
        }));

        // اختبار حذف ملف
        results.push(await this.testUnit('delete_file', () => {
            executionEngine.deleteFile(`${testDir}/test.txt`);
            return !fs.existsSync(path.join(WORKSPACE_DIR, testDir, 'test.txt'));
        }));

        // اختبار Path Traversal
        results.push(await this.testUnit('path_traversal_protection', () => {
            const result = executionEngine.createFile('../outside.txt', 'hack');
            return result.status === 'error';
        }));

        // تنظيف
        executionEngine.deleteDirectory(testDir);

        return results;
    }

    // اختبار نظام الأوامر
    async testCommandSystem() {
        const results = [];

        // اختبار أمر مسموح
        results.push(await this.testUnit('allowed_command', async () => {
            const result = await executionEngine.runCommand('echo "test"');
            return result.status === 'success' && result.stdout.includes('test');
        }));

        // اختبار أمر ممنوع
        results.push(await this.testUnit('blocked_command', async () => {
            const result = await executionEngine.runCommand('rm -rf /');
            return result.status === 'error';
        }));

        // اختبار أمر فارغ
        results.push(await this.testUnit('empty_command', async () => {
            const result = await executionEngine.runCommand('');
            return result.status === 'error';
        }));

        return results;
    }

    // اختبار نظام المراقبة
    async testObserver() {
        const results = [];
        const observer = (await import('../monitoring/observer.js')).default;

        results.push(await this.testUnit('add_log', () => {
            observer.addLog({
                action: 'self_test',
                test: 'observer_test',
                status: 'testing'
            });
            const logs = observer.getLogs({ action: 'self_test' });
            return logs.length > 0;
        }));

        results.push(await this.testUnit('get_stats', () => {
            const stats = observer.getStats();
            return stats.total > 0 && typeof stats.success === 'number';
        }));

        results.push(await this.testUnit('export_logs', () => {
            const result = observer.exportLogsToFile();
            return result.status === 'success';
        }));

        return results;
    }

    // اختبار نظام التطابق
    async testIntegrity() {
        const results = [];
        const integrityChecker = (await import('../integrity/IntegrityChecker.js')).default;

        results.push(await this.testUnit('integrity_check', async () => {
            const report = await integrityChecker.runFullCheck();
            return report && typeof report.isClean === 'boolean';
        }));

        results.push(await this.testUnit('health_report', () => {
            const health = integrityChecker.getHealthReport();
            return health && health.status === 'healthy';
        }));

        return results;
    }

    // اختبار النظام بالكامل
    async testAll() {
        this.startTime = Date.now();
        this.testResults = [];

        console.log('\n🧪 ========== بدء الاختبار الذاتي ========== 🧪\n');

        const testSuites = [
            { name: 'نظام الملفات', fn: () => this.testFileSystem() },
            { name: 'نظام الأوامر', fn: () => this.testCommandSystem() },
            { name: 'نظام المراقبة', fn: () => this.testObserver() },
            { name: 'نظام التطابق', fn: () => this.testIntegrity() },
        ];

        for (const suite of testSuites) {
            console.log(`⏳ جاري اختبار: ${suite.name}...`);
            const results = await suite.fn();
            this.testResults.push({ suite: suite.name, results });
            
            const passed = results.filter(r => r.status === 'passed').length;
            console.log(`   ${passed}/${results.length} نجح`);
        }

        return this.generateReport();
    }

    // توليد تقرير
    generateReport() {
        const allResults = this.testResults.flatMap(s => s.results);
        const passed = allResults.filter(r => r.status === 'passed').length;
        const failed = allResults.filter(r => r.status === 'failed').length;
        const total = allResults.length;
        const totalDuration = Date.now() - this.startTime;

        const failures = allResults.filter(r => r.status === 'failed');

        // تحليل الإخفاقات
        const errorSummary = failures.length > 0 
            ? this.errorAnalyzer.summarize(failures.map(f => f.error || 'Unknown'))
            : null;

        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                total,
                passed,
                failed,
                passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
                duration: totalDuration,
                durationFormatted: `${(totalDuration / 1000).toFixed(2)}s`,
                grade: this.calculateGrade(passed, total)
            },
            suites: this.testResults.map(s => ({
                name: s.suite,
                passed: s.results.filter(r => r.status === 'passed').length,
                failed: s.results.filter(r => r.status === 'failed').length,
                total: s.results.length,
                results: s.results.map(r => ({
                    unit: r.unit,
                    status: r.status,
                    duration: r.duration + 'ms',
                    error: r.error,
                    fixes: r.suggestedFixes?.slice(0, 2).map(f => f.description)
                }))
            })),
            failures: failures.map(f => ({
                unit: f.unit,
                error: f.error,
                analysis: f.analysis?.categoryName || 'غير معروف',
                rootCause: f.analysis?.rootCause,
                suggestedFixes: f.analysis?.suggestedFixes?.slice(0, 3).map(f => f.description)
            })),
            errorSummary,
            recommendations: this.generateRecommendations(allResults)
        };

        console.log('\n📊 ========== نتيجة الاختبار الذاتي ==========');
        console.log(`✅ نجح: ${passed}/${total}`);
        console.log(`❌ فشل: ${failed}/${total}`);
        console.log(`📈 نسبة النجاح: ${report.summary.passRate}%`);
        console.log(`🏆 التقييم: ${report.summary.grade}`);
        console.log('=============================================\n');

        return report;
    }

    // حساب الدرجة
    calculateGrade(passed, total) {
        const ratio = passed / total;
        if (ratio === 1) return 'A+ - ممتاز';
        if (ratio >= 0.9) return 'A - جيد جداً';
        if (ratio >= 0.7) return 'B - جيد';
        if (ratio >= 0.5) return 'C - مقبول';
        return 'F - يحتاج إصلاح';
    }

    // توصيات
    generateRecommendations(results) {
        const recommendations = [];
        
        const slowTests = results.filter(r => r.duration > 100);
        if (slowTests.length > 0) {
            recommendations.push(`${slowTests.length} اختبارات بطيئة. راجع الأداء.`);
        }

        const fileSystemFailures = results.filter(r => r.unit?.includes('file') && r.status === 'failed');
        if (fileSystemFailures.length > 0) {
            recommendations.push('مشاكل في نظام الملفات. تحقق من الصلاحيات والمسارات.');
        }

        return recommendations;
    }
}

export default SelfTester;
