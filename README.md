# AI 聊天室

一个可扩展的多模型 AI 聊天室应用，支持与多个 AI 模型进行对话。

## 功能特点

- 支持多个 AI 模型切换
- 实时对话体验
- 对话历史保存
- 代码高亮显示
- 响应式设计

## 使用方法

1. 直接在浏览器中打开 `index.html` 文件
2. 首次使用前需要设置 API Key：

### 设置 OpenCode API Key
在浏览器控制台（F12）中运行：
```javascript
localStorage.setItem('opencode_api_key', 'your_api_key_here')
```

### 设置 OpenAI API Key
```javascript
localStorage.setItem('openai_api_key', 'your_api_key_here')
```

### 设置 Anthropic API Key
```javascript
localStorage.setItem('anthropic_api_key', 'your_api_key_here')
```

## 添加新模型

在 `models.js` 文件中添加新的模型配置：

```javascript
const models = {
    // 现有模型...
    newModel: {
        name: '模型名称',
        description: '模型描述',
        endpoint: 'API 端点',
        model: '模型 ID'
    }
};
```

然后在 `app.js` 的 `callAI` 方法中添加对应的调用逻辑。

## 技术栈

- 纯 HTML/CSS/JavaScript
- 无需构建工具
- LocalStorage 存储数据

## 注意事项

- API Key 存储在浏览器 LocalStorage 中，请注意安全
- 不同模型需要对应的 API Key
- 确保网络连接正常