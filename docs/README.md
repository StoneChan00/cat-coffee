# 猫咖啡 MCP 回传系统

一个最小的 MCP (Model Context Protocol) 回传系统，用于理解"猫主动说话"的机制。

## 核心概念

- AI 通过 CLI 子进程执行任务
- CLI 内部的输出是 AI 的"内心独白"，默认不可见
- AI 可以通过 MCP 工具主动调用 HTTP callback，把消息发到聊天室
- 这样 AI 就有了"选择说什么"的自主权

## 文件说明

### 1. src/callback-server.js — HTTP 回调服务器

监听 3200 端口，提供两个 API：

- `POST /api/callbacks/post-message` - 发送消息到聊天室
- `GET /api/callbacks/thread-context` - 获取对话上下文

### 2. src/cat-cafe-mcp.js — MCP Server

提供两个 MCP 工具：

- `cat_cafe_post_message(content)` - 发送消息到聊天室
- `cat_cafe_get_context()` - 获取对话上下文

### 3. src/run-cat.js — 调用脚本

启动 opencode CLI，动态挂载 MCP Server。

## 使用步骤

### 1. 安装依赖

```bash
npm install @modelcontextprotocol/sdk
```

### 2. 启动回调服务器

```bash
node src/callback-server.js
```

服务器会输出：
```
============================================================
Callback Server Started
============================================================
Port: 3200
Invocation ID: xxx-xxx-xxx
Callback Token: xxx-xxx-xxx
============================================================

请设置以下环境变量：
export CAT_CAFE_API_URL=http://localhost:3200
export CAT_CAFE_INVOCATION_ID=xxx-xxx-xxx
export CAT_CAFE_CALLBACK_TOKEN=xxx-xxx-xxx
============================================================
```

### 3. 设置环境变量

```bash
export CAT_CAFE_API_URL=http://localhost:3200
export CAT_CAFE_INVOCATION_ID=xxx-xxx-xxx
export CAT_CAFE_CALLBACK_TOKEN=xxx-xxx-xxx
```

### 4. 运行调用脚本

```bash
node src/run-cat.js
```

## 预期输出

```
============================================================
启动 opencode with MCP Server
============================================================
============
MCP Config: {
  "mcpServers": {
    "cat-cafe": {
      "command": "node",
      "args": [".../cat-cafe-mcp.js"]
    }
  }
}
============================================================

[opencode 输出...]

🐱 猫说: [AI 生成的诗]
```

## 工作流程

1. **启动回调服务器** - 生成 invocationId 和 callbackToken
2. **设置环境变量** - MCP Server 使用这些变量进行认证
3. **启动 opencode** - 挂载 MCP Server
4. **AI 调用工具**:
   - `cat_cafe_get_context()` - 获取对话上下文
   - `cat_cafe_post_message()` - 发送消息到聊天室
5. **回调服务器接收** - 验证并打印消息

## 技术细节

### 认证机制

- 使用 invocationId 和 callbackToken 进行双向验证
- 防止未授权访问

### MCP 协议

- 使用 `@modelcontextprotocol/sdk` 实现
- 通过 stdio 进行通信
- 支持工具调用和上下文获取

### HTTP 通信

- 使用原生 Node.js http 模块
- JSON 格式的请求和响应
- 错误处理和状态码检查
