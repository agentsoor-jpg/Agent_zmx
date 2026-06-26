const ledger = require('./Ledger');
const semanticIndex = require('./SemanticIndex');

async function runFullCheck() {
    const startTime = Date.now();
    
    const results = {
        timestamp: new Date().toISOString(),
        ledgerCheck: null,
        indexCheck: null,
        crossCheck: null,
        isClean: true,
        totalIssues: 0,
        issues: []
    };
    
    // 1. فحص الـ Ledger
    results.ledgerCheck = ledger.verifyParity();
    if (!results.ledgerCheck.isClean) {
        results.isClean = false;
        results.totalIssues += results.ledgerCheck.issues.length;
        results.issues.push(...results.ledgerCheck.issues.map(i => ({ ...i, source: "ledger" })));
    }
    
    // 2. فحص الـ Semantic Index
    results.indexCheck = semanticIndex.verifyParity();
    if (!results.indexCheck.isClean) {
        results.isClean = false;
        results.totalIssues += results.indexCheck.issues.length;
        results.issues.push(...results.indexCheck.issues.map(i => ({ ...i, source: "index" })));
    }
    
    // 3. فحص تقاطعي: هل كل ملف في ledger مفهرس؟
    if (results.ledgerCheck.isClean && results.indexCheck.isClean) {
        const ledgerPaths = ledger.ledger.entries
            .filter(e => e.action !== 'delete')
            .map(e => e.path);
        
        const indexedPaths = Object.keys(semanticIndex.semanticIndex.files);
        
        const unindexedInLedger = ledgerPaths.filter(p => {
            const ext = p.split('.').pop();
            const indexable = ['js', 'ts', 'jsx', 'tsx', 'py'];
            return indexable.includes(ext) && !indexedPaths.includes(p);
        });
        
        if (unindexedInLedger.length > 0) {
            results.crossCheck = {
                type: "cross_mismatch",
                message: `${unindexedInLedger.length} ملفات مسجلة في ledger لكنها غير مفهرسة.`,
                files: unindexedInLedger
            };
            results.isClean = false;
            results.totalIssues += unindexedInLedger.length;
        }
    }
    
    results.duration = Date.now() - startTime;
    results.summary = results.isClean
        ? "✅ النظام نظيف تمامًا. لا يوجد أي عدم تطابق بين الذاكرة والواقع."
        : `❌ تم العثور على ${results.totalIssues} مشكلة تطابق.`;
    
    return results;
}

async function repair() {
    const repairs = {
        ledgerRepaired: false,
        indexRepaired: false,
        details: []
    };
    
    // إصلاح الـ Ledger
    const ledgerCheck = ledger.verifyParity();
    if (!ledgerCheck.isClean) {
        const rebuildResult = ledger.rebuildFromFilesystem();
        repairs.ledgerRepaired = true;
        repairs.details.push({
            component: "ledger",
            action: "rebuilt",
            result: rebuildResult
        });
    }
    
    // إصلاح الـ Semantic Index
    const indexCheck = semanticIndex.verifyParity();
    if (!indexCheck.isClean) {
        const rebuildResult = semanticIndex.rebuild();
        repairs.indexRepaired = true;
        repairs.details.push({
            component: "index",
            action: "rebuilt",
            result: rebuildResult
        });
    }
    
    return repairs;
}

function getHealthReport() {
    const ledgerStats = ledger.getStats();
    const indexStats = semanticIndex.getStats();
    
    return {
        timestamp: new Date().toISOString(),
        ledger: {
            entries: ledgerStats.totalEntries,
            created: ledgerStats.created,
            modified: ledgerStats.modified,
            deleted: ledgerStats.deleted
        },
        index: {
            files: indexStats.totalFiles,
            symbols: indexStats.totalSymbols,
            types: indexStats.types
        },
        status: "healthy"
    };
}

module.exports = {
    runFullCheck,
    repair,
    getHealthReport
};
