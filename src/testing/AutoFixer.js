import SmartErrorAnalyzer from './SmartErrorAnalyzer.js';
import SelfTester from './SelfTester.js';
import executionEngine from '../core/executionEngine.js';
import fs from 'fs';
import path from 'path';
import { exec, execSync } from 'child_process';

const WORKSPACE_DIR = path.resolve(process.cwd(), 'workspace_run');

class AutoFixer {
    constructor() {
        this.errorAnalyzer = new SmartErrorAnalyzer();
        this.selfTester = new SelfTester();
        this.fixHistory = [];
        this.maxRetries = 2;
    }

    // محاولة إصلاح تلقائي
    async attemptFix(failure, context = {}) {
        const analysis = failure.analysis || 
            this.errorAnalyzer.analyze(failure.error || 'Unknown error', context);

        const fixAttempt = {
            timestamp: new Date().toISOString(),
            unit: failure.unit,
            error: failure.error,
            category: analysis.category,
            attemptedFixes: [],
            successful: false
        };

        // محاولة كل إصلاح مقترح
        for (const fix of analysis.suggestedFixes) {
            const result = await this.executeFix(fix, context);
            fixAttempt.attemptedFixes.push({
                action: fix.action,
                description: fix.description,
                result: result.status,
                output: result.output
            });

            if (result.status === 'success') {
                fixAttempt.successful = true;
                break;
            }
        }

        this.fixHistory.push(fixAttempt);
        return fixAttempt;
    }

    // تنفيذ إصلاح
    async executeFix(fix, context) {
        try {
            switch (fix.action) {
                case 'install_package':
                    return this.fixInstallPackage(fix.command, context);
                
                case 'fix_permissions':
                    return this.fixPermissions(fix.command, context);
                
                case 'retry':
                    return { status: 'success', output: 'إعادة المحاولة موصى بها.' };
                
                case 'check_syntax':
                    return this.fixSyntax(context);
                
                case 'check_connection':
                    return this.fixConnection();
                
                case 'increase_memory':
                    return { status: 'applied', output: 'زيادة الذاكرة تتطلب إعادة تشغيل.' };
                
                case 'increase_timeout':
                    return { status: 'applied', output: 'زيادة المهلة تتطلب تعديل الإعدادات.' };
                
                default:
                    return { status: 'skipped', output: `لا يوجد إصلاح تلقائي للإجراء: ${fix.action}` };
            }
        } catch (error) {
            return { status: 'error', output: error.message };
        }
    }

    // إصلاح تثبيت حزمة
    async fixInstallPackage(command, context) {
        if (!command) return { status: 'skipped', output: 'لا يوجد أمر تثبيت.' };

        return new Promise((resolve) => {
            const cwd = context.projectPath 
                ? path.resolve(WORKSPACE_DIR, context.projectPath)
                : WORKSPACE_DIR;

            exec(command, { cwd, timeout: 30000 }, (error, stdout, stderr) => {
                resolve({
                    status: error ? 'error' : 'success',
                    output: stdout || stderr
                });
            });
        });
    }

    // إصلاح صلاحيات
    fixPermissions(command, context) {
        if (!command) return { status: 'skipped', output: 'لا يوجد أمر تغيير صلاحيات.' };

        try {
            const output = execSync(command, { timeout: 10000 }).toString();
            return { status: 'success', output };
        } catch (error) {
            return { status: 'error', output: error.message };
        }
    }

