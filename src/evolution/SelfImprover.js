const knowledgeBase = require('./KnowledgeBase');

function analyzeExecution(result, observerStats) {
    const improvements = [];
    const lessons = [];
    
    // 1. تحليل الفشل
    if (result.failedSteps > 0) {
        result.results?.forEach(r => {
            if (r.result?.status === "error") {
                const lesson = {
                    type: "failure_analysis",
                    goal: result.goal,
                    projectType: result.projectType,
                    action: r.action,
                    path: r.path,
                    error: r.result?.stderr || r.result?.error || "خطأ غير معروف",
                    description: r.description
                };
                lessons.push(lesson);
                
                // تسجيل نمط الفشل
                knowledgeBase.addFailurePattern({
                    errorType: r.result?.stderr ? "runtime_error" : "execution_error",
                    action: r.action,
                    projectType: result.projectType,
                    description: r.description,
                    solutions: generateSolutions(r)
                });
            }
        });
    }

    // 2. تحليل الأداء
    if (observerStats && observerStats.avgDuration > 1000) {
        improvements.push({
            type: "performance",
            message: `متوسط وقت التنفيذ مرتفع (${Math.round(observerStats.avgDuration)}ms). ينصح بتحسين الأوامر.`,
            priority: "medium"
        });
    }

    // 3. تحليل النجاح
    if (result.failedSteps === 0 && result.completedSteps > 0) {
        knowledgeBase.addSuccessfulPattern({
            projectType: result.projectType,
            strategy: result.strategy,
            stepCount: result.totalSteps,
            goal: result.goal
        });
        
        lessons.push({
            type: "success_pattern",
            goal: result.goal,
            projectType: result.projectType,
            strategy: result.strategy,
            steps: result.totalSteps
        });

        // حفظ قالب إذا كان المشروع ناجحاً
        if (result.results && result.projectName) {
            const files = result.results
                .filter(r => r.path)
                .map(r => r.path);
            
            knowledgeBase.saveProjectTemplate(
                result.projectType,
                extractStructure(files),
                files
            );
        }
    }

    // 4. توصيات
    const recommendations = knowledgeBase.getRecommendations(
        result.goal,
        result.projectType
    );

    return {
        improvements,
        lessons,
        recommendations,
        summary: knowledgeBase.getSummary()
    };
}

function generateSolutions(failedStep) {
    const solutions = [];
    
    if (failedStep.action === "run_command") {
        solutions.push("تحقق من تثبيت الاعتماديات المطلوبة.");
        solutions.push("تأكد من وجود الملف المطلوب تشغيله.");
        solutions.push("جرب تشغيل الأمر يدوياً لمعرفة الخطأ.");
    }
    
    if (failedStep.action === "write_file") {
        solutions.push("تأكد من صلاحيات الكتابة في المجلد.");
        solutions.push("تحقق من عدم وجود ملف بنفس الاسم مفتوح.");
    }
    
    if (failedStep.action === "create_directory") {
        solutions.push("تأكد من صلاحيات إنشاء المجلدات.");
        solutions.push("تحقق من عدم وجود مجلد بنفس الاسم.");
    }
    
    return solutions;
}

function extractStructure(files) {
    const structure = [];
    files.forEach(file => {
        const parts = file.split('/');
        for (let i = 1; i < parts.length; i++) {
            const dir = parts.slice(0, i).join('/');
            if (!structure.includes(dir)) {
                structure.push(dir);
            }
        }
    });
    return structure;
}

function shouldRetry(result) {
    // هل نعيد المحاولة؟
    if (result.failedSteps === 0) return false;
    
    const failureRate = result.failedSteps / result.totalSteps;
    
    // إذا كانت نسبة الفشل أقل من 30%، نعيد المحاولة مرة واحدة
    return failureRate <= 0.3;
}

function getImprovementPlan(result, observerStats) {
    const analysis = analyzeExecution(result, observerStats);
    
    return {
        status: result.failedSteps === 0 ? "success" : "needs_improvement",
        shouldRetry: shouldRetry(result),
        improvements: analysis.improvements,
        lessonsLearned: analysis.lessons,
        recommendations: analysis.recommendations,
        knowledgeSummary: analysis.summary
    };
}

module.exports = {
    analyzeExecution,
    shouldRetry,
    getImprovementPlan
};
