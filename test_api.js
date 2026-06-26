const http = require('http');

const data = JSON.stringify({
    goal: 'أنشئ تطبيق React كامل للتذكير بالمهام مع واجهة جميلة وقاعدة بيانات'
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/execute',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }
};

const req = http.request(options, res => {
    let rawData = '';
    res.on('data', chunk => { rawData += chunk; });
    res.on('end', () => {
        console.log(JSON.stringify(JSON.parse(rawData), null, 2));
    });
});

req.on('error', e => {
    console.error(`Problem with request: ${e.message}`);
});

req.write(data);
req.end();