    // إصلاح نحوي بسيط
    fixSyntax(context) {
        if (!context.filePath) {
            return { status: 'skipped', output: 'لا يوجد ملف للتحقق.' };
        }

        const fullPath = path.resolve(WORKSPACE_DIR, context.filePath);
        if (!fs.existsSync(fullPath)) {
            return { status: 'error', output: 'الملف غير موجود.' };
        }

        try {
            let content = fs.readFileSync(fullPath, 'utf8');
            let fixed = false;

            // إصلاح الفواصل المنقوطة المفقودة في JavaScript
            const lines = content.split('\n');
            const fixedLines = lines.map(line => {
                const trimmed = line.trim();
                if (trimmed && 
                    !trimmed.endsWith(';') && 
                    !trimmed.endsWith('{') && 
                    !trimmed.endsWith('}') && 
                    !trimmed.endsWith(':') &&
                    !trimmed.startsWith('//') &&
                    !trimmed.startsWith('/*') &&
                    !trimmed.startsWith('*') &&
                    !trimmed.startsWith('import') &&
                    !trimmed.startsWith('export') &&
                    trimmed.length > 0) {
                    fixed = true;
                    return line + ';';
                }
                return line;
            });

            if (fixed) {
                fs.writeFileSync(fullPath, fixedLines.join('\n'), 'utf8');
                return { status: 'success', output: 'تمت إضافة فواصل منقوطة مفقودة.' };
            }

            return { status: 'skipped', output: 'لم يتم العثور على أخطاء نحوية واضحة.' };
        } catch (error) {
            return { status: 'error', output: error.message };
        }
    }

    // فحص الاتصال
    fixConnection() {
        try {
            execSync('ping -c 1 -W 2 google.com', { timeout: 5000 });
            return { status: 'success', output: 'الاتصال بالإنترنت متاح.' };
        } catch {
            return { status: 'error', output: 'لا يوجد اتصال بالإنترنت.' };
        }
    }

    // دورة إصلاح كاملة: اختبر ← أصلح ← أعد الاختبار
    async fixAndRetest(maxRetries = this.maxRetries) {
        const cycles = [];
        let allPassed = false;

        for (let i = 0; i < maxRetries; i++) {
            console.log(`\n🔄 دورة الإصلاح ${i + 1}/${maxRetries}...`);
            
            // اختبار
            const testReport = await this.selfTester.testAll();
            
            cycles.push({
                cycle: i + 1,
                testResults: testReport.summary,
                failures: testReport.failures
            });

            // إذا نجح كل شيء، توقف
            if (testReport.failures.length === 0) {
                allPassed = true;
                console.log('✅ كل الاختبارات نجحت!');
                break;
            }

            // إصلاح الإخفاقات
            console.log(`🔧 إصلاح ${testReport.failures.length} إخفاقات...`);
            for (const failure of testReport.failures) {
                const fixResult = await this.attemptFix(failure);
                cycles[cycles.length - 1].fixes = cycles[cycles.length - 1].fixes || [];
                cycles[cycles.length - 1].fixes.push(fixResult);
                
                if (fixResult.successful) {
                    console.log(`   ✅ تم إصلاح: ${failure.unit}`);
                } else {
                    console.log(`   ❌ فشل إصلاح: ${failure.unit}`);
                }
            }
        }

        return {
            status: allPassed ? 'all_fixed' : 'some_remaining',
            cycles,
            totalCycles: cycles.length,
            allPassed,
            finalVerdict: allPassed 
                ? '✅ تم إصلاح كل الأخطاء تلقائياً.' 
                : '⚠️ بعض الأخطاء تحتاج تدخلاً يدوياً.',
            fixHistory: this.fixHistory
        };
    }

    // الحصول على إحصائيات الإصلاح
    getStats() {
        return {
            totalFixes: this.fixHistory.length,
            successfulFixes: this.fixHistory.filter(f => f.successful).length,
            failedFixes: this.fixHistory.filter(f => !f.successful).length,
            successRate: this.fixHistory.length > 0
                ? Math.round((this.fixHistory.filter(f => f.successful).length / this.fixHistory.length) * 100)
                : 0,
            recentFixes: this.fixHistory.slice(-10).map(f => ({
                unit: f.unit,
                successful: f.successful,
                attempts: f.attemptedFixes.length
            }))
        };
    }
}

export default AutoFixer;
