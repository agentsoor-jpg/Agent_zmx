const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LEDGER_FILE = path.resolve(process.cwd(), 'logs', 'ledger.json');
const WORKSPACE_DIR = path.resolve(process.cwd(), 'workspace_run');

let ledger = {
    version: "1.0",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    entries: []
};

// تحميل السجل
function load() {
    try {
        if (fs.existsSync(LEDGER_FILE)) {
            const data = fs.readFileSync(LEDGER_FILE, 'utf8');
            ledger = JSON.parse(data);
        }
    } catch (error) {
        console.log('[Ledger] بدء سجل جديد.');
    }
    return ledger;
}

// حفظ السجل
function save() {
    try {
        ledger.updatedAt = new Date().toISOString();
        const dir = path.dirname(LEDGER_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(LEDGER_FILE, JSON.stringify(ledger, null, 2), 'utf8');
    } catch (error) {
        console.error('[Ledger] فشل حفظ السجل:', error.message);
    }
}

// حساب hash لملف
function getFileHash(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
    } catch {
        return null;
    }
}

// تسجيل إنشاء ملف
function recordCreate(relativePath) {
    const absolutePath = path.resolve(WORKSPACE_DIR, relativePath);
    const exists = fs.existsSync(absolutePath);
    
    const entry = {
        id: ledger.entries.length + 1,
        timestamp: new Date().toISOString(),
        action: "create",
        path: relativePath,
        exists: exists,
        size: exists ? fs.statSync(absolutePath).size : 0,
        hash: exists ? getFileHash(absolutePath) : null
    };
    
    // إزالة أي إدخال سابق لنفس المسار
    ledger.entries = ledger.entries.filter(e => e.path !== relativePath);
    ledger.entries.push(entry);
    
    save();
    return entry;
}

// تسجيل تعديل ملف
function recordModify(relativePath) {
    const absolutePath = path.resolve(WORKSPACE_DIR, relativePath);
    const exists = fs.existsSync(absolutePath);
    
    const entry = {
        id: ledger.entries.length + 1,
        timestamp: new Date().toISOString(),
        action: "modify",
        path: relativePath,
        exists: exists,
        size: exists ? fs.statSync(absolutePath).size : 0,
        hash: exists ? getFileHash(absolutePath) : null
    };
    
    ledger.entries.push(entry);
    save();
    return entry;
}

// تسجيل حذف ملف
function recordDelete(relativePath) {
    const entry = {
        id: ledger.entries.length + 1,
        timestamp: new Date().toISOString(),
        action: "delete",
        path: relativePath,
        exists: false,
        size: 0,
        hash: null
    };
    
    ledger.entries = ledger.entries.filter(e => e.path !== relativePath);
    ledger.entries.push(entry);
    
    save();
    return entry;
}

// فحص جميع الملفات الفعلية في workspace_run
function scanActualFiles(dir = WORKSPACE_DIR, basePath = '') {
    const results = [];
    
    if (!fs.existsSync(dir)) return results;
    
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const relativePath = basePath ? `${basePath}/${item}` : item;
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            results.push(...scanActualFiles(fullPath, relativePath));
        } else {
            results.push({
                path: relativePath,
                size: stat.size,
                modifiedAt: stat.mtime.toISOString(),
                hash: getFileHash(fullPath)
            });
        }
    }
    
    return results;
}

// مقارنة السجل مع الواقع - هذه هي الدالة الجوهرية
function verifyParity() {
    const actualFiles = scanActualFiles();
    const issues = [];
    
    // 1. ملفات في السجل لكنها غير موجودة فعليًا (ملفات شبحية)
    const ledgerFiles = ledger.entries
        .filter(e => e.action !== 'delete' && e.exists)
        .map(e => e.path);
    
    ledgerFiles.forEach(filePath => {
        const actual = actualFiles.find(f => f.path === filePath);
        if (!actual) {
            issues.push({
                type: "ghost_file",
                severity: "high",
                path: filePath,
                message: `الملف مسجل في الـ ledger لكنه غير موجود فعليًا على القرص.`
            });
        }
    });
    
    // 2. ملفات موجودة فعليًا لكنها غير مسجلة في السجل
    const ledgerPaths = ledger.entries.map(e => e.path);
    
    actualFiles.forEach(actual => {
        if (!ledgerPaths.includes(actual.path)) {
            issues.push({
                type: "unregistered_file",
                severity: "medium",
                path: actual.path,
                message: `الملف موجود فعليًا لكنه غير مسجل في الـ ledger.`
            });
        }
    });
    
    // 3. ملفات تغيرت منذ آخر تسجيل
    ledger.entries
        .filter(e => e.action !== 'delete' && e.exists && e.hash)
        .forEach(entry => {
            const actual = actualFiles.find(f => f.path === entry.path);
            if (actual && entry.hash !== actual.hash) {
                issues.push({
                    type: "hash_mismatch",
                    severity: "high",
                    path: entry.path,
                    ledgerHash: entry.hash,
                    actualHash: actual.hash,
                    message: `الملف تغير منذ آخر تسجيل في الـ ledger.`
                });
            }
        });
    
    // 4. ملفات مسجلة كمحذوفة لكنها موجودة
    ledger.entries
        .filter(e => e.action === 'delete')
        .forEach(entry => {
            const actual = actualFiles.find(f => f.path === entry.path);
            if (actual) {
                issues.push({
                    type: "resurrected_file",
                    severity: "high",
                    path: entry.path,
                    message: `الملف مسجل كمحذوف لكنه موجود فعليًا.`
                });
            }
        });
    
    return {
        timestamp: new Date().toISOString(),
        ledgerEntryCount: ledger.entries.length,
        actualFileCount: actualFiles.length,
        issues: issues,
        isClean: issues.length === 0,
        summary: issues.length === 0 
            ? "✅ الـ ledger متطابق تمامًا مع نظام الملفات."
            : `❌ تم العثور على ${issues.length} عدم تطابق.`
    };
}

// إعادة بناء السجل من الواقع
function rebuildFromFilesystem() {
    const actualFiles = scanActualFiles();
    
    ledger.entries = actualFiles.map((file, index) => ({
        id: index + 1,
        timestamp: file.modifiedAt,
        action: "create",
        path: file.path,
        exists: true,
        size: file.size,
        hash: file.hash
    }));
    
    save();
    
    return {
        status: "rebuilt",
        entriesCreated: ledger.entries.length,
        message: `تمت إعادة بناء الـ ledger من ${ledger.entries.length} ملف فعلي.`
    };
}

// الحصول على إحصائيات
function getStats() {
    const created = ledger.entries.filter(e => e.action === 'create').length;
    const modified = ledger.entries.filter(e => e.action === 'modify').length;
    const deleted = ledger.entries.filter(e => e.action === 'delete').length;
    
    return {
        totalEntries: ledger.entries.length,
        created,
        modified,
        deleted,
        lastUpdated: ledger.updatedAt
    };
}

// تصدير السجل
function exportLedger() {
    const filePath = path.resolve(process.cwd(), 'logs', 'ledger_export.json');
    fs.writeFileSync(filePath, JSON.stringify(ledger, null, 2), 'utf8');
    return { status: "success", path: 'logs/ledger_export.json' };
}

// تحميل عند بدء التشغيل
load();

module.exports = {
    recordCreate,
    recordModify,
    recordDelete,
    verifyParity,
    rebuildFromFilesystem,
    scanActualFiles,
    getStats,
    exportLedger,
    ledger
};
