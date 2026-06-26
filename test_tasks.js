const http = require('http');

function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(responseData));
                } catch (e) {
                    resolve(responseData);
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function runTests() {
    console.log("=== Testing Supported Languages ===");
    try {
        const supportedRes = await makeRequest('GET', '/api/packages/supported');
        console.log(JSON.stringify(supportedRes, null, 2));
    } catch (e) { console.error(e); }

    console.log("\n=== Testing Task Status ===");
    try {
        const statusRes = await makeRequest('GET', '/api/tasks/status');
        console.log(JSON.stringify(statusRes, null, 2));
    } catch (e) { console.error(e); }

    console.log("\n=== Creating Dummy Node Project ===");
    const fs = require('fs');
    const path = require('path');
    const dummyDir = path.join(process.cwd(), 'workspace_run', 'dummy_node_project');
    if (!fs.existsSync(dummyDir)) {
        fs.mkdirSync(dummyDir, { recursive: true });
    }
    const packageJson = {
        name: "dummy-project",
        version: "1.0.0",
        dependencies: {
            "express": "^4.17.1"
        },
        scripts: {
            "test": "echo 'Test run successful'"
        }
    };
    fs.writeFileSync(path.join(dummyDir, 'package.json'), JSON.stringify(packageJson, null, 2));
    
    console.log("\n=== Testing Analyze Dependencies ===");
    try {
        const analyzeRes = await makeRequest('POST', '/api/packages/analyze', {
            projectPath: "dummy_node_project"
        });
        console.log(JSON.stringify(analyzeRes, null, 2));
    } catch (e) { console.error(e); }

    console.log("\n=== Done ===");
}

runTests();
