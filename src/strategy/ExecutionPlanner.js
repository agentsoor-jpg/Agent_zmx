function plan(goal, strategy, recommendedStructure) {
    const steps = [];
    let stepCounter = 0;

    // إنشاء مجلد المشروع الرئيسي
    const projectName = goal
        .toLowerCase()
        .replace(/[^a-z0-9\u0600-\u06FF\s]/g, '')
        .trim()
        .replace(/\s+/g, '_') || 'new_project';

    steps.push({
        id: ++stepCounter,
        action: "create_directory",
        path: projectName,
        description: `إنشاء مجلد المشروع الرئيسي: ${projectName}`
    });

    // إنشاء المجلدات الهيكلية
    recommendedStructure.forEach(dir => {
        steps.push({
            id: ++stepCounter,
            action: "create_directory",
            path: `${projectName}/${dir}`,
            description: `إنشاء مجلد: ${dir}`
        });
    });

    // إنشاء ملف package.json أساسي
    steps.push({
        id: ++stepCounter,
        action: "write_file",
        path: `${projectName}/package.json`,
        content: JSON.stringify({
            name: projectName,
            version: "1.0.0",
            description: goal,
            main: "index.js",
            scripts: {
                start: "node index.js"
            }
        }, null, 2),
        description: "إنشاء ملف package.json"
    });

    // إنشاء ملف index.js أساسي
    steps.push({
        id: ++stepCounter,
        action: "write_file",
        path: `${projectName}/index.js`,
        content: `// ${goal}\nconsole.log('Project: ${projectName} is running!');`,
        description: "إنشاء ملف index.js الأساسي"
    });

    // إنشاء README.md
    steps.push({
        id: ++stepCounter,
        action: "write_file",
        path: `${projectName}/README.md`,
        content: `# ${projectName}\n\n${goal}\n\n## هيكل المشروع\n\n\`\`\`\n${recommendedStructure.map(d => '├── ' + d).join('\n')}\n\`\`\`\n`,
        description: "إنشاء ملف README.md"
    });

    return {
        goal: goal,
        strategy: strategy.name,
        projectName: projectName,
        totalSteps: steps.length,
        steps: steps
    };
}

module.exports = { plan };
