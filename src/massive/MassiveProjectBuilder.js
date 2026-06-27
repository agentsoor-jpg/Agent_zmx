import executionEngine from '../core/executionEngine.js';
import observer from '../monitoring/observer.js';
import MassiveProjectAnalyzer from './MassiveProjectAnalyzer.js';
import path from 'path';
import fs from 'fs';

const WORKSPACE_DIR = path.resolve(process.cwd(), 'workspace_run');

export default class MassiveProjectBuilder {
    constructor() {
        this.analyzer = new MassiveProjectAnalyzer();
        this.buildProgress = null;
        this.buildStats = {
            totalFiles: 0,
            createdFiles: 0,
            createdFolders: 0,
            failedItems: 0,
            errors: []
        };
    }

    // بناء مشروع ضخم
    async build(goal, options = {}) {
        const startTime = Date.now();
        this.buildStats = {
            totalFiles: 0,
            createdFiles: 0,
            createdFolders: 0,
            failedItems: 0,
            errors: []
        };

        // 1. تحليل المشروع
        const plan = this.analyzer.generateBuildPlan(goal);
        
        console.log(`\n🏗️ بدء بناء مشروع ضخم: ${plan.projectName}`);
        console.log(`📊 تقدير: ${plan.totalEstimatedFiles}+ ملف، ${plan.totalEstimatedLines}+ سطر`);
        console.log(`📋 الطبقات: ${plan.layers.map(l => l.name).join(' → ')}`);

        // 2. إنشاء مجلد المشروع
        const projectPath = path.join(WORKSPACE_DIR, plan.projectName);
        executionEngine.createDirectory(plan.projectName);

        // 3. بناء كل طبقة
        for (const phase of plan.buildOrder) {
            const layer = plan.layers.find(l => l.id === phase.layer);
            if (!layer) continue;

            console.log(`\n📦 بناء طبقة: ${layer.name}...`);
            await this.buildLayer(plan.projectName, layer, plan);
        }

        // 4. إنشاء ملفات التكامل
        await this.createIntegrationFiles(plan.projectName, plan);

        // 5. إنشاء ملف README شامل
        await this.createComprehensiveReadme(plan.projectName, plan, goal);

        const totalDuration = Date.now() - startTime;

        const result = {
            status: this.buildStats.failedItems === 0 ? 'success' : 'partial',
            projectName: plan.projectName,
            plan: {
                complexity: plan.analysis.complexity,
                layers: plan.layers.length,
                estimatedFiles: plan.totalEstimatedFiles
            },
            actual: {
                filesCreated: this.buildStats.createdFiles,
                foldersCreated: this.buildStats.createdFolders,
                failedItems: this.buildStats.failedItems,
                totalItems: this.buildStats.createdFiles + this.buildStats.createdFolders
            },
            duration: totalDuration,
            durationFormatted: `${(totalDuration / 1000).toFixed(2)}s`,
            errors: this.buildStats.errors.slice(0, 10),
            projectPath: projectPath
        };

        console.log(`\n✅ انتهى بناء المشروع الضخم!`);
        console.log(`📁 ${result.actual.totalItems} عنصر تم إنشاؤه في ${result.durationFormatted}`);

        return result;
    }

    // بناء طبقة واحدة
    async buildLayer(projectName, layer, plan) {
        const layerPath = `${projectName}/${layer.id}`;
        executionEngine.createDirectory(layerPath);
        this.buildStats.createdFolders++;

        // إنشاء المجلدات الفرعية
        for (const folder of layer.folders) {
            const folderPath = `${layerPath}/${folder}`;
            const result = executionEngine.createDirectory(folderPath);
            if (result.status === 'success') {
                this.buildStats.createdFolders++;
            } else {
                this.buildStats.failedItems++;
                this.buildStats.errors.push({ path: folderPath, error: result.error });
            }
        }

        // إنشاء الملفات الأساسية
        for (const file of layer.coreFiles) {
            const filePath = `${layerPath}/${file}`;
            const content = this.generateFileContent(file, layer, plan);
            const result = executionEngine.createFile(filePath, content);
            if (result.status === 'success') {
                this.buildStats.createdFiles++;
            } else {
                this.buildStats.failedItems++;
                this.buildStats.errors.push({ path: filePath, error: result.error });
            }
        }

        // إنشاء ملفات إضافية بناءً على التعقيد
        const additionalFiles = this.generateAdditionalFiles(layer, plan.analysis.complexity);
        for (const file of additionalFiles) {
            const filePath = `${layerPath}/${file.path}`;
            const result = executionEngine.createFile(filePath, file.content);
            if (result.status === 'success') {
                this.buildStats.createdFiles++;
            } else {
                this.buildStats.failedItems++;
                this.buildStats.errors.push({ path: filePath, error: result.error });
            }
        }
    }

    // توليد محتوى ملف
    generateFileContent(fileName, layer, plan) {
        const projectName = plan.projectName;
        
        if (fileName === 'package.json') {
            return JSON.stringify({
                name: `${projectName}-${layer.id}`,
                version: '1.0.0',
                description: `${layer.name} layer of ${projectName}`,
                main: layer.id === 'backend' ? 'server.js' : 'index.jsx',
                scripts: {
                    start: layer.id === 'backend' ? 'node server.js' : 'react-scripts start',
                    build: layer.id === 'backend' ? '' : 'react-scripts build',
                    test: 'jest'
                },
                dependencies: {},
                devDependencies: {}
            }, null, 2);
        }

        if (fileName === 'server.js') {
            return `const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(\`${layer.name} running on port \${PORT}\`);
});

module.exports = app;`;
        }

        if (fileName === 'App.jsx' || fileName === 'App.tsx') {
            return `import React from 'react';

function App() {
    return (
        <div className="app">
            <h1>${projectName}</h1>
            <p>${layer.name} - Ready for development</p>
        </div>
    );
}

export default App;`;
        }

        if (fileName === 'routes.jsx') {
            return `import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function AppRoutes() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<div>Home</div>} />
                <Route path="*" element={<div>404 - Not Found</div>} />
            </Routes>
        </BrowserRouter>
    );
}

export default AppRoutes;`;
        }

        if (fileName === '.env.example') {
            return `PORT=3000
NODE_ENV=development
API_URL=http://localhost:3001
DATABASE_URL=postgresql://localhost:5432/${projectName}`;
        }

        return `// ${fileName} - ${layer.name} layer of ${projectName}\n// Generated by CoreFlow\n\n`;
    }

