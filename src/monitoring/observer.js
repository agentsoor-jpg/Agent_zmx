const logs = [];

export default {
    addLog: (log) => logs.push(log),
    getLogs: (filter) => logs.filter(l => l.action === filter.action),
    getStats: () => ({ total: logs.length, success: 1 }),
    exportLogsToFile: () => ({ status: 'success' })
};
