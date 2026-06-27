const solutionResearcher = require('./SolutionResearcher');

function plan(goal, strategy, recommendedStructure, starterCode = {}) {
    const steps = [];
    let stepCounter = 0;

    const projectName = goal
        .toLowerCase()
        .replace(/[^a-z0-9\u0600-\u06FF\s]/g, '')
        .trim()
        .replace(/\s+/g, '_')
        .substring(0, 50) || 'new_project';

    // إنشاء مجلد المشروع
    steps.push({
        id: ++stepCounter,
        action: "create_directory",
        path: projectName,
        description: `إنشاء مجلد المشروع: ${projectName}`
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

    // إنشاء ملفات starterCode الحقيقية
    if (starterCode && Object.keys(starterCode).length > 0) {
        Object.entries(starterCode).forEach(([filePath, content]) => {
            steps.push({
                id: ++stepCounter,
                action: "write_file",
                path: `${projectName}/${filePath}`,
                content: content,
                description: `إنشاء ملف: ${filePath}`
            });
        });
    }

    // إنشاء package.json
    steps.push({
        id: ++stepCounter,
        action: "write_file",
        path: `${projectName}/package.json`,
        content: JSON.stringify({
            name: projectName,
            version: "1.0.0",
            description: goal,
            main: "src/index.js",
            scripts: {
                start: "node src/index.js",
                dev: "node src/index.js",
                test: "node tests/test.js"
            },
            dependencies: {},
            devDependencies: {}
        }, null, 2),
        description: "إنشاء ملف package.json"
    });

    // إنشاء README.md
    steps.push({
        id: ++stepCounter,
        action: "write_file",
        path: `${projectName}/README.md`,
        content: `# ${projectName}\n\n${goal}\n\n## هيكل المشروع\n\n\`\`\`\n${recommendedStructure.map(d => '├── ' + d).join('\n')}\n\`\`\`\n\n## التشغيل\n\n\`\`\`bash\nnpm install\nnpm start\n\`\`\`\n\n---\n*تم الإنشاء بواسطة CoreFlow*\n`,
        description: "إنشاء ملف README.md"
    });

    // إنشاء .gitignore
    steps.push({
        id: ++stepCounter,
        action: "write_file",
        path: `${projectName}/.gitignore`,
        content: "node_modules/\n.env\n*.log\ndist/\nbuild/\n.DS_Store\n",
        description: "إنشاء ملف .gitignore"
    });

    return {
        goal: goal,
        strategy: strategy.name || strategy,
        projectName: projectName,
        totalSteps: steps.length,
        steps: steps
    };
}

module.exports = { plan };
