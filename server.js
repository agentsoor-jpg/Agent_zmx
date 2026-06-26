const express = require('express');
const path = require('path');
const strategicController = require('./src/control/StrategicController');
const ChaosEngine = require('./src/testing/ChaosEngine');
const UniversalFileManager = require('./src/universal/UniversalFileManager');

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

// مدير الملفات العالمي - استقبال
app.post('/api/universal/ingest', async (req, res) => {
    try {
        const { source, targetName } = req.body;
        if (!source) {
            return res.status(400).json({ status: "error", message: "المصدر مطلوب." });
        }
        const ufm = new UniversalFileManager();
        const result = await ufm.ingest(source, { targetName });
        res.json(result);
    } catch (error) {
        res.status(500).json({ status: "error", error: error.message });
    }
});

// مدير الملفات العالمي - ضغط
app.post('/api/universal/compress', async (req, res) => {
    try {
        const { sourceDir, format } = req.body;
        if (!sourceDir) {
            return res.status(400).json({ status: "error", message: "مسار المصدر مطلوب." });
        }
        const ufm = new UniversalFileManager();
        const result = await ufm.compress(sourceDir, format || 'zip');
        res.json(result);
    } catch (error) {
        res.status(500).json({ status: "error", error: error.message });
    }
});

// مدير الملفات العالمي - فك ضغط
app.post('/api/universal/extract', async (req, res) => {
    try {
        const { filePath, outputDir } = req.body;
        if (!filePath) {
            return res.status(400).json({ status: "error", message: "مسار الملف مطلوب." });
        }
        const ufm = new UniversalFileManager();
        const result = await ufm.extract(filePath, outputDir);
        res.json(result);
    } catch (error) {
        res.status(500).json({ status: "error", error: error.message });
    }
});

// مدير الملفات العالمي - إرسال
app.post('/api/universal/deliver', async (req, res) => {
    try {
        const { sourcePath, destination, branch, message } = req.body;
        if (!sourcePath || !destination) {
            return res.status(400).json({ status: "error", message: "المصدر والوجهة مطلوبان." });
        }
        const ufm = new UniversalFileManager();
        const result = await ufm.deliver(sourcePath, destination, { branch, message });
        res.json(result);
    } catch (error) {
        res.status(500).json({ status: "error", error: error.message });
    }
});

// مدير الملفات العالمي - خط أنابيب كامل
app.post('/api/universal/pipeline', async (req, res) => {
    try {
        const options = req.body;
        if (!options.source) {
            return res.status(400).json({ status: "error", message: "المصدر مطلوب." });
        }
        const ufm = new UniversalFileManager();
        const result = await ufm.fullPipeline(options);
        res.json(result);
    } catch (error) {
        res.status(500).json({ status: "error", error: error.message });
    }
});

// مدير الملفات العالمي - القدرات
app.get('/api/universal/capabilities', (req, res) => {
    const ufm = new UniversalFileManager();
    res.json({
        status: "success",
        capabilities: ufm.getCapabilities()
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`CoreFlow server running on http://0.0.0.0:${PORT}`);
});
