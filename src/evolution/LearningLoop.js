const knowledgeBase = require('./KnowledgeBase');
const selfImprover = require('./SelfImprover');

const MAX_RETRIES = 1; // الحد الأقصى لإعادة المحاولة
const MAX_LOOP_ITERATIONS = 3; // الحد الأقصى لدورات التعلم

let loopCount = 0;
let sessionLessons = [];

async function learn(executionResult, observerStats) {
    loopCount++;
    sessionLessons = [];

    // 1. تحليل النتائج
    const plan = selfImprover.getImprovementPlan(executionResult, observerStats);
    
    // 2. تسجيل الدروس
    plan.lessonsLearned.forEach(lesson => {
        knowledgeBase.addLesson(lesson);
        sessionLessons.push(lesson);
    });

    return {
        loopIteration: loopCount,
        status: plan.status,
        shouldRetry: plan.shouldRetry && loopCount <= MAX_RETRIES,
        improvements: plan.improvements,
        lessonsThisSession: sessionLessons.length,
        recommendations: plan.recommendations,
        knowledgeBase: plan.knowledgeSummary
    };
}

function reset() {
    loopCount = 0;
    sessionLessons = [];
}

function getSessionSummary() {
    return {
        totalLoops: loopCount,
        totalLessons: sessionLessons.length,
        lessons: sessionLessons.slice(-5), // آخر 5 دروس
        knowledgeBase: knowledgeBase.getSummary()
    };
}

function shouldContinue() {
    return loopCount < MAX_LOOP_ITERATIONS;
}

module.exports = {
    learn,
    reset,
    getSessionSummary,
    shouldContinue,
    MAX_RETRIES,
    MAX_LOOP_ITERATIONS
};
