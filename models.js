const models = {
    bailian: {
        name: '百炼 Coding',
        description: '阿里云百炼代码助手',
        endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
        model: 'qwen-coding-plus-latest'
    },
    opencode: {
        name: 'OpenCode',
        description: '专业的代码助手',
        endpoint: 'https://api.opencode.ai/v1/chat/completions',
        model: 'huoshan-provider/ep-20260305155106-hn7k6'
    },
    gpt4: {
        name: 'GPT-4',
        description: 'OpenAI GPT-4',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-4'
    },
    claude: {
        name: 'Claude',
        description: 'Anthropic Claude',
        endpoint: 'https://api.anthropic.com/v1/messages',
        model: 'claude-3-sonnet-20240229'
    }
};

function getModelConfig(modelId) {
    return models[modelId];
}

function getAllModels() {
    return Object.keys(models).map(key => ({
        id: key,
        ...models[key]
    }));
}