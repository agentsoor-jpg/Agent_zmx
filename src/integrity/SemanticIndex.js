const fs = require('fs');
const path = require('path');

const INDEX_FILE = path.resolve(process.cwd(), 'logs', 'semantic_index.json');
const WORKSPACE_DIR = path.resolve(process.cwd(), 'workspace_run');

let semanticIndex = {
    version: "1.0",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    symbols: [],
    files: {}
};

// تحميل الفهرس
function load() {
    try {
        if (fs.existsSync(INDEX_FILE)) {
            const data = fs.readFileSync(INDEX_FILE, 'utf8');
            semanticIndex = JSON.parse(data);
        }
    } catch (error) {
        console.log('[SemanticIndex] بدء فهرس جديد.');
    }
    return semanticIndex;
}

// حفظ الفهرس
function save() {
    try {
        semanticIndex.updatedAt = new Date().toISOString();
        const dir = path.dirname(INDEX_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(INDEX_FILE, JSON.stringify(semanticIndex, null, 2), 'utf8');
    } catch (error) {
        console.error('[SemanticIndex] فشل حفظ الفهرس:', error.message);
    }
}

// استخراج الرموز من ملف JavaScript/TypeScript
function extractJSSymbols(content, filePath) {
    const symbols = [];
    
    // استخراج imports
    const importRegex = /(?:import\s+(?:[\w*,\s{}]+)\s+from\s+['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\))/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
        symbols.push({
            type: "import",
            name: match[1] || match[2],
            file: filePath,
            line: content.substring(0, match.index).split('\n').length
        });
    }
    
    // استخراج exports
    const exportRegex = /(?:export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)|module\.exports\s*=\s*(\w+))/g;
    while ((match = exportRegex.exec(content)) !== null) {
        symbols.push({
            type: "export",
            name: match[1] || match[2],
            file: filePath,
            line: content.substring(0, match.index).split('\n').length
        });
    }
    
    // استخراج الدوال
    const functionRegex = /(?:function\s+(\w+)|(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>|(\w+)\s*:\s*(?:async\s*)?function)/g;
    while ((match = functionRegex.exec(content)) !== null) {
        const funcName = match[1] || match[2] || match[3];
        if (funcName && !['if', 'for', 'while', 'switch', 'catch'].includes(funcName)) {
            symbols.push({
                type: "function",
                name: funcName,
                file: filePath,
                line: content.substring(0, match.index).split('\n').length
            });
        }
    }
    
    // استخراج الكلاسات
    const classRegex = /class\s+(\w+)/g;
    while ((match = classRegex.exec(content)) !== null) {
        symbols.push({
            type: "class",
            name: match[1],
            file: filePath,
            line: content.substring(0, match.index).split('\n').length
        });
    }
    
    return symbols;
}

// استخراج الرموز من ملف Python
function extractPythonSymbols(content, filePath) {
    const symbols = [];
    
    // استخراج imports
    const importRegex = /(?:import\s+(\w+)|from\s+(\w+)\s+import\s+([\w,\s*]+))/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
        symbols.push({
            type: "import",
            name: match[1] || `${match[2]}.${match[3]}`,
            file: filePath,
            line: content.substring(0, match.index).split('\n').length
        });
    }
    
    // استخراج الدوال
    const funcRegex = /def\s+(\w+)\s*\(/g;
    while ((match = funcRegex.exec(content)) !== null) {
        symbols.push({
            type: "function",
            name: match[1],
            file: filePath,
            line: content.substring(0, match.index).split('\n').length
        });
    }
    
    // استخراج الكلاسات
    const classRegex = /class\s+(\w+)/g;
    while ((match = classRegex.exec(content)) !== null) {
        symbols.push({
            type: "class",
            name: match[1],
            file: filePath,
            line: content.substring(0, match.index).split('\n').length
        });
    }
    
    return symbols;
}

// فهرسة ملف واحد
function indexFile(relativePath) {
    const absolutePath = path.resolve(WORKSPACE_DIR, relativePath);
    
    if (!fs.existsSync(absolutePath)) {
        return { status: "error", error: "File not found", path: relativePath };
    }
    
    try {
        const content = fs.readFileSync(absolutePath, 'utf8');
        const ext = path.extname(relativePath).toLowerCase();
        
        let symbols = [];
        
        if (['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs'].includes(ext)) {
            symbols = extractJSSymbols(content, relativePath);
        } else if (['.py', '.pyw'].includes(ext)) {
            symbols = extractPythonSymbols(content, relativePath);
        }
        
        // تحديث الفهرس
        semanticIndex.files[relativePath] = {
            indexedAt: new Date().toISOString(),
            symbolCount: symbols.length,
            symbols: symbols.map(s => s.name)
        };
        
        // إزالة الرموز القديمة لهذا الملف وإضافة الجديدة
        semanticIndex.symbols = semanticIndex.symbols.filter(s => s.file !== relativePath);
        semanticIndex.symbols.push(...symbols);
        
        save();
        
        return {
            status: "success",
            path: relativePath,
            symbolCount: symbols.length,
            symbols: symbols.map(s => ({ type: s.type, name: s.name }))
        };
    } catch (error) {
        return { status: "error", error: error.message, path: relativePath };
    }
}

// فهرسة جميع الملفات في workspace_run
function indexAll() {
    const results = [];
    
    function walk(dir, basePath = '') {
        if (!fs.existsSync(dir)) return;
        
        const items = fs.readdirSync(dir);
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const relativePath = basePath ? `${basePath}/${item}` : item;
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                walk(fullPath, relativePath);
            } else {
                const ext = path.extname(item).toLowerCase();
                if (['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs', '.py', '.pyw', '.html', '.css', '.json', '.md'].includes(ext)) {
                    const result = indexFile(relativePath);
                    results.push(result);
                }
            }
        }
    }
    
    // مسح الفهرس القديم
    semanticIndex.symbols = [];
    semanticIndex.files = {};
    
    walk(WORKSPACE_DIR);
    save();
    
    return {
        status: "completed",
        filesIndexed: results.filter(r => r.status === "success").length,
        totalSymbols: semanticIndex.symbols.length,
        results
    };
}

