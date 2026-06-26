const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// قاعدة الوكلاء المتاحين
const availableAgents = {
    aider: {
        name: "Aider",
        type: "code_generation",
        strengths: ["توليد كود", "تعديل كود", "إصلاح أخطاء"],
        available: false, // سيتغير عند تثبيته
        installCommand: "pip install aider-chat"
    },
    replit: {
        name: "Replit",
        type: "runtime",
        strengths: ["تشغيل أكواد", "بيئة تفاعلية", "نمذجة أولية"],
        available: false,
        installCommand: null
    },
    bolt: {
        name: "Bolt",
        type: "fullstack",
        strengths: ["تطوير كامل", "UI", "Backend"],
        available: false,
        installCommand: null
    },
    openhands: {
        name: "OpenHands",
        type: "complex_analysis",
        strengths: ["تحليل معقد", "مشاريع ضخمة", "تخطيط"],
        available: false,
        installCommand: null
    }
};

// التحقق من توفر وكيل
function isAgentAvailable(agentName) {
    const agent = availableAgents[agentName];
    if (!agent) return false;
    return agent.available;
}

// الحصول على قائمة الوكلاء المتاحين
function getAvailableAgents() {
    return Object.entries(availableAgents)
        .filter(([_, agent]) => agent.available)
        .map(([key, agent]) => ({
            id: key,
            name: agent.name,
            type: agent.type,
            strengths: agent.strengths
        }));
}

// اختيار أفضل وكيل للمهمة
function selectBestAgent(goal, projectType) {
    const available = getAvailableAgents();
    
    if (available.length === 0) {
        return { selected: null, reason: "لا يوجد وكلاء متاحون حالياً. استخدام المنطق الداخلي." };
    }

    // منطق اختيار بسيط
    let selected = null;
    let reason = "";

    if (projectType === "web_app" || projectType === "api") {
        const bolt = available.find(a => a.id === "bolt");
        if (bolt) {
            selected = bolt;
            reason = "Bolt مناسب لمشاريع الويب و API.";
        }
    }

    if (!selected && projectType === "script") {
        const aider = available.find(a => a.id === "aider");
        if (aider) {
            selected = aider;
            reason = "Aider مناسب للسكريبتات والأدوات.";
        }
    }

    if (!selected) {
        const aider = available.find(a => a.id === "aider");
        if (aider) {
            selected = aider;
            reason = "Aider هو الوكيل الوحيد المتاح.";
        }
    }

    return {
        selected: selected || null,
        reason: selected ? reason : "لم يتم العثور على وكيل مناسب. استخدام المنطق الداخلي.",
        allAvailable: available
    };
}

// تنفيذ وكيل (محاكاة - للتمديد المستقبلي)
async function executeAgent(agentName, goal, context) {
    if (!isAgentAvailable(agentName)) {
        return {
            status: "unavailable",
            agent: agentName,
            message: `الوكيل ${agentName} غير متاح حالياً.`,
            suggestion: null
        };
    }

    // في المستقبل: هنا يتم استدعاء الوكيل الحقيقي
    // حالياً: إرجاع مقترح تجريبي
    return {
        status: "success",
        agent: agentName,
        message: `تم استدعاء ${agentName} للهدف: ${goal}`,
        suggestion: {
            code: null,
            plan: null,
            explanation: "هذا مقترح تجريبي. سيتم تفعيل الاستدعاء الحقيقي عند تثبيت الوكيل."
        }
    };
}

// تثبيت وكيل
async function installAgent(agentName) {
    const agent = availableAgents[agentName];
    if (!agent) {
        return { status: "error", error: `الوكيل ${agentName} غير معروف.` };
    }

    if (!agent.installCommand) {
        return { status: "error", error: `لا يوجد أمر تثبيت للوكيل ${agentName}.` };
    }

    return new Promise((resolve) => {
        exec(agent.installCommand, { timeout: 60000 }, (error, stdout, stderr) => {
            if (error) {
                resolve({
                    status: "error",
                    error: `فشل تثبيت ${agentName}: ${stderr || error.message}`
                });
            } else {
                agent.available = true;
                resolve({
                    status: "success",
                    message: `تم تثبيت ${agentName} بنجاح.`,
                    stdout
                });
            }
        });
    });
}

// تسجيل وكيل جديد يدوياً
function registerAgent(id, config) {
    availableAgents[id] = {
        name: config.name || id,
        type: config.type || "unknown",
        strengths: config.strengths || [],
        available: config.available !== undefined ? config.available : true,
        installCommand: config.installCommand || null
    };
    return { status: "success", message: `تم تسجيل الوكيل: ${id}` };
}

module.exports = {
    getAvailableAgents,
    selectBestAgent,
    executeAgent,
    installAgent,
    registerAgent,
    isAgentAvailable,
    availableAgents
};
