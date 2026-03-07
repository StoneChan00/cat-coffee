const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');

const API_URL = process.env.CAT_CAFE_API_URL || 'http://localhost:3200';
const INVOCATION_ID = process.env.CAT_CAFE_INVOCATION_ID;
const CALLBACK_TOKEN = process.env.CAT_CAFE_CALLBACK_TOKEN;

if (!INVOCATION_ID || !CALLBACK_TOKEN) {
  console.error('Error: CAT_CAFE_INVOCATION_ID and CAT_CAFE_CALLBACK_TOKEN must be set');
  process.exit(1);
}

async function httpRequest(url, options = {}) {
  const http = require('http');
  const https = require('https');
  const client = url.startsWith('https') ? https : http;

  return new Promise((resolve, reject) => {
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed)}`));
          }
        } catch (err) {
          reject(new Error(`Invalid JSON response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

const server = new Server(
  {
    name: 'cat-cafe-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'cat_cafe_post_message',
        description: '发送消息到猫咖啡聊天室',
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: '要发送的消息内容',
            },
          },
          required: ['content'],
        },
      },
      {
        name: 'cat_cafe_get_context',
        description: '获取当前对话的上下文',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'cat_cafe_post_message') {
    const { content } = args;

    const url = `${API_URL}/api/callbacks/post-message`;
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const body = JSON.stringify({
      invocationId: INVOCATION_ID,
      callbackToken: CALLBACK_TOKEN,
      content,
    });

    const client = url.startsWith('https') ? require('https') : require('http');

    return new Promise((resolve, reject) => {
      const req = client.request(url, options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({
                content: [
                  {
                    type: 'text',
                    text: `消息已发送: ${content}`,
                  },
                ],
              });
            } else {
              resolve({
                content: [
                  {
                    type: 'text',
                    text: `发送失败: ${JSON.stringify(parsed)}`,
                  },
                ],
                isError: true,
              });
            }
          } catch (err) {
            resolve({
              content: [
                {
                  type: 'text',
                  text: `解析响应失败: ${data}`,
                },
              ],
              isError: true,
            });
          }
        });
      });

      req.on('error', (err) => {
        resolve({
          content: [
            {
              type: 'text',
              text: `请求失败: ${err.message}`,
            },
          ],
          isError: true,
        });
      });

      req.write(body);
      req.end();
    });
  } else if (name === 'cat_cafe_get_context') {
    const url = `${API_URL}/api/callbacks/thread-context?invocationId=${INVOCATION_ID}&callbackToken=${CALLBACK_TOKEN}`;

    try {
      const data = await httpRequest(url);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: 'text',
            text: `获取上下文失败: ${err.message}`,
          },
        ],
        isError: true,
      };
    }
  } else {
    throw new Error(`Unknown tool: ${name}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Cat Cafe MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
