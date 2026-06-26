function compare(goal, projectType, recommendedStructure) {
    // الاستراتيجية A: آمنة وتدريجية
    const strategyA = {
        name: "الاستراتيجية الآمنة (التدريجية)",
        description: "بناء الهيكل العظمي أولاً، ثم الملفات الأساسية، ثم المنطق البرمجي. كل مرحلة تُختبر قبل الانتقال للتالية.",
        pros: ["أمان عالي", "تتبع سهل للأخطاء", "لا تراكم للأخطاء"],
        cons: ["أبطأ في التنفيذ"],
        phases: [
            { name: "بناء الهيكل", steps: ["إنشاء المجلدات الرئيسية"] },
            { name: "الملفات الأساسية", steps: ["إنشاء ملفات الإعدادات والاعتماديات"] },
            { name: "المنطق البرمجي", steps: ["كتابة الكود الفعلي"] },
            { name: "الاختبار", steps: ["تشغيل المشروع والتأكد من عمله"] }
        ]
    };

    // الاستراتيجية B: سريعة وشاملة
    const strategyB = {
        name: "الاستراتيجية السريعة (الشاملة)",
        description: "إنشاء كل الملفات والمجلدات دفعة واحدة بمحتوى أولي، ثم التعديل والتحسين. مناسبة للمشاريع الصغيرة.",
        pros: ["سرعة عالية", "إنجاز فوري للهيكل"],
        cons: ["قد تحتاج تعديلات كثيرة لاحقاً", "صعوبة تتبع الأخطاء"],
        phases: [
            { name: "الإنشاء الشامل", steps: ["إنشاء كل المجلدات والملفات دفعة واحدة"] },
            { name: "التعديل والتحسين", steps: ["إصلاح الأخطاء وتعديل المحتوى"] },
            { name: "الاختبار", steps: ["تشغيل المشروع والتأكد من عمله"] }
        ]
    };

    // اختيار التوصية بناءً على حجم المشروع
    const totalStructureItems = recommendedStructure ? recommendedStructure.length : 0;
    let recommended, reason;

    if (totalStructureItems <= 3) {
        recommended = strategyB;
        reason = "المشروع صغير أو متوسط، الاستراتيجية السريعة أكثر كفاءة.";
    } else {
        recommended = strategyA;
        reason = "المشروع كبير ومعقد، الاستراتيجية الآمنة تضمن جودة أعلى.";
    }

    return {
        strategies: [strategyA, strategyB],
        recommendedStrategy: recommended,
        recommended: recommended,
        reason: reason
    };
}

module.exports = { compare };
