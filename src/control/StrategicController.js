const goalAnalyzer = require('../strategy/GoalAnalyzer');
const solutionResearcher = require('../strategy/SolutionResearcher');
const strategyComparator = require('../strategy/StrategyComparator');
const executionPlanner = require('../strategy/ExecutionPlanner');
const executionEngine = require('../core/executionEngine');
const observer = require('../monitoring/observer');
const decisionEngine = require('../agents/DecisionEngine');
const knowledgeBase = require('../evolution/KnowledgeBase');
const learningLoop = require('../evolution/LearningLoop');
const semanticIndex = require('../integrity/SemanticIndex');
const integrityChecker = require('../integrity/IntegrityChecker');

async function execute(goal) {
    const startTime = Date.now();
    
    // a. Goal Analysis
    const analysis = goalAnalyzer.analyze(goal);
    observer.addLog({
        goal: goal,
        action: 'analyze_goal',
        status: analysis.clarity === 'clear' ? 'success' : 'pending',
        duration: Date.now() - startTime
    });

    if (analysis.clarity !== 'clear') {
        return {
            status: "needs_clarification",
            goal: goal,
            clarity: analysis.clarity,
            questions: analysis.questions,
            message: "الهدف غير واضح، يرجى الإجابة على الأسئلة التالية:"
        };
    }

    // b. Research
    const researchStart = Date.now();
    const researchResult = solutionResearcher.research(analysis.refinedGoal, analysis.detectedKeywords);
    observer.addLog({
        goal: goal,
        action: 'research_solution',
        status: 'success',
        duration: Date.now() - researchStart
    });

    // c. Compare Strategies
    const compareStart = Date.now();
    let comparisonResult;
    try {
        comparisonResult = strategyComparator.compare(analysis.refinedGoal, researchResult.projectType, researchResult.recommendedStructure);
    } catch (err) {
        // Fallback if strategyComparator is incomplete/missing
        comparisonResult = { recommendedStrategy: researchResult.projectType };
    }
    observer.addLog({
        goal: goal,
        action: 'compare_strategies',
        status: 'success',
        duration: Date.now() - compareStart
    });

    // 3.5 محاولة استخدام وكيل (اختياري)
    const agentDecision = await decisionEngine.decide(
        analysis.refinedGoal,
        researchResult.projectType,
        { comparison: comparisonResult, research: researchResult }
    );
    
    observer.addLog({
        action: "agent_decision",
        goal: analysis.refinedGoal,
        status: agentDecision.useAgent ? "agent_used" : "internal_logic",
        details: decisionEngine.getDecisionSummary(agentDecision),
        duration: 0
    });

    // إذا كان الوكيل اقترح شيء، نضيفه للسياق
    if (agentDecision.agentSuggestion && agentDecision.useAgent) {
        // في المستقبل: دمج مقترحات الوكيل في الخطة
        observer.addLog({
            action: "agent_suggestion",
            goal: analysis.refinedGoal,
            status: "received",
            suggestion: agentDecision.agentSuggestion,
            duration: 0
        });
    }

    // d. Planning
    const planStart = Date.now();
    const planResult = executionPlanner.plan(analysis.refinedGoal, comparisonResult.recommendedStrategy, researchResult.recommendedStructure);
    observer.addLog({
        goal: goal,
        action: 'execution_planning',
        status: 'success',
        duration: Date.now() - planStart
    });

    // e. Execution
    let completedSteps = 0;
    let failedSteps = 0;
    const results = [];

    for (const step of planResult.steps) {
        const stepStart = Date.now();
        let stepResult;

        try {
            if (step.action === 'create_directory') {
                stepResult = executionEngine.createDirectory(step.path);
            } else if (step.action === 'write_file') {
                stepResult = executionEngine.createFile(step.path, step.content);
            } else if (step.action === 'run_command') {
                stepResult = await executionEngine.runCommand(step.command);
            } else {
                stepResult = { status: 'error', error: 'Unknown action' };
            }
        } catch (error) {
            stepResult = { status: 'error', error: error.message };
        }

        const duration = Date.now() - stepStart;
        
        observer.addLog({
            goal: goal,
            action: step.action,
            command: step.command,
            path: step.path,
            status: stepResult.status,
            duration: duration,
            stderr: stepResult.stderr || stepResult.error,
            stdout: stepResult.stdout,
            exitCode: stepResult.exitCode
        });

        results.push({
            step: step.description,
            result: stepResult
        });

        if (stepResult.status === 'success') {
            completedSteps++;
        } else {
            failedSteps++;
        }
    }

    // 7. التعلم من النتائج
    const stats = observer.getStats();
    const learningResult = await learningLoop.learn(
        {
            goal: analysis.refinedGoal || goal,
            projectType: researchResult.projectType,
            strategy: comparisonResult?.recommendedStrategy || planResult.strategy,
            totalSteps: planResult.totalSteps,
            completedSteps,
            failedSteps,
            projectName: planResult.projectName || researchResult.projectType,
            results
        },
        stats
    );
    
    observer.addLog({
        action: "learning_loop",
        status: learningResult.status,
        details: learningResult,
        duration: 0
    });

    // 8. فهرسة الملفات المنشأة
    if (planResult.projectName || researchResult.projectType) {
        semanticIndex.indexAll();
        observer.addLog({
            action: "semantic_index",
            status: "completed",
            details: semanticIndex.getStats(),
            duration: 0
        });
    }
    
    // 9. فحص التطابق النهائي
    const integrityReport = await integrityChecker.runFullCheck();
    observer.addLog({
        action: "integrity_check",
        status: integrityReport.isClean ? "clean" : "issues_found",
        details: integrityReport,
        duration: integrityReport.duration || 0
    });
    
    // إذا كانت هناك مشاكل، حاول الإصلاح
    if (!integrityReport.isClean) {
        const repairResult = await integrityChecker.repair();
        observer.addLog({
            action: "integrity_repair",
            status: "completed",
            details: repairResult,
            duration: 0
        });
    }

    // f. Final Output
    return {
        status: "completed",
        goal: analysis.refinedGoal || goal,
        clarity: analysis.clarity,
        projectType: researchResult.projectType,
        strategy: planResult.strategy,
        reason: comparisonResult?.reason || "No explicit reason",
        projectName: planResult.projectName || researchResult.projectType,
        totalSteps: planResult.totalSteps,
        completedSteps: completedSteps,
        failedSteps: failedSteps,
        results: results,
        stats: stats,
        learning: {
            iteration: learningResult.loopIteration,
            lessonsLearned: learningResult.lessonsThisSession,
            shouldRetry: learningResult.shouldRetry,
            recommendations: learningResult.recommendations,
            knowledgeBase: learningResult.knowledgeBase
        },
        integrity: {
            isClean: integrityReport.isClean,
            totalIssues: integrityReport.totalIssues,
            summary: integrityReport.summary,
            healthReport: integrityChecker.getHealthReport()
        }
    };
}

module.exports = {
    execute
};
