import fs from 'fs';
import path from 'path';

class SmartErrorAnalyzer {
    constructor() {
        this.errorPatterns = this.initializePatterns();
        this.analysisHistory = [];
    }

    initializePatterns() {
        return {
            syntax: {
                patterns: [
                    { regex: /SyntaxError:\s*(.+)/i, severity: 'critical' },
                    { regex: /Unexpected token\s*(.+)/i, severity: 'critical' },
                    { regex: /IndentationError:\s*(.+)/i, severity: 'critical' },
                    { regex: /EOL while scanning/i, severity: 'critical' },
                ],
                category: 'خطأ نحوي'
            },
            import: {
                patterns: [
                    { regex: /Cannot find module\s*['"]([^'"]+)['"]/i, severity: 'high' },
                    { regex: /ModuleNotFoundError:\s*(.+)/i, severity: 'high' },
                    { regex: /ImportError:\s*(.+)/i, severity: 'high' },
                    { regex: /No module named\s*(.+)/i, severity: 'high' },
                ],
                category: 'خطأ استيراد'
            },
            runtime: {
                patterns: [
                    { regex: /TypeError:\s*(.+)/i, severity: 'high' },
                    { regex: /ReferenceError:\s*(.+)/i, severity: 'high' },
                    { regex: /RangeError:\s*(.+)/i, severity: 'medium' },
                    { regex: /undefined is not a function/i, severity: 'high' },
                    { regex: /Cannot read propert/i, severity: 'high' },
                ],
                category: 'خطأ تشغيل'
            },
            network: {
                patterns: [
                    { regex: /ECONNREFUSED/i, severity: 'high' },
                    { regex: /ETIMEDOUT/i, severity: 'high' },
                    { regex: /ENOTFOUND/i, severity: 'high' },
                    { regex: /getaddrinfo/i, severity: 'high' },
                    { regex: /certificate/i, severity: 'medium' },
                ],
                category: 'خطأ شبكة'
            },
            permission: {
                patterns: [
                    { regex: /EACCES/i, severity: 'critical' },
                    { regex: /EPERM/i, severity: 'critical' },
                    { regex: /Permission denied/i, severity: 'critical' },
                    { regex: /access denied/i, severity: 'critical' },
                ],
                category: 'خطأ صلاحيات'
            },
            memory: {
                patterns: [
                    { regex: /heap out of memory/i, severity: 'critical' },
                    { regex: /allocation failed/i, severity: 'critical' },
                    { regex: /JavaScript heap/i, severity: 'critical' },
                    { regex: /MemoryError/i, severity: 'critical' },
                ],
                category: 'خطأ ذاكرة'
            },
            disk: {
                patterns: [
                    { regex: /ENOSPC/i, severity: 'critical' },
                    { regex: /disk full/i, severity: 'critical' },
                    { regex: /no space left/i, severity: 'critical' },
                ],
                category: 'خطأ قرص'
            },
            timeout: {
                patterns: [
                    { regex: /timed out/i, severity: 'high' },
                    { regex: /timeout/i, severity: 'high' },
                    { regex: /ETIMEDOUT/i, severity: 'high' },
                ],
                category: 'خطأ مهلة'
            }
        };
    }

    // تحليل خطأ واحد بعمق
    analyze(errorMessage, context = {}) {
        const analysis = {
            timestamp: new Date().toISOString(),
            rawError: errorMessage.substring(0, 500),
            category: 'unknown',
            severity: 'medium',
            rootCause: null,
            affectedComponent: null,
            suggestedFixes: [],
            confidence: 0,
            context: context
        };

        // البحث في الأنماط
        for (const [key, category] of Object.entries(this.errorPatterns)) {
            for (const pattern of category.patterns) {
                const match = errorMessage.match(pattern.regex);
                if (match) {
                    analysis.category = key;
                    analysis.categoryName = category.category;
                    analysis.severity = pattern.severity;
                    analysis.matchedPattern = pattern.regex.source;
                    analysis.matchedValue = match[1] || match[0];
                    break;
                }
            }
            if (analysis.category !== 'unknown') break;
        }

        // تحليل السبب الجذري
        analysis.rootCause = this.determineRootCause(analysis, errorMessage, context);
        
        // اقتراح إصلاحات
        analysis.suggestedFixes = this.generateFixes(analysis, context);
        
        // حساب الثقة
        analysis.confidence = this.calculateConfidence(analysis);

        // حفظ في السجل
        this.analysisHistory.push(analysis);
        if (this.analysisHistory.length > 100) {
            this.analysisHistory = this.analysisHistory.slice(-100);
        }

        return analysis;
    }

    // تحديد السبب الجذري
    determineRootCause(analysis, errorMessage, context) {
        const causes = {
            syntax: 'خطأ في كتابة الكود - غالباً قوس ناقص أو فاصلة منقوطة أو مسافة بادئة خاطئة.',
            import: 'اعتمادية مفقودة أو غير مثبتة. الحزمة غير موجودة في المسار.',
            runtime: 'استدعاء خاطئ - قد يكون المتغير غير معرف أو النوع غير متطابق.',
            network: 'فشل اتصال - الخادم غير متاح أو عنوان URL خاطئ أو مشكلة DNS.',
            permission: 'صلاحيات غير كافية - قد تحتاج sudo أو تغيير ملكية الملف.',
            memory: 'نفاد الذاكرة - البيانات كبيرة جداً أو هناك تسريب ذاكرة.',
            disk: 'مساحة القرص ممتلئة - احذف ملفات مؤقتة أو وسع المساحة.',
            timeout: 'تجاوز الوقت المسموح - العملية أبطأ من المتوقع.',
            unknown: 'سبب غير معروف - يحتاج تحقيق يدوي.'
        };

        // تحسين السبب بالسياق
        let cause = causes[analysis.category] || causes.unknown;

        if (context.filePath) {
            cause += `\nالملف المتأثر: ${context.filePath}`;
        }
        if (context.command) {
            cause += `\nالأمر المنفذ: ${context.command}`;
        }

        return cause;
    }

    // توليد اقتراحات الإصلاح
    generateFixes(analysis, context) {
        const fixes = [];

        switch (analysis.category) {
            case 'syntax':
                fixes.push({
                    action: 'check_syntax',
                    description: 'راجع السطر المذكور في رسالة الخطأ.',
                    command: null
                });
                fixes.push({
                    action: 'use_linter',
                    description: 'استخدم ESLint أو Pylint للتحقق من الأخطاء النحوية.',
                    command: context.projectType === 'python' ? 'pylint' : 'eslint'
                });
                break;

            case 'import':
                const moduleName = analysis.matchedValue;
                fixes.push({
                    action: 'install_package',
                    description: `ثبت الحزمة المفقودة: ${moduleName}`,
                    command: context.projectType === 'python' 
                        ? `pip install ${moduleName}`
                        : `npm install ${moduleName}`
                });
                fixes.push({
                    action: 'check_path',
                    description: 'تأكد من أن المسار صحيح وأن الملف موجود.',
                    command: null
                });
                break;

            case 'runtime':
                fixes.push({
                    action: 'check_types',
                    description: 'تحقق من أنواع المتغيرات وقيمها قبل الاستخدام.',
                    command: null
                });
                fixes.push({
                    action: 'add_null_check',
                    description: 'أضف تحقق من null/undefined قبل الاستدعاء.',
                    command: null
                });
                break;

            case 'network':
                fixes.push({
                    action: 'check_connection',
                    description: 'تحقق من اتصال الشبكة وأن الخادم متاح.',
                    command: 'ping -c 1 google.com'
                });
                fixes.push({
                    action: 'retry',
                    description: 'أعد المحاولة، قد يكون خطأ مؤقتاً.',
                    command: null
                });
                break;

            case 'permission':
                fixes.push({
                    action: 'fix_permissions',
                    description: 'أصلح صلاحيات الملف أو المجلد.',
                    command: context.filePath ? `chmod 755 ${context.filePath}` : null
                });
                break;

            case 'memory':
                fixes.push({
                    action: 'increase_memory',
                    description: 'زد ذاكرة Node.js: --max-old-space-size=4096',
                    command: 'node --max-old-space-size=4096'
                });
                fixes.push({
                    action: 'optimize_data',
                    description: 'عالج البيانات على دفعات بدلاً من تحميلها كلها.',
                    command: null
                });
                break;

            case 'timeout':
                fixes.push({
                    action: 'increase_timeout',
                    description: 'زد المهلة الزمنية للعملية.',
                    command: null
                });
                fixes.push({
                    action: 'optimize_performance',
                    description: 'حسن أداء الكود أو قسم العملية لخطوات أصغر.',
                    command: null
                });
                break;

            default:
                fixes.push({
                    action: 'manual_investigation',
                    description: 'يحتاج تحقيق يدوي. راجع السجلات كاملة.',
                    command: null
                });
        }

        // إضافة اقتراح عام
        fixes.push({
            action: 'check_logs',
            description: 'راجع السجلات الكاملة في logs/execution_log.json',
            command: null
        });

        return fixes;
    }

    // حساب درجة الثقة في التحليل
    calculateConfidence(analysis) {
        let confidence = 50; // درجة أساسية

        if (analysis.category !== 'unknown') confidence += 20;
        if (analysis.matchedValue) confidence += 15;
        if (analysis.suggestedFixes.length > 2) confidence += 10;
        if (analysis.context?.filePath) confidence += 5;

        return Math.min(confidence, 95); // أقصى ثقة 95% (نترك 5% للشك)
    }

