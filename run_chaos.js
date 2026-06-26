const http = require('http');

const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/chaos-test',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
}, res => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
        try {
            console.log(JSON.stringify(JSON.parse(data), null, 2));
        } catch(e) {
            console.log(data);
        }
        process.exit(0);
    });
});

req.on('error', e => {
    console.error(e);
    process.exit(1);
});

req.end();