// التحقق من تطابق الفهرس مع الملفات الفعلية
function verifyParity() {
    const issues = [];
    
    // 1. ملفات مفهرسة لكنها محذوفة
    Object.keys(semanticIndex.files).forEach(filePath => {
        const absolutePath = path.resolve(WORKSPACE_DIR, filePath);
        if (!fs.existsSync(absolutePath)) {
            issues.push({
                type: "stale_index",
                severity: "medium",
                path: filePath,
                message: `الملف مفهرس لكنه غير موجود فعليًا.`
            });
        }
    });
    
    // 2. ملفات موجودة وغير مفهرسة
    function findUnindexed(dir, basePath = '') {
        if (!fs.existsSync(dir)) return;
        
        const items = fs.readdirSync(dir);
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const relativePath = basePath ? `${basePath}/${item}` : item;
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                findUnindexed(fullPath, relativePath);
            } else {
                const ext = path.extname(item).toLowerCase();
                const indexable = ['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs', '.py', '.pyw'];
                if (indexable.includes(ext) && !semanticIndex.files[relativePath]) {
                    issues.push({
                        type: "unindexed_file",
                        severity: "low",
                        path: relativePath,
                        message: `الملف موجود وغير مفهرس.`
                    });
                }
            }
        }
    }
    
    findUnindexed(WORKSPACE_DIR);
    
    // 3. رموز بدون ملفات
    const indexedFiles = Object.keys(semanticIndex.files);
    semanticIndex.symbols.forEach(symbol => {
        if (!indexedFiles.includes(symbol.file)) {
            issues.push({
                type: "orphan_symbol",
                severity: "high",
                symbol: symbol.name,
                file: symbol.file,
                message: `الرمز ${symbol.name} يشير لملف غير موجود في الفهرس.`
            });
        }
    });
    
    return {
        timestamp: new Date().toISOString(),
        indexedFiles: Object.keys(semanticIndex.files).length,
        totalSymbols: semanticIndex.symbols.length,
        issues,
        isClean: issues.length === 0,
        summary: issues.length === 0
            ? "✅ الفهرس متطابق تمامًا مع الملفات."
            : `❌ تم العثور على ${issues.length} عدم تطابق.`
    };
}

// إعادة بناء الفهرس بالكامل
function rebuild() {
    return indexAll();
}

// الحصول على رموز ملف معين
function getSymbolsForFile(filePath) {
    return semanticIndex.symbols.filter(s => s.file === filePath);
}

// البحث عن رمز
function searchSymbol(name) {
    return semanticIndex.symbols.filter(s => s.name.toLowerCase().includes(name.toLowerCase()));
}

// الحصول على إحصائيات
function getStats() {
    const typeCounts = {};
    semanticIndex.symbols.forEach(s => {
        typeCounts[s.type] = (typeCounts[s.type] || 0) + 1;
    });
    
    return {
        totalFiles: Object.keys(semanticIndex.files).length,
        totalSymbols: semanticIndex.symbols.length,
        types: typeCounts,
        lastUpdated: semanticIndex.updatedAt
    };
}

// تحميل عند بدء التشغيل
load();

module.exports = {
    indexFile,
    indexAll,
    verifyParity,
    rebuild,
    getSymbolsForFile,
    searchSymbol,
    getStats,
    semanticIndex
};
