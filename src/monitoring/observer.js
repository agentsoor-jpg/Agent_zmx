const fs = require('fs');
const path = require('path');

let logs = [];

function addLog(entry) {
    const logEntry = {
        id: entry.id || Date.now().toString(),
        timestamp: entry.timestamp || new Date().toISOString(),
        goal: entry.goal || null,
        action: entry.action || null,
        command: entry.command || null,
        path: entry.path || null,
        stdout: entry.stdout || null,
        stderr: entry.stderr || null,
        exitCode: entry.exitCode !== undefined ? entry.exitCode : null,
        duration: entry.duration || 0,
        status: entry.status || "unknown"
    };
    
    logs.push(logEntry);
    
    console.log(`[OBSERVER] Action: ${logEntry.action} | Status: ${logEntry.status} | Duration: ${logEntry.duration}ms`);
}

function getLogs(filter = {}) {
    return logs.filter(log => {
        for (const key in filter) {
            if (log[key] !== filter[key]) {
                return false;
            }
        }
        return true;
    });
}

function getStats() {
    let total = logs.length;
    let success = 0;
    let error = 0;
    let totalDuration = 0;
    
    for (const log of logs) {
        if (log.status === 'success') success++;
        if (log.status === 'error') error++;
        if (log.duration) totalDuration += log.duration;
    }
    
    let avgDuration = total > 0 ? (totalDuration / total) : 0;
    
    return {
        total,
        success,
        error,
        avgDuration
    };
}

function exportLogsToFile() {
    try {
        const logsDir = path.resolve(process.cwd(), 'logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        
        const filePath = path.join(logsDir, 'execution_log.json');
        fs.writeFileSync(filePath, JSON.stringify(logs, null, 2), 'utf8');
        
        return { status: "success", path: "logs/execution_log.json" };
    } catch (error) {
        return { status: "error", error: error.message };
    }
}

module.exports = {
    addLog,
    getLogs,
    getStats,
    exportLogsToFile
};
