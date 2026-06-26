function analyze(goal) {
    if (!goal || typeof goal !== 'string') {
        goal = "";
    }

    const trimmedGoal = goal.trim();
    const lowerGoal = trimmedGoal.toLowerCase();
    
    let clarity = "needs_refinement";
    let questions = [];
    let detectedKeywords = [];
    
    // كلمات مفتاحية للبحث عنها
    const targetKeywords = ["build", "create", "fix", "deploy", "بناء", "إنشاء", "أنشئ", "إصلاح", "نشر"];
    
    // استخراج الكلمات المفتاحية
    targetKeywords.forEach(kw => {
        if (lowerGoal.includes(kw)) {
            detectedKeywords.push(kw);
        }
    });

    // حساب عدد الكلمات لتقدير وجود "وصف" للمشروع
    const wordCount = trimmedGoal.split(/\s+/).length;

    if (trimmedGoal.length < 10) {
        clarity = "vague";
        questions = [
            "ما نوع المشروع الذي تريد بناءه؟",
            "ما اللغة أو التقنية التي تفضلها؟",
            "هل لديك متطلبات محددة؟"
        ];
    } else if (detectedKeywords.length > 0 && wordCount >= 4) {
        // إذا كان هناك كلمة مفتاحية وعدد الكلمات 4 فأكثر نعتبره هدفاً واضحاً لوجود وصف
        clarity = "clear";
    } else {
        clarity = "needs_refinement";
        questions = [
            "الهدف يحتاج إلى بعض التوضيح، هل يمكنك إضافة المزيد من التفاصيل التقنية أو الوظيفية؟"
        ];
    }

    return {
        clarity,
        questions,
        refinedGoal: trimmedGoal,
        detectedKeywords
    };
}

module.exports = {
    analyze
};
