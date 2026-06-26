const knowledgeBase = {
    web_app: {
        structure: ["public", "src/components", "src/pages", "src/styles"],
        libraries: ["react", "next.js", "tailwind css"]
    },
    api: {
        structure: ["src/routes", "src/controllers", "src/models", "src/middleware"],
        libraries: ["express", "fastify", "prisma"]
    },
    script: {
        structure: ["src"],
        libraries: ["fs", "path"]
    },
    unknown: {
        structure: [],
        libraries: []
    }
};

function research(goal, keywords) {
    if (!goal || typeof goal !== 'string') {
        goal = '';
    }
    
    const lowerGoal = goal.toLowerCase();
    let projectType = "unknown";
    
    // استنتاج نوع المشروع بناءً على محتوى الهدف
    if (
        lowerGoal.includes("web") || 
        lowerGoal.includes("site") || 
        lowerGoal.includes("frontend") || 
        lowerGoal.includes("موقع") || 
        lowerGoal.includes("واجهة") ||
        lowerGoal.includes("تطبيق ويب")
    ) {
        projectType = "web_app";
    } else if (
        lowerGoal.includes("api") || 
        lowerGoal.includes("server") || 
        lowerGoal.includes("backend") || 
        lowerGoal.includes("خادم") || 
        lowerGoal.includes("واجهة برمجة")
    ) {
        projectType = "api";
    } else if (
        lowerGoal.includes("script") || 
        lowerGoal.includes("tool") || 
        lowerGoal.includes("cli") || 
        lowerGoal.includes("أداة") || 
        lowerGoal.includes("سكريبت")
    ) {
        projectType = "script";
    }
    
    const recommendations = knowledgeBase[projectType];
    
    return {
        projectType: projectType,
        recommendedStructure: recommendations.structure,
        recommendedLibraries: recommendations.libraries
    };
}

module.exports = {
    research
};
