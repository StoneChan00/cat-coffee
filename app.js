class ChatApp {
    constructor() {
        this.messages = [];
        this.currentModel = 'bailian';
        this.init();
    }

    init() {
        this.setupModelSelector();
        this.setupEventListeners();
        this.loadChatHistory();
    }

    setupModelSelector() {
        const select = document.getElementById('modelSelect');
        const allModels = getAllModels();
        
        allModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.name;
            select.appendChild(option);
        });

        select.addEventListener('change', (e) => {
            this.currentModel = e.target.value;
        });
    }

    setupEventListeners() {
        const sendBtn = document.getElementById('sendBtn');
        const userInput = document.getElementById('userInput');
        const clearBtn = document.getElementById('clearChat');

        sendBtn.addEventListener('click', () => this.sendMessage());
        
        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        clearBtn.addEventListener('click', () => this.clearChat());
    }

    async sendMessage() {
        const userInput = document.getElementById('userInput');
        const message = userInput.value.trim();
        
        if (!message) return;

        userInput.value = '';
        this.addMessage('user', message);
        this.messages.push({ role: 'user', content: message });

        await this.getAIResponse();
    }

    addMessage(role, content) {
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        const sender = role === 'user' ? '你' : getModelConfig(this.currentModel).name;
        messageDiv.innerHTML = `
            <div class="sender">${sender}</div>
            <div class="content">${this.formatMessage(content)}</div>
        `;
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    formatMessage(content) {
        return content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>')
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            .replace(/`([^`]+)`/g, '<code>$1</code>');
    }

    async getAIResponse() {
        const chatMessages = document.getElementById('chatMessages');
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing';
        typingDiv.textContent = `${getModelConfig(this.currentModel).name} 正在思考...`;
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            const modelConfig = getModelConfig(this.currentModel);
            const response = await this.callAI(modelConfig);
            
            typingDiv.remove();
            this.addMessage('assistant', response);
            this.messages.push({ role: 'assistant', content: response });
            this.saveChatHistory();
        } catch (error) {
            typingDiv.remove();
            this.addMessage('assistant', `错误: ${error.message}`);
        }
    }

    async callAI(modelConfig) {
        if (modelConfig.id === 'bailian') {
            return await this.callBailian(modelConfig);
        } else if (modelConfig.id === 'opencode') {
            return await this.callOpenCode(modelConfig);
        } else if (modelConfig.id === 'gpt4') {
            return await this.callOpenAI(modelConfig);
        } else if (modelConfig.id === 'claude') {
            return await this.callClaude(modelConfig);
        }
        throw new Error('不支持的模型');
    }

    async callBailian(modelConfig) {
        const apiKey = localStorage.getItem('bailian_api_key') || 'sk-sp-dab4617b67b44b9a9857410c872857ce';
        
        const response = await fetch(modelConfig.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: modelConfig.model,
                input: {
                    messages: this.messages
                },
                parameters: {
                    temperature: 0.7
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API 请求失败: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return data.output.text;
    }

    async callOpenCode(modelConfig) {
        const apiKey = localStorage.getItem('opencode_api_key');
        if (!apiKey) {
            throw new Error('请先设置 OpenCode API Key (在控制台输入: localStorage.setItem("opencode_api_key", "your_key"))');
        }

        const response = await fetch(modelConfig.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: modelConfig.model,
                messages: this.messages,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`API 请求失败: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    async callOpenAI(modelConfig) {
        const apiKey = localStorage.getItem('openai_api_key');
        if (!apiKey) {
            throw new Error('请先设置 OpenAI API Key');
        }

        const response = await fetch(modelConfig.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: modelConfig.model,
                messages: this.messages,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`API 请求失败: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    async callClaude(modelConfig) {
        const apiKey = localStorage.getItem('anthropic_api_key');
        if (!apiKey) {
            throw new Error('请先设置 Anthropic API Key');
        }

        const response = await fetch(modelConfig.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: modelConfig.model,
                messages: this.messages,
                max_tokens: 4096
            })
        });

        if (!response.ok) {
            throw new Error(`API 请求失败: ${response.status}`);
        }

        const data = await response.json();
        return data.content[0].text;
    }

    saveChatHistory() {
        localStorage.setItem('chat_history', JSON.stringify(this.messages));
    }

    loadChatHistory() {
        const history = localStorage.getItem('chat_history');
        if (history) {
            this.messages = JSON.parse(history);
            this.messages.forEach(msg => {
                this.addMessage(msg.role, msg.content);
            });
        }
    }

    clearChat() {
        this.messages = [];
        document.getElementById('chatMessages').innerHTML = '';
        localStorage.removeItem('chat_history');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.chatApp = new ChatApp();
});