export default class MassiveProjectAnalyzer {
    constructor() {
        this.layerTemplates = {
            frontend: {
                name: 'الواجهة الأمامية',
                folders: ['components', 'pages', 'hooks', 'services', 'styles', 'assets', 'utils', 'context', 'types', 'tests'],
                files: ['App.jsx', 'index.jsx', 'routes.jsx', 'package.json', '.env.example', 'README.md'],
                typicalFiles: 50,
                dependencies: ['backend']
            },
            backend: {
                name: 'الواجهة الخلفية',
                folders: ['controllers', 'models', 'routes', 'middleware', 'services', 'utils', 'config', 'tests', 'validators'],
                files: ['server.js', 'package.json', '.env.example', 'README.md'],
                typicalFiles: 40,
                dependencies: ['database']
            },
            database: {
                name: 'قاعدة البيانات',
                folders: ['migrations', 'seeds', 'models', 'schemas'],
                files: ['connection.js', 'schema.sql', 'README.md'],
                typicalFiles: 15,
                dependencies: []
            },
            mobile: {
                name: 'تطبيق الجوال',
                folders: ['screens', 'components', 'navigation', 'services', 'hooks', 'assets', 'utils', 'types'],
                files: ['App.tsx', 'package.json', 'app.json', 'README.md'],
                typicalFiles: 60,
                dependencies: ['backend']
            },
            shared: {
                name: 'مكتبة مشتركة',
                folders: ['types', 'utils', 'constants', 'validators', 'tests'],
                files: ['index.ts', 'package.json', 'README.md'],
                typicalFiles: 25,
                dependencies: []
            },
            infrastructure: {
                name: 'البنية التحتية',
                folders: ['docker', 'kubernetes', 'terraform', 'scripts', 'config'],
                files: ['docker-compose.yml', 'Dockerfile', 'README.md'],
                typicalFiles: 20,
                dependencies: []
            }
        };

        this.complexityLevels = {
            small: { maxFiles: 50, maxLines: 2000, layers: 1 },
            medium: { maxFiles: 200, maxLines: 10000, layers: 2 },
            large: { maxFiles: 600, maxLines: 20000, layers: 3 },
            massive: { maxFiles: 1000, maxLines: 30000, layers: 5 },
            enterprise: { maxFiles: 2000, maxLines: 50000, layers: 7 }
        };
    }

    // تحليل الهدف وتقدير حجم المشروع
    analyze(goal) {
        const analysis = {
            goal,
            timestamp: new Date().toISOString(),
            complexity: this.estimateComplexity(goal),
            recommendedLayers: [],
            estimatedFileCount: 0,
            estimatedLineCount: 0,
            buildStrategy: null,
            riskFactors: [],
            timeline: null
        };

        // تقدير التعقيد
        analysis.complexity = this.estimateComplexity(goal);

        // تحديد الطبقات المطلوبة
        analysis.recommendedLayers = this.recommendLayers(goal);

        // تقدير عدد الملفات
        analysis.estimatedFileCount = this.estimateFileCount(analysis.recommendedLayers, analysis.complexity);

        // تقدير عدد الأسطر
        analysis.estimatedLineCount = this.estimateLineCount(analysis.estimatedFileCount, analysis.complexity);

        // اختيار استراتيجية البناء
        analysis.buildStrategy = this.chooseBuildStrategy(analysis);

        // عوامل الخطر
        analysis.riskFactors = this.identifyRisks(analysis);

        // جدول زمني تقديري
        analysis.timeline = this.estimateTimeline(analysis);

        return analysis;
    }

    // تقدير تعقيد المشروع
    estimateComplexity(goal) {
        const lowerGoal = goal.toLowerCase();
        const wordCount = goal.split(/\s+/).length;

        if (wordCount > 30 || 
            lowerGoal.includes('enterprise') || 
            lowerGoal.includes('microservices') ||
            lowerGoal.includes('نظام مؤسسي') ||
            lowerGoal.includes('منصة')) {
            return 'enterprise';
        }
        if (wordCount > 20 || 
            lowerGoal.includes('massive') || 
            lowerGoal.includes('large') ||
            lowerGoal.includes('ضخم') ||
            lowerGoal.includes('كامل') && lowerGoal.includes('متكامل')) {
            return 'massive';
        }
        if (wordCount > 15 || 
            lowerGoal.includes('fullstack') || 
            lowerGoal.includes('complete') ||
            lowerGoal.includes('app') && lowerGoal.includes('backend')) {
            return 'large';
        }
        if (wordCount > 10 || 
            lowerGoal.includes('backend') || 
            lowerGoal.includes('frontend') ||
            lowerGoal.includes('api') && lowerGoal.includes('database')) {
            return 'medium';
        }
        return 'small';
    }

    // التوصية بالطبقات
    recommendLayers(goal) {
        const lowerGoal = goal.toLowerCase();
        const layers = [];

        if (lowerGoal.includes('web') || lowerGoal.includes('frontend') || lowerGoal.includes('ui') || lowerGoal.includes('واجهة') || lowerGoal.includes('موقع')) {
            layers.push('frontend');
        }
        if (lowerGoal.includes('api') || lowerGoal.includes('backend') || lowerGoal.includes('server') || lowerGoal.includes('خادم') || lowerGoal.includes('خلفية')) {
            layers.push('backend');
        }
        if (lowerGoal.includes('database') || lowerGoal.includes('data') || lowerGoal.includes('sql') || lowerGoal.includes('mongodb') || lowerGoal.includes('قاعدة بيانات')) {
            layers.push('database');
        }
        if (lowerGoal.includes('mobile') || lowerGoal.includes('ios') || lowerGoal.includes('android') || lowerGoal.includes('جوال') || lowerGoal.includes('تطبيق')) {
            layers.push('mobile');
        }
        if (lowerGoal.includes('shared') || lowerGoal.includes('common') || lowerGoal.includes('مشترك') || lowerGoal.includes('monorepo')) {
            layers.push('shared');
        }
        if (lowerGoal.includes('docker') || lowerGoal.includes('deploy') || lowerGoal.includes('kubernetes') || lowerGoal.includes('infrastructure') || lowerGoal.includes('نشر')) {
            layers.push('infrastructure');
        }

        // إذا لم يتم تحديد طبقات، استخدم frontend كافتراضي
        if (layers.length === 0) {
            layers.push('frontend');
        }

        return layers;
    }

    // تقدير عدد الملفات
    estimateFileCount(layers, complexity) {
        const level = this.complexityLevels[complexity];
        let total = 0;

        layers.forEach(layer => {
            const template = this.layerTemplates[layer];
            if (template) {
                total += template.typicalFiles * (Object.keys(this.complexityLevels).indexOf(complexity) + 1);
            }
        });

        // حد أدنى وأقصى
        return Math.max(level.maxFiles * 0.5, Math.min(total, level.maxFiles));
    }

    // تقدير عدد الأسطر
    estimateLineCount(fileCount, complexity) {
        const level = this.complexityLevels[complexity];
        const avgLinesPerFile = level.maxLines / level.maxFiles;
        return Math.round(fileCount * avgLinesPerFile);
    }

    // اختيار استراتيجية البناء
    chooseBuildStrategy(analysis) {
        if (analysis.complexity === 'enterprise' || analysis.complexity === 'massive') {
            return {
                name: 'الاستراتيجية التدريجية المتوازية',
                description: 'بناء كل طبقة على حدة، مع اختبارها قبل الانتقال للتالية. الطبقات المستقلة تُبنى بالتوازي.',
                phases: analysis.recommendedLayers.map((layer, index) => ({
                    phase: index + 1,
                    layer: this.layerTemplates[layer]?.name || layer,
                    parallel: this.canBeParallel(layer, analysis.recommendedLayers),
                    estimatedFiles: this.layerTemplates[layer]?.typicalFiles || 50
                }))
            };
        }
        return {
            name: 'الاستراتيجية المتسلسلة',
            description: 'بناء الطبقات واحدة تلو الأخرى.',
            phases: analysis.recommendedLayers.map((layer, index) => ({
                phase: index + 1,
                layer: this.layerTemplates[layer]?.name || layer,
                estimatedFiles: this.layerTemplates[layer]?.typicalFiles || 30
            }))
        };
    }

    // هل يمكن بناء الطبقة بالتوازي؟
    canBeParallel(layer, allLayers) {
        const template = this.layerTemplates[layer];
        if (!template || !template.dependencies) return true;
        return template.dependencies.every(dep => !allLayers.includes(dep));
    }

    // تحديد المخاطر
    identifyRisks(analysis) {
        const risks = [];

        if (analysis.complexity === 'enterprise' || analysis.complexity === 'massive') {
            risks.push({
                risk: 'فقدان التماسك',
                severity: 'high',
                mitigation: 'استخدم طبقة shared للأنواع والثوابت المشتركة.'
            });
            risks.push({
                risk: 'تضارب التبعيات',
                severity: 'medium',
                mitigation: 'استخدم monorepo مع workspace لإدارة التبعيات.'
            });
        }
        if (analysis.recommendedLayers.length > 3) {
            risks.push({
                risk: 'تعقيد التكامل',
                severity: 'medium',
                mitigation: 'ابنِ واختبر كل طبقة بشكل مستقل أولاً.'
            });
        }
        if (analysis.estimatedFileCount > 600) {
            risks.push({
                risk: 'اختناق في إنشاء الملفات',
                severity: 'medium',
                mitigation: 'استخدم إنشاء متوازي مع مراقبة الأداء.'
            });
        }

        return risks;
    }

    // تقدير الجدول الزمني
    estimateTimeline(analysis) {
        const phases = analysis.buildStrategy?.phases?.length || 1;
        const timePerPhase = analysis.complexity === 'enterprise' ? 120 : 
                             analysis.complexity === 'massive' ? 90 :
                             analysis.complexity === 'large' ? 60 : 30;

        return {
            totalPhases: phases,
            estimatedMinutes: phases * timePerPhase,
            estimatedFormatted: this.formatTime(phases * timePerPhase)
        };
    }

    formatTime(minutes) {
        if (minutes < 60) return `${minutes} دقيقة`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours} ساعة و ${mins} دقيقة` : `${hours} ساعة`;
    }

    // توليد خطة بناء تفصيلية لمشروع ضخم
    generateBuildPlan(goal) {
        const analysis = this.analyze(goal);
        
        const plan = {
            analysis,
            projectName: this.generateProjectName(goal),
            layers: [],
            totalEstimatedFiles: 0,
            totalEstimatedLines: 0,
            buildOrder: []
        };

        // تفصيل كل طبقة
        analysis.recommendedLayers.forEach(layerId => {
            const template = this.layerTemplates[layerId];
            if (!template) return;

            const layerPlan = {
                id: layerId,
                name: template.name,
                folders: template.folders,
                coreFiles: template.files,
                estimatedAdditionalFiles: this.calculateAdditionalFiles(template, analysis.complexity),
                dependencies: template.dependencies
            };

            plan.layers.push(layerPlan);
            plan.totalEstimatedFiles += layerPlan.folders.length + layerPlan.coreFiles.length + layerPlan.estimatedAdditionalFiles;
        });

        plan.totalEstimatedLines = this.estimateLineCount(plan.totalEstimatedFiles, analysis.complexity);
        plan.buildOrder = analysis.buildStrategy.phases;

        return plan;
    }

    // حساب الملفات الإضافية بناءً على التعقيد
    calculateAdditionalFiles(template, complexity) {
        const multiplier = {
            small: 0.5,
            medium: 1,
            large: 2,
            massive: 4,
            enterprise: 8
        };
        return Math.round((template.typicalFiles - template.files.length) * (multiplier[complexity] || 1));
    }

    // توليد اسم المشروع
    generateProjectName(goal) {
        return goal
            .toLowerCase()
            .replace(/[^a-z0-9\u0600-\u06FF\s]/g, '')
            .trim()
            .replace(/\s+/g, '_')
            .substring(0, 60) || 'massive_project';
    }

    // الحصول على قدرات النظام
    getCapabilities() {
        return {
            supportedLayers: Object.keys(this.layerTemplates),
            complexityLevels: Object.keys(this.complexityLevels).map(k => ({
                name: k,
                maxFiles: this.complexityLevels[k].maxFiles,
                maxLines: this.complexityLevels[k].maxLines
            })),
            maxSupported: {
                files: 2000,
                lines: 50000,
                layers: 7
            }
        };
    }
}
