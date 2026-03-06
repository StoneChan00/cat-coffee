# 开发日志

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

### 待办事项

- [ ] 考虑添加日志文件记录
- [ ] 添加更多测试用例
- [ ] 优化 shell: true 安全问题
- [ ] 添加配置文件支持
