const { spawn } = require('child_process');
const path = require('path');

const API_URL = process.env.CAT_CAFE_API_URL || 'http://localhost:3200';
const INVOCATION_ID = process.env.CAT_CAFE_INVOCATION_ID;
const CALLBACK_TOKEN = process.env.CAT_CAFE_CALLBACK_TOKEN;

if (!INVOCATION_ID || !CALLBACK_TOKEN) {
  console.error('Error: 请先启动 callback-server.js 并设置环境变量');
  console.error('运行: node callback-server.js');
  console.error('然后设置:');
  console.error('  export CAT_CAFE_API_URL=http://localhost:3200');
  console.error('  export CAT_CAFE_INVOCATION_ID=xxx');
  console.error('  export CAT_CAFE_CALLBACK_TOKEN=xxx');
  process.exit(1);
}

const mcpConfig = {
  mcpServers: {
    'cat-cafe': {
      command: 'node',
      args: [path.join(__dirname, 'cat-cafe-mcp.js')],
      env: {
        CAT_CAFE_API_URL: API_URL,
        CAT_CAFE_INVOCATION_ID: INVOCATION_ID,
        CAT_CAFE_CALLBACK_TOKEN: CALLBACK_TOKEN,
      },
    },
  },
};

const prompt = `你的任务是写一首关于关于猫的诗。
在开始写之前，先用 cat_cafe_get_context 获取上下文。
写完后，用 cat_cafe_post_message 把诗发到聊天室。
注意：你的思考过程不需要发送，只把最终的诗发到聊天室即可。`;

const args = [
    'run',
    prompt,
    '--format', 'json',
    '--mcp-config', JSON.stringify(mcpConfig)
];

console.log('='.repeat(60));
console.log('启动 opencode with MCP Server');
console.log('='.repeat(60));
console.log('MCP Config:', JSON.stringify(mcpConfig, null, 2));
console.log('='.repeat(60));
console.log('');

const proc = spawn('opencode.cmd', args, {
  stdio: 'inherit',
  shell: true
});

proc.on('exit', (code) => {
  console.log(`\nProcess exited with code ${code}`);
  process.exit(code);
});

proc.on('error', (err) => {
  console.error('Error:', err);
  process.exit(1);
});

proc.on('exit', (code) => {
  console.log(`\nProcess exited with code ${code}`);
  process.exit(code);
});

proc.on('error', (err) => {
  console.error('Error:', err);
  process.exit(1);
});
