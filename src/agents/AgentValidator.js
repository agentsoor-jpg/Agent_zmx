const path = require('path');

// قائمة أنماط خطيرة يجب رفضها
const dangerousPatterns = [
    /rm\s+-rf/i,
    /sudo\s+/i,
    /chmod\s+777/i,
    /eval\s*\(/i,
    /exec\s*\(/i,
    /require\s*\(\s*['"]child_process['"]\s*\)/i,
    /os\.system/i,
    /subprocess\.call/i,
    /\/etc\/passwd/i,
    /\/etc\/shadow/i,
    /process\.env/i,
    /\.\.\/\.\.\//i
];

// قائمة امتدادات الملفات المسموحة
const allowedExtensions = [
    '.js', '.ts', '.jsx', '.tsx', '.py', '.html', '.css', '.scss',
    '.json', '.md', '.txt', '.yaml', '.yml', '.env', '.gitignore',
    '.svg', '.png', '.jpg', '.jpeg', '.gif', '.ico'
];

function validateSuggestion(suggestion, context) {
    const issues = [];
    const warnings = [];

    // 1. التحقق من وجود اقتراح
    if (!suggestion) {
        issues.push("المقترح فارغ أو غير موجود.");
        return { valid: false, issues, warnings };
    }

    // 2. التحقق من الكود المقترح
    if (suggestion.code) {
        const codeString = typeof suggestion.code === 'string' 
            ? suggestion.code 
            : JSON.stringify(suggestion.code);

        // فحص الأنماط الخطيرة
        dangerousPatterns.forEach(pattern => {
            if (pattern.test(codeString)) {
                issues.push(`تم اكتشاف نمط خطير في الكود: ${pattern}`);
            }
        });

        // فحص حجم الكود
        if (codeString.length > 100000) {
            warnings.push("الكود المقترح كبير جداً (أكثر من 100000 حرف).");
        }
    }

    // 3. التحقق من مسارات الملفات المقترحة
    if (suggestion.files) {
        suggestion.files.forEach(file => {
            const filePath = file.path || file;
            const ext = path.extname(filePath).toLowerCase();
            
            if (ext && !allowedExtensions.includes(ext)) {
                warnings.push(`امتداد الملف غير معتاد: ${ext} (${filePath})`);
            }

            if (filePath.includes('..')) {
                issues.push(`محاولة path traversal ممنوعة: ${filePath}`);
            }
        });
    }

    // 4. التحقق من الأوامر المقترحة
    if (suggestion.commands) {
        suggestion.commands.forEach(cmd => {
            dangerousPatterns.forEach(pattern => {
                if (pattern.test(cmd)) {
                    issues.push(`أمر خطير ممنوع: ${cmd}`);
                }
            });
        });
    }

    return {
        valid: issues.length === 0,
        issues,
        warnings,
        severity: issues.length > 0 ? "danger" : warnings.length > 0 ? "warning" : "safe"
    };
}

function validateAgentOutput(agentName, output) {
    // التحقق من هيكل المخرجات
    if (!output || typeof output !== 'object') {
        return {
            valid: false,
            issues: [`مخرجات الوكيل ${agentName} غير صالحة.`],
            warnings: []
        };
    }

    // التحقق من الحقول المطلوبة
    const requiredFields = ['status'];
    const missingFields = requiredFields.filter(f => !(f in output));
    
    if (missingFields.length > 0) {
        return {
            valid: false,
            issues: [`مخرجات ${agentName} تفتقد حقولاً مطلوبة: ${missingFields.join(', ')}`],
            warnings: []
        };
    }

    return validateSuggestion(output.suggestion || output, { agentName });
}

module.exports = {
    validateSuggestion,
    validateAgentOutput
};
