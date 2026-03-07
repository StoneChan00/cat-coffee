const http = require('http');
const crypto = require('crypto');

const PORT = 3200;

const invocationId = process.env.CAT_CAFE_INVOCATION_ID || crypto.randomUUID();
const callbackToken = process.env.CAT_CAFE_CALLBACK_TOKEN || crypto.randomUUID();

console.log('='.repeat(60));
console.log('Callback Server Started');
console.log('='.repeat(60));
console.log(`Port: ${PORT}`);
console.log(`Invocation ID: ${invocationId}`);
console.log(`Callback Token: ${callbackToken}`);
console.log('='.repeat(60));
console.log('');
console.log('请设置以下环境变量：');
console.log(`export CAT_CAFE_API_URL=http://localhost:${PORT}`);
console.log(`export CAT_CAFE_INVOCATION_ID=${invocationId}`);
console.log(`export CAT_CAFE_CALLBACK_TOKEN=${callbackToken}`);
console.log('='.repeat(60));
console.log('');

const server = http.createServer((req, res) => {
  const { method, url } = req;

  if (method === 'POST' && url === '/api/callbacks/post-message') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { invocationId: reqInvocationId, callbackToken: reqCallbackToken, content } = data;

        if (reqInvocationId !== invocationId || reqCallbackToken !== callbackToken) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          console.log('❌ 验证失败');
          return;
        }

        console.log('🐱 猫说:', content);
        console.log('');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
  } else if (method === 'GET' && url.startsWith('/api/callbacks/thread-context')) {
    const urlObj = new URL(url, `http://localhost:${PORT}`);
    const reqInvocationId = urlObj.searchParams.get('invocationId');
    const reqCallbackToken = urlObj.searchParams.get('callbackToken');

    if (reqInvocationId !== invocationId || reqCallbackToken !== callbackToken) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      console.log('❌ 验证失败');
      return;
    }

    const context = {
      messages: [
        { role: 'user', content: '请写一首关于猫的诗' }
      ]
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(context));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Error: Port ${PORT} is already in use`);
    console.error('Please stop the existing server or use a different port');
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
