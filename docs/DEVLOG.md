# 开发日志

## 2026-03-07

### 重构：项目目录结构优化

**变更内容：**

1. **删除不必要的文件**
   - 删除 `minimal-claude.js` - 早期 CLI 封装脚本，已被 MCP 系统替代
   - 删除 `test-invoke.js` - 测试脚本
   - 删除 `session.json` - session 文件

2. **重组目录结构**
   - 创建 `docs/` 目录 - 存放文档（README.md, DEVLOG.md）
   - 创建 `src/` 目录 - 存放核心代码
   - 创建 `scripts/` 目录 - 存放启动脚本（后删除）

3. **移动文件**
   - `README.md` → `docs/README.md`
   - `DEVLOG.md` → `docs/DEVLOG.md`
   - `callback-server.js` → `src/callback-server.js`
   - `cat-cafe-mcp.js` → `src/cat-cafe-mcp.js`
   - `run-cat.js` → `src/run-cat.js`
   - `run-cat-verbose.js` → `src/run-cat-verbose.js`
   - `run.bat` → `run.bat`（移到根目录）

4. **更新路径引用**
   - 更新 `run.bat` 中的路径引用
   - 更新 `src/run-cat.js` 中的路径引用
   - 更新 `src/run-cat-verbose.js` 中的路径引用
   - 更新 `docs/README.md` 中的路径引用

**最终目录结构：**
```
cat-coffee/
├── docs/                    # 文档
│   ├── README.md
│   └── DEVLOG.md
├── src/                     # 核心代码
│   ├── callback-server.js
│   ├── cat-cafe-mcp.js
│   ├── run-cat.js
│   └── run-cat-verbose.js
├── .env                     # 环境变量
├── package.json             # 依赖配置
├── package-lock.json
├── node_modules/
└── run.bat                  # 启动脚本
```

---

## 2026-03-05

### 功能：创建 opencode CLI 封装脚本

**文件：** `minimal-claude.js`

**功能特性：**
- 使用 Node.js 原生 `child_process.spawn()` 调用 opencode CLI
- 支持流式输出解析（NDJSON 格式）
- 支持多模型切换（火山、百炼）
- Session 恢复功能
- 超时检测和进程清理
- 错误处理和重试机制

**使用方式：**
```bash
# 基本调用
node minimal-claude.js "你好"

# 使用特定模型
node minimal-claude.js "你好" "bailian-coding-plan/glm-4.7"

# 恢复 session
node minimal-claude.js "我叫什么名字？" --resume
```

---

### 功能：添加测试脚本

**文件：** `test-invoke.js`

**功能特性：**
- 测试不同模型的调用
- 验证流式输出
- 错误处理测试

---

### 修复：CLI 子进程调用问题

**问题清单：**

1. ✅ **stderr 活跃信号**
   - 同时监听 stdout 和 stderr
   - 避免 thinking/工具调用时误判超时

2. ✅ **超时设置**
   - 添加二级超时机制（SIGTERM 后等待 5 秒再 SIGKILL）
   - 支持自定义超时时间（默认 5 分钟）

3. ✅ **进程生命周期**
   - 添加 SIGTERM/SIGINT 信号处理
   - 父进程退出时自动清理子进程
   - 防止僵尸进程

4. ✅ **流式解析**
   - 使用 readline 自动处理不完整行
   - 处理粘包情况
   - JSON 解析错误容错

5. ✅ **错误处理**
   - 添加重试机制（指数退避）
   - 详细的错误信息（命令行、session、退出码）
   - 改进 JSON 解析错误处理