    // توليد ملفات إضافية
    generateAdditionalFiles(layer, complexity) {
        const files = [];
        const count = this.analyzer.calculateAdditionalFiles(
            this.analyzer.layerTemplates[layer.id] || { typicalFiles: 20, files: [] },
            complexity
        );

        for (let i = 1; i <= count; i++) {
            const fileName = `${layer.id}_component_${i}.js`;
            files.push({
                path: `${layer.folders[0] || 'src'}/${fileName}`,
                content: `// Auto-generated component ${i} for ${layer.name}\n\nexport function Component${i}() {\n    return {\n        name: 'Component${i}',\n        layer: '${layer.name}',\n        ready: true\n    };\n}\n`
            });
        }

        return files;
    }

    // إنشاء ملفات التكامل
    async createIntegrationFiles(projectName, plan) {
        // Docker
        const dockerCompose = this.generateDockerCompose(plan);
        executionEngine.createFile(`${projectName}/docker-compose.yml`, dockerCompose);
        this.buildStats.createdFiles++;

        // Makefile
        const makefile = this.generateMakefile(plan);
        executionEngine.createFile(`${projectName}/Makefile`, makefile);
        this.buildStats.createdFiles++;

        // .gitignore
        const gitignore = `node_modules/\n.env\n*.log\ndist/\nbuild/\n.DS_Store\n`;
        executionEngine.createFile(`${projectName}/.gitignore`, gitignore);
        this.buildStats.createdFiles++;
    }

    // إنشاء README شامل
    async createComprehensiveReadme(projectName, plan, goal) {
        let readme = `# ${projectName}\n\n`;
        readme += `> ${goal}\n\n`;
        readme += `## 🏗️ Architecture\n\n`;
        readme += `This is a **${plan.analysis.complexity}** project with **${plan.layers.length} layers**.\n\n`;
        readme += `| Layer | Name | Folders |\n`;
        readme += `|-------|------|--------|\n`;

        plan.layers.forEach(layer => {
            readme += `| ${layer.id} | ${layer.name} | ${layer.folders.length} |\n`;
        });

        readme += `\n## 📊 Project Stats\n\n`;
        readme += `- Estimated files: ${plan.totalEstimatedFiles}+\n`;
        readme += `- Estimated lines: ${plan.totalEstimatedLines}+\n`;
        readme += `- Complexity: ${plan.analysis.complexity}\n`;
        readme += `- Build strategy: ${plan.analysis.buildStrategy?.name}\n\n`;

        readme += `## 🚀 Getting Started\n\n`;
        readme += `\`\`\`bash\n# Start all services\ndocker-compose up\n\n`;
        readme += `# Or start individual layer\ncd backend && npm start\n\`\`\`\n\n`;

        readme += `## 📋 Layers\n\n`;
        plan.layers.forEach(layer => {
            readme += `### ${layer.name} (\`${layer.id}/\`)\n`;
            readme += `- Folders: ${layer.folders.join(', ')}\n`;
            readme += `- Core files: ${layer.coreFiles.join(', ')}\n`;
            if (layer.dependencies.length > 0) {
                readme += `- Depends on: ${layer.dependencies.join(', ')}\n`;
            }
            readme += '\n';
        });

        readme += `---\n*Built with CoreFlow - ${new Date().toISOString()}*\n`;

        executionEngine.createFile(`${projectName}/README.md`, readme);
        this.buildStats.createdFiles++;
    }

    // توليد Docker Compose
    generateDockerCompose(plan) {
        let compose = `version: '3.8'\n\nservices:\n`;
        
        plan.layers.forEach((layer, index) => {
            compose += `  ${layer.id}:\n`;
            compose += `    build: ./${layer.id}\n`;
            compose += `    ports:\n`;
            compose += `      - "${3000 + index}:3000"\n`;
            compose += `    environment:\n`;
            compose += `      - NODE_ENV=production\n`;
            compose += `    volumes:\n`;
            compose += `      - ./${layer.id}:/app\n`;
            compose += `    restart: unless-stopped\n\n`;
        });

        return compose;
    }

    // توليد Makefile
    generateMakefile(plan) {
        let makefile = `.PHONY: help install start build clean\n\n`;
        makefile += `help:\n\t@echo "Available commands:"\n\t@echo "  make install  - Install all dependencies"\n\t@echo "  make start    - Start all services"\n\t@echo "  make build    - Build all layers"\n\t@echo "  make clean    - Clean all artifacts"\n\n`;
        makefile += `install:\n`;
        plan.layers.forEach(layer => {
            makefile += `\tcd ${layer.id} && npm install\n`;
        });
        makefile += `\nstart:\n\tdocker-compose up\n\n`;
        makefile += `clean:\n\trm -rf */node_modules */dist */build\n`;

        return makefile;
    }

    // الحصول على حالة البناء
    getBuildStatus() {
        return {
            ...this.buildStats,
            progress: this.buildStats.totalFiles > 0
                ? Math.round((this.buildStats.createdFiles / this.buildStats.totalFiles) * 100)
                : 0
        };
    }
}
