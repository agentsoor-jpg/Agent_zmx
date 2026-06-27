const http = require('http');

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
    console.log("Running self test...");
    try {
        const testRes = await makeRequest({
            hostname: '127.0.0.1',
            port: 3000,
            path: '/api/test/self',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        console.log("Self test result:", JSON.stringify(testRes, null, 2));

        console.log("\nRunning analyze-error...");
        const analyzeRes = await makeRequest({
            hostname: '127.0.0.1',
            port: 3000,
            path: '/api/test/analyze-error',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, { 
            "error": "TypeError: Cannot read property 'x' of undefined", 
            "context": { "filePath": "test.js" } 
        });
        console.log("Analyze result:", JSON.stringify(analyzeRes, null, 2));

        console.log("\nRunning predict...");
        const predictRes = await makeRequest({
            hostname: '127.0.0.1',
            port: 3000,
            path: '/api/test/predict',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, { 
            "code": "var x = 1; if (x == 2) { eval('alert(1)'); }", 
            "language": "javascript" 
        });
        console.log("Predict result:", JSON.stringify(predictRes, null, 2));

        console.log("\nRunning fix...");
        const fixRes = await makeRequest({
            hostname: '127.0.0.1',
            port: 3000,
            path: '/api/test/fix',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        console.log("Fix result:", JSON.stringify(fixRes, null, 2));
    } catch (e) {
        console.error("Test error", e);
    }
}

runTests();
