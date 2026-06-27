import http from 'http';

const makeRequest = (options, data = null) => {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve(JSON.parse(body)));
        });
        
        req.on('error', reject);
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
};

async function runTests() {
    console.log("Running massive analyze...");
    try {
        const analyzeRes = await makeRequest({
            hostname: '127.0.0.1',
            port: 3000,
            path: '/api/massive/analyze',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, { "goal": "بناء منصة تعليمية كاملة بواجهة أمامية وخلفية وقاعدة بيانات وتطبيق جوال مع بنية تحتية للنشر" });
        console.log("Analyze result:", JSON.stringify(analyzeRes, null, 2));

        console.log("\nRunning massive plan...");
        const planRes = await makeRequest({
            hostname: '127.0.0.1',
            port: 3000,
            path: '/api/massive/plan',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, { "goal": "بناء نظام إدارة محتوى مؤسسي متكامل" });
        console.log("Plan result:", JSON.stringify(planRes, null, 2));

        console.log("\nRunning massive capabilities...");
        const capRes = await makeRequest({
            hostname: '127.0.0.1',
            port: 3000,
            path: '/api/massive/capabilities',
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        console.log("Capabilities result:", JSON.stringify(capRes, null, 2));

        console.log("\nRunning self test...");
        const selfRes = await makeRequest({
            hostname: '127.0.0.1',
            port: 3000,
            path: '/api/test/self',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        console.log("Self test result:", JSON.stringify(selfRes, null, 2));

        console.log("\nRunning health check...");
        const healthRes = await makeRequest({
            hostname: '127.0.0.1',
            port: 3000,
            path: '/api/health',
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        console.log("Health check result:", JSON.stringify(healthRes, null, 2));

        console.log("\nRunning chaos test...");
        const chaosRes = await makeRequest({
            hostname: '127.0.0.1',
            port: 3000,
            path: '/api/chaos-test',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        console.log("Chaos test result:", JSON.stringify(chaosRes, null, 2));

    } catch (e) {
        console.error("Test error", e);
    }
}

runTests();
