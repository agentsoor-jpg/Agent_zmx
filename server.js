const express = require('express');
const path = require('path');
const strategicController = require('./src/control/StrategicController');
const ChaosEngine = require('./src/testing/ChaosEngine');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// نقطة تنفيذ الهدف
app.post('/api/execute', async (req, res) => {
    try {
        const { goal } = req.body;
        
        if (!goal || typeof goal !== 'string' || goal.trim().length === 0) {
            return res.status(400).json({
                status: "error",
                message: "الرجاء إرسال هدف صحيح في الحقل 'goal'."
            });
        }

        const result = await strategicController.execute(goal);
        
        return res.json(result);
    } catch (error) {
        return res.status(500).json({
            status: "error",
            message: "حدث خطأ داخلي في النظام.",
            error: error.message
        });
    }
});

// نقطة حالة النظام
app.get('/api/status', (req, res) => {
    res.json({
        status: "running",
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// الصفحة الرئيسية
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// نقطة تشغيل الاختبارات التدميرية
app.post('/api/chaos-test', async (req, res) => {
    try {
        const chaos = new ChaosEngine();
        const results = await chaos.runAll();
        
        res.json({
            status: "completed",
            message: "تم الانتهاء من جميع اختبارات التعذيب.",
            ...results
        });
    } catch (error) {
        res.status(500).json({
            status: "error",
            message: "فشل تشغيل الاختبارات.",
            error: error.message
        });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`CoreFlow server running on http://0.0.0.0:${PORT}`);
});