**修复内容：**
```javascript
// 重试机制
await invoke('opencode.cmd', prompt, {
  retries: 2,
  timeout: 60000,
  onData: (text) => process.stdout.write(text),
  onError: (err) => process.stderr.write(err.message)
});

// 信号处理
const setupSignalHandlers = () => {
  const signals = ['SIGTERM', 'SIGINT'];
  signals.forEach(signal => {
    const handler = () => {
      cleanup();
      process.exit(1);
    };
    process.on(signal, handler);
  });
};

// 二级超时
const cleanup = async () => {
  proc.kill('SIGTERM');
  await new Promise(resolve => setTimeout(resolve, 5000));
  if (!proc.killed) {
    proc.kill('SIGKILL');
  }
};
```

---

### Git 提交记录

1. `42ee1d9` - Add opencode CLI wrapper with session support
2. `e5fd209` - Fix CLI subprocess issues: add timeout detection, process cleanup, and better error handling
3. `f42d7c2` - Fix all CLI subprocess issues: add retry mechanism, signal handlers, and improved error handling

---

### 可用模型列表

**火山：**
- `huoshan-provider/ep-20260305155106-hn7k6`

**百炼：**
- `bailian-coding-plan/glm-4.7`
- `bailian-coding-plan/glm-5`
- `bailian-coding-plan/qwen3-max-2026-01-23`
- `bailian-coding-plan/qwen3.5-plus`
- `bailian-coding-plan/MiniMax-M2.5`
- `bailian-coding-plan/qwen3-coder-next`
- `bailian-coding-plan/qwen3-coder-plus`
- `bailian-coding-plan/kimi-k2.5`

---

---

## 2026-03-05 (下午)

### 功能：创建 MCP 回传系统

**目的：** 理解"猫主动说话"的机制

**核心概念：**
- AI 通过 CLI 子进程执行任务
- CLI 内部的输出是 AI 的"内心独白"，默认不可见
- AI 可以通过 MCP 工具主动调用 HTTP callback，把消息发到聊天室
- 这样 AI 就有了"选择说什么"的自主权

**创建的文件：**

1. **callback-server.js** — HTTP 回调服务器
   - 监听 3200 端口
   - POST /api/callbacks/post-message - 发送消息到聊天室
   - GET /api/callbacks/thread-context - 获取对话上下文
   - 使用 invocationId 和 callbackToken 进行认证

2. **cat-cafe-mcp.js** — MCP Server
   - 使用 @modelcontextprotocol/sdk 实现
   - 提供 cat_cafe_post_message(content) 工具
   - 提供 cat_cafe_get_context() 工具
   - 通过 stdio 与 opencode 通信

3. **run-cat.js** — 调用脚本
   - 动态挂载 MCP Server
   - 调用 opencode CLI 执行任务
   - 通过环境变量传递认证信息

4. **run.bat** — Windows 启动脚本
   - 启动回调服务器（独立窗口）
   - 设置环境变量
   - 运行调用脚本

**遇到的问题和修复：**

1. ❌ **UUID 生成错误**
   - 问题：`require('crypto').v4()` 不是函数
   - 修复：使用 `crypto.randomUUID()` 代替

2. ❌ **编码问题**
   - 问题：Windows 批处理文件中文乱码
   - 修复：添加 `chcp 65001` 设置 UTF-8 编码

3. ❌ **环境变量设置失败**
   - 问题：批处理文件中直接设置环境变量不生效
   - 修复：使用 `cmd /k` 启动独立窗口

**使用方式：**
```bash
# 方式 1：双击运行（推荐）
双击 run.bat 文件

# 方式 2：手动启动
# 终端 1：启动回调服务器
node callback-server.js

# 终端 2：设置环境变量并运行
set CAT_CAFE_API_URL=http://localhost:3200
set CAT_CAFE_INVOCATION_ID=xxx
set CAT_CAFE_CALLBACK_TOKEN=xxx
node run-cat.js
```

**预期输出：**
```
🐱 猫说: [AI 生成的诗]
```

---

### 待办事项

- [ ] 考虑添加日志文件记录
- [ ] 添加更多测试用例
- [ ] 优化 shell: true 安全问题
- [ ] 添加配置文件支持
- [ ] 测试 MCP 回传系统完整流程
