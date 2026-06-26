const agentFramework = require('./AgentFramework');
const agentValidator = require('./AgentValidator');

async function decide(goal, projectType, context = {}) {
    const decision = {
        useAgent: false,
        selectedAgent: null,
        reason: "",
        agentSuggestion: null,
        validationResult: null,
        finalAction: "use_internal_logic"
    };

    // 1. اختيار أفضل وكيل
    const selection = agentFramework.selectBestAgent(goal, projectType);
    
    if (!selection.selected) {
        decision.reason = selection.reason;
        decision.finalAction = "use_internal_logic";
        return decision;
    }

    decision.selectedAgent = selection.selected;
    decision.reason = selection.reason;

    // 2. محاولة استدعاء الوكيل
    try {
        const agentOutput = await agentFramework.executeAgent(
            selection.selected.id,
            goal,
            context
        );

        if (agentOutput.status === "unavailable") {
            decision.reason = agentOutput.message;
            decision.finalAction = "use_internal_logic";
            return decision;
        }

        // 3. التحقق من مخرجات الوكيل
        const validation = agentValidator.validateAgentOutput(
            selection.selected.id,
            agentOutput
        );

        decision.agentSuggestion = agentOutput.suggestion || agentOutput;
        decision.validationResult = validation;

        // 4. اتخاذ القرار النهائي
        if (validation.valid && validation.severity === "safe") {
            decision.useAgent = true;
            decision.finalAction = "use_agent_suggestion";
        } else if (validation.valid && validation.severity === "warning") {
            decision.useAgent = true;
            decision.finalAction = "use_agent_with_caution";
        } else {
            decision.useAgent = false;
            decision.finalAction = "reject_agent_use_internal";
            decision.reason = `تم رفض مقترح الوكيل: ${validation.issues.join('; ')}`;
        }

    } catch (error) {
        decision.reason = `فشل استدعاء الوكيل: ${error.message}`;
        decision.finalAction = "use_internal_logic";
    }

    return decision;
}

function shouldUseAgent(goalComplexity) {
    // تقدير تعقيد الهدف
    const wordCount = goalComplexity.split(/\s+/).length;
    
    if (wordCount < 5) return false;        // هدف بسيط
    if (wordCount < 15) return "optional";  // هدف متوسط
    return "recommended";                    // هدف معقد
}

function getDecisionSummary(decision) {
    return {
        استخدمنا_وكيل: decision.useAgent,
        الوكيل_المختار: decision.selectedAgent?.name || "لا يوجد",
        السبب: decision.reason,
        القرار_النهائي: decision.finalAction,
        حالة_التحقق: decision.validationResult?.severity || "لا يوجد",
        تحذيرات: decision.validationResult?.warnings || [],
        مشاكل: decision.validationResult?.issues || []
    };
}

module.exports = {
    decide,
    shouldUseAgent,
    getDecisionSummary
};