    // تحليل مجموعة أخطاء
    analyzeBatch(errors) {
        return errors.map(error => {
            const errorMsg = typeof error === 'string' ? error : (error.message || error.stderr || JSON.stringify(error));
            return this.analyze(errorMsg, error.context || {});
        });
    }

    // تلخيص الأخطاء
    summarize(errors) {
        const analyses = this.analyzeBatch(errors);
        
        const summary = {
            totalErrors: analyses.length,
            byCategory: {},
            bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
            topFixes: [],
            averageConfidence: 0
        };

        analyses.forEach(a => {
            // تصنيف
            summary.byCategory[a.categoryName || a.category] = 
                (summary.byCategory[a.categoryName || a.category] || 0) + 1;
            
            // شدة
            if (summary.bySeverity[a.severity] !== undefined) {
                summary.bySeverity[a.severity]++;
            }

            // جمع الإصلاحات
            a.suggestedFixes.forEach(f => {
                const existing = summary.topFixes.find(tf => tf.action === f.action);
                if (existing) {
                    existing.count++;
                } else {
                    summary.topFixes.push({ action: f.action, description: f.description, count: 1 });
                }
            });

            summary.averageConfidence += a.confidence;
        });

        summary.averageConfidence = analyses.length > 0 
            ? Math.round(summary.averageConfidence / analyses.length) 
            : 0;

        // ترتيب الإصلاحات الأكثر شيوعاً
        summary.topFixes.sort((a, b) => b.count - a.count);
        summary.topFixes = summary.topFixes.slice(0, 5);

        // رسالة ملخصة
        const criticalCount = summary.bySeverity.critical || 0;
        const highCount = summary.bySeverity.high || 0;
        
        if (criticalCount > 0) {
            summary.verdict = `خطر: ${criticalCount} أخطاء حرجة تحتاج تدخلاً فورياً.`;
        } else if (highCount > 0) {
            summary.verdict = `تحذير: ${highCount} أخطاء عالية الخطورة. ينصح بالإصلاح قبل المتابعة.`;
        } else if (analyses.length > 0) {
            summary.verdict = `${analyses.length} أخطاء غير حرجة. يمكن متابعة العمل مع الحذر.`;
        } else {
            summary.verdict = 'لا توجد أخطاء. النظام نظيف.';
        }

        return summary;
    }

    // التنبؤ بالمشاكل المحتملة
    predictIssues(code, language = 'javascript') {
        const warnings = [];

        if (language === 'javascript' || language === 'js') {
            if (code.includes('var ') && !code.includes('let ') && !code.includes('const ')) {
                warnings.push({
                    type: 'best_practice',
                    message: 'استخدم let أو const بدلاً من var.',
                    severity: 'low'
                });
            }
            if (code.includes('==') && !code.includes('===')) {
                warnings.push({
                    type: 'potential_bug',
                    message: 'استخدم === بدلاً من == للمقارنة الدقيقة.',
                    severity: 'medium'
                });
            }
            if ((code.match(/console\.log/g) || []).length > 10) {
                warnings.push({
                    type: 'cleanup',
                    message: 'يوجد الكثير من console.log. نظفها قبل الإنتاج.',
                    severity: 'low'
                });
            }
            if (code.includes('eval(')) {
                warnings.push({
                    type: 'security',
                    message: 'استخدام eval خطر أمني. تجنبه.',
                    severity: 'high'
                });
            }
        }

        if (language === 'python' || language === 'py') {
            if (code.includes('except:') && !code.includes('except Exception')) {
                warnings.push({
                    type: 'best_practice',
                    message: 'تجنب except بدون تحديد نوع الخطأ.',
                    severity: 'medium'
                });
            }
            if ((code.match(/print\(/g) || []).length > 10) {
                warnings.push({
                    type: 'cleanup',
                    message: 'يوجد الكثير من print. نظفها قبل الإنتاج.',
                    severity: 'low'
                });
            }
        }

        return warnings;
    }

    // الحصول على إحصائيات التحليل
    getStats() {
        return {
            totalAnalyses: this.analysisHistory.length,
            recentCategories: this.analysisHistory.slice(-20).reduce((acc, a) => {
                acc[a.category] = (acc[a.category] || 0) + 1;
                return acc;
            }, {}),
            averageConfidence: this.analysisHistory.length > 0
                ? Math.round(this.analysisHistory.reduce((sum, a) => sum + a.confidence, 0) / this.analysisHistory.length)
                : 0
        };
    }
}

export default SmartErrorAnalyzer;
