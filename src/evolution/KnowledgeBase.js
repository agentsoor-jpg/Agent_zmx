const fs = require('fs');
const path = require('path');

const KNOWLEDGE_FILE = path.resolve(process.cwd(), 'logs', 'knowledge_base.json');

let knowledgeBase = {
    version: "1.0",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    totalExecutions: 0,
    successfulPatterns: [],
    failurePatterns: [],
    projectTemplates: {},
    agentPerformance: {},
    lessons: [],
    stats: {
        totalSuccess: 0,
        totalFailure: 0,
        avgStepsPerProject: 0,
        mostUsedStrategy: null,
        bestProjectType: null
    }
};

// تحميل القاعدة من الملف
function load() {
    try {
        if (fs.existsSync(KNOWLEDGE_FILE)) {
            const data = fs.readFileSync(KNOWLEDGE_FILE, 'utf8');
            const loaded = JSON.parse(data);
            knowledgeBase = { ...knowledgeBase, ...loaded };
        }
    } catch (error) {
        console.log('[KnowledgeBase] بدء قاعدة معرفة جديدة.');
    }
    return knowledgeBase;
}

// حفظ القاعدة إلى الملف
function save() {
    try {
        knowledgeBase.updatedAt = new Date().toISOString();
        const dir = path.dirname(KNOWLEDGE_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(KNOWLEDGE_FILE, JSON.stringify(knowledgeBase, null, 2), 'utf8');
    } catch (error) {
        console.error('[KnowledgeBase] فشل حفظ القاعدة:', error.message);
    }
}

// تسجيل درس جديد
function addLesson(lesson) {
    knowledgeBase.lessons.push({
        id: knowledgeBase.lessons.length + 1,
        timestamp: new Date().toISOString(),
        ...lesson
    });
    
    // إبقاء آخر 100 درس فقط
    if (knowledgeBase.lessons.length > 100) {
        knowledgeBase.lessons = knowledgeBase.lessons.slice(-100);
    }
    
    save();
}

// تسجيل نمط ناجح
function addSuccessfulPattern(pattern) {
    const existing = knowledgeBase.successfulPatterns.find(
        p => p.projectType === pattern.projectType && p.strategy === pattern.strategy
    );
    
    if (existing) {
        existing.count = (existing.count || 1) + 1;
        existing.lastUsed = new Date().toISOString();
    } else {
        knowledgeBase.successfulPatterns.push({
            ...pattern,
            count: 1,
            firstSeen: new Date().toISOString(),
            lastUsed: new Date().toISOString()
        });
    }
    
    knowledgeBase.totalExecutions++;
    knowledgeBase.stats.totalSuccess++;
    updateStats();
    save();
}

// تسجيل نمط فاشل
function addFailurePattern(pattern) {
    const existing = knowledgeBase.failurePatterns.find(
        p => p.errorType === pattern.errorType && p.action === pattern.action
    );
    
    if (existing) {
        existing.count = (existing.count || 1) + 1;
        existing.lastSeen = new Date().toISOString();
        existing.solutions = [...new Set([...(existing.solutions || []), ...(pattern.solutions || [])])];
    } else {
        knowledgeBase.failurePatterns.push({
            ...pattern,
            count: 1,
            firstSeen: new Date().toISOString(),
            lastSeen: new Date().toISOString()
        });
    }
    
    knowledgeBase.totalExecutions++;
    knowledgeBase.stats.totalFailure++;
    updateStats();
    save();
}

// تحديث أداء وكيل
function updateAgentPerformance(agentName, performance) {
    if (!knowledgeBase.agentPerformance[agentName]) {
        knowledgeBase.agentPerformance[agentName] = {
            totalCalls: 0,
            successRate: 0,
            avgQuality: 0,
            lastUsed: null
        };
    }
    
    const agent = knowledgeBase.agentPerformance[agentName];
    agent.totalCalls++;
    agent.successRate = ((agent.successRate * (agent.totalCalls - 1)) + (performance.success ? 1 : 0)) / agent.totalCalls;
    agent.avgQuality = ((agent.avgQuality * (agent.totalCalls - 1)) + (performance.quality || 0.5)) / agent.totalCalls;
    agent.lastUsed = new Date().toISOString();
    
    save();
}

// حفظ قالب مشروع ناجح
function saveProjectTemplate(projectType, structure, files) {
    knowledgeBase.projectTemplates[projectType] = {
        structure,
        fileCount: files.length,
        lastUpdated: new Date().toISOString(),
        usageCount: (knowledgeBase.projectTemplates[projectType]?.usageCount || 0) + 1
    };
    save();
}

// البحث عن حلول لمشكلة
function findSolutions(errorType, action) {
    const pattern = knowledgeBase.failurePatterns.find(
        p => p.errorType === errorType || p.action === action
    );
    return pattern?.solutions || [];
}

// البحث عن أفضل استراتيجية لنوع مشروع
function findBestStrategy(projectType) {
    const patterns = knowledgeBase.successfulPatterns.filter(
        p => p.projectType === projectType
    );
    
    if (patterns.length === 0) return null;
    
    return patterns.sort((a, b) => b.count - a.count)[0];
}

// الحصول على توصيات للهدف
function getRecommendations(goal, projectType) {
    const recommendations = [];
    
    // أفضل استراتيجية
    const bestStrategy = findBestStrategy(projectType);
    if (bestStrategy) {
        recommendations.push({
            type: "strategy",
            message: `أفضل استراتيجية لـ ${projectType} هي: ${bestStrategy.strategy} (نجحت ${bestStrategy.count} مرات)`
        });
    }
    
    // قالب مشروع
    if (knowledgeBase.projectTemplates[projectType]) {
        recommendations.push({
            type: "template",
            message: `يوجد قالب جاهز لـ ${projectType} استخدم ${knowledgeBase.projectTemplates[projectType].usageCount} مرات`
        });
    }
    
    // تحذيرات من أخطاء سابقة
    const relevantFailures = knowledgeBase.failurePatterns.filter(
        p => p.projectType === projectType
    );
    if (relevantFailures.length > 0) {
        recommendations.push({
            type: "warning",
            message: `انتبه: ${relevantFailures.length} أنماط فشل سابقة في هذا النوع من المشاريع`
        });
    }
    
    return recommendations;
}

// تحديث الإحصائيات
function updateStats() {
    const stats = knowledgeBase.stats;
    stats.totalExecutions = knowledgeBase.totalExecutions;
    
    // الاستراتيجية الأكثر استخداماً
    const strategyCounts = {};
    knowledgeBase.successfulPatterns.forEach(p => {
        strategyCounts[p.strategy] = (strategyCounts[p.strategy] || 0) + p.count;
    });
    stats.mostUsedStrategy = Object.entries(strategyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    
    // أفضل نوع مشروع
    const typeCounts = {};
    knowledgeBase.successfulPatterns.forEach(p => {
        typeCounts[p.projectType] = (typeCounts[p.projectType] || 0) + p.count;
    });
    stats.bestProjectType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

// تصدير ملخص
function getSummary() {
    return {
        totalExecutions: knowledgeBase.totalExecutions,
        successRate: knowledgeBase.totalExecutions > 0 
            ? Math.round((knowledgeBase.stats.totalSuccess / knowledgeBase.totalExecutions) * 100) 
            : 0,
        topStrategies: knowledgeBase.successfulPatterns
            .sort((a, b) => b.count - a.count)
            .slice(0, 3)
            .map(p => ({ strategy: p.strategy, projectType: p.projectType, count: p.count })),
        commonFailures: knowledgeBase.failurePatterns
            .sort((a, b) => b.count - a.count)
            .slice(0, 3)
            .map(p => ({ errorType: p.errorType, action: p.action, count: p.count })),
        agentPerformance: knowledgeBase.agentPerformance,
        lessonsCount: knowledgeBase.lessons.length
    };
}

// تحميل القاعدة عند بدء التشغيل
load();

module.exports = {
    addLesson,
    addSuccessfulPattern,
    addFailurePattern,
    updateAgentPerformance,
    saveProjectTemplate,
    findSolutions,
    findBestStrategy,
    getRecommendations,
    getSummary,
    load,
    save,
    knowledgeBase
};
