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
    console.log("=== Testing Capabilities ===");
    try {
        const caps = await makeRequest('GET', '/api/universal/capabilities');
        console.log(JSON.stringify(caps, null, 2));
    } catch(e) { console.error(e) }

    console.log("\n=== Testing Ingest (Raw Text) ===");
    try {
        const ingestRes = await makeRequest('POST', '/api/universal/ingest', {
            source: "console.log('Hello from CoreFlow Universal Manager!');",
            targetName: "test.js"
        });
        console.log(JSON.stringify(ingestRes, null, 2));
    } catch(e) { console.error(e) }

    console.log("\n=== Testing Compress ===");
    // Create a dummy dir to compress
    const fs = require('fs');
    const path = require('path');
    const dummyDir = path.join(process.cwd(), 'workspace_run', 'dummy_project');
    if (!fs.existsSync(dummyDir)) {
        fs.mkdirSync(dummyDir, { recursive: true });
    }
    fs.writeFileSync(path.join(dummyDir, 'index.js'), 'console.log("dummy");');
    
    try {
        const compressRes = await makeRequest('POST', '/api/universal/compress', {
            sourceDir: dummyDir,
            format: "tar.gz"
        });
        console.log(JSON.stringify(compressRes, null, 2));
    } catch(e) { console.error(e) }

    console.log("\n=== Testing Pipeline ===");
    try {
        const pipelineRes = await makeRequest('POST', '/api/universal/pipeline', {
            source: "console.log('Pipeline test!');",
            targetName: "pipeline_test.js",
            destination: "local",
            format: "tar.gz"
        });
        console.log(JSON.stringify(pipelineRes, null, 2));
    } catch(e) { console.error(e) }
}

runTests();
