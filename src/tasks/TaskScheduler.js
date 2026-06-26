const { EventEmitter } = require('events');

class TaskScheduler extends EventEmitter {
    constructor(maxConcurrent = 5) {
        super();
        this.maxConcurrent = maxConcurrent;
        this.queue = [];
        this.running = new Map();
        this.completed = [];
        this.failed = [];
        this.results = new Map();
        this.paused = false;
        this.taskCounter = 0;
    }

    // إضافة مهمة
    addTask(task) {
        const taskId = ++this.taskCounter;
        
        const taskObj = {
            id: taskId,
            name: task.name || `task_${taskId}`,
            fn: task.fn,
            priority: task.priority || 0, // 0 = عادي، 1 = مرتفع، -1 = منخفض
            dependencies: task.dependencies || [], // معرفات المهام التي يجب إكمالها أولاً
            retries: task.retries || 0,
            maxRetries: task.maxRetries || 2,
            timeout: task.timeout || 60000,
            status: 'queued',
            createdAt: new Date().toISOString(),
            startedAt: null,
            completedAt: null,
            result: null,
            error: null
        };

        this.queue.push(taskObj);
        this.sortQueue();
        
        this.emit('task:queued', taskObj);
        this.processQueue();
        
        return taskId;
    }

    // إضافة مهام متعددة
    addTasks(tasks) {
        return tasks.map(task => this.addTask(task));
    }

    // ترتيب الطابور حسب الأولوية
    sortQueue() {
        this.queue.sort((a, b) => b.priority - a.priority);
    }

    // معالجة الطابور
    async processQueue() {
        if (this.paused) return;

        while (this.running.size < this.maxConcurrent && this.queue.length > 0) {
            const task = this.selectNextTask();
            if (!task) break;
            
            this.executeTask(task);
        }
    }

    // اختيار المهمة التالية (مع مراعاة الاعتماديات)
    selectNextTask() {
        for (let i = 0; i < this.queue.length; i++) {
            const task = this.queue[i];
            
            // التحقق من الاعتماديات
            const depsMet = task.dependencies.every(depId => {
                const depResult = this.results.get(depId);
                return depResult && depResult.status === 'completed';
            });

            if (depsMet) {
                this.queue.splice(i, 1);
                return task;
            }
        }
        
        return null;
    }

    // تنفيذ مهمة
    async executeTask(task) {
        task.status = 'running';
        task.startedAt = new Date().toISOString();
        this.running.set(task.id, task);
        
        this.emit('task:started', task);

        try {
            // تنفيذ مع timeout
            const result = await this.runWithTimeout(task);
            
            task.status = 'completed';
            task.completedAt = new Date().toISOString();
            task.result = result;
            
            this.running.delete(task.id);
            this.completed.push(task);
            this.results.set(task.id, { status: 'completed', result });
            
            this.emit('task:completed', task, result);
        } catch (error) {
            // محاولة إعادة التنفيذ
            if (task.retries < task.maxRetries) {
                task.retries++;
                task.status = 'queued';
                this.queue.push(task);
                this.sortQueue();
                this.running.delete(task.id);
                
                this.emit('task:retrying', task, error);
            } else {
                task.status = 'failed';
                task.completedAt = new Date().toISOString();
                task.error = error.message;
                
                this.running.delete(task.id);
                this.failed.push(task);
                this.results.set(task.id, { status: 'failed', error: error.message });
                
                this.emit('task:failed', task, error);
            }
        }

        this.processQueue();
    }

    // تنفيذ مع timeout
    async runWithTimeout(task) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`المهمة ${task.name} تجاوزت المهلة (${task.timeout}ms)`));
            }, task.timeout);

            Promise.resolve(task.fn())
                .then(result => {
                    clearTimeout(timer);
                    resolve(result);
                })
                .catch(error => {
                    clearTimeout(timer);
                    reject(error);
                });
        });
    }

    // إيقاف مؤقت
    pause() {
        this.paused = true;
        this.emit('scheduler:paused');
        return { status: "paused", queueSize: this.queue.length, running: this.running.size };
    }

    // استئناف
    resume() {
        this.paused = false;
        this.emit('scheduler:resumed');
        this.processQueue();
        return { status: "resumed", queueSize: this.queue.length, running: this.running.size };
    }

    // إلغاء مهمة
    cancel(taskId) {
        const task = this.queue.find(t => t.id === taskId);
        if (task) {
            this.queue = this.queue.filter(t => t.id !== taskId);
            task.status = 'cancelled';
            this.emit('task:cancelled', task);
            return { status: "cancelled", taskId };
        }
        return { status: "not_found", taskId };
    }

    // انتظار مهمة محددة
    async waitForTask(taskId) {
        const result = this.results.get(taskId);
        if (result) return result;

        return new Promise((resolve) => {
            const handler = (task, res) => {
                if (task.id === taskId) {
                    this.removeListener('task:completed', handler);
                    this.removeListener('task:failed', handler);
                    resolve({ status: 'completed', result: res });
                }
            };
            const failHandler = (task, err) => {
                if (task.id === taskId) {
                    this.removeListener('task:completed', handler);
                    this.removeListener('task:failed', failHandler);
                    resolve({ status: 'failed', error: err.message });
                }
            };
            this.on('task:completed', handler);
            this.on('task:failed', failHandler);
        });
    }

    // انتظار كل المهام
    async waitForAll() {
        const taskIds = [
            ...this.queue.map(t => t.id),
            ...Array.from(this.running.keys())
        ];

        const results = {};
        for (const id of taskIds) {
            results[id] = await this.waitForTask(id);
        }
        return results;
    }

    // حالة المجدول
    getStatus() {
        return {
            queued: this.queue.length,
            running: this.running.size,
            completed: this.completed.length,
            failed: this.failed.length,
            paused: this.paused,
            maxConcurrent: this.maxConcurrent,
            utilizationPercent: ((this.running.size / this.maxConcurrent) * 100).toFixed(0)
        };
    }

    // تقرير كامل
    getReport() {
        return {
            status: this.getStatus(),
            recentCompleted: this.completed.slice(-10).map(t => ({
                id: t.id,
                name: t.name,
                duration: t.completedAt && t.startedAt ? 
                    (new Date(t.completedAt) - new Date(t.startedAt)) + 'ms' : 'N/A'
            })),
            recentFailed: this.failed.slice(-5).map(t => ({
                id: t.id,
                name: t.name,
                error: t.error
            }))
        };
    }

    // مسح المهام المكتملة
    clearHistory() {
        this.completed = [];
        this.failed = [];
        this.results.clear();
        return { status: "cleared" };
    }
}

module.exports = TaskScheduler;
