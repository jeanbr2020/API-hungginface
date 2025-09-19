class ChatApp {
    constructor() {
        // Elementos do DOM
        this.chatContainer = document.getElementById('chatContainer');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.clearButton = document.getElementById('clearButton');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.statusIndicator = document.getElementById('status');
        this.statusText = document.getElementById('statusText');
        this.charCount = document.getElementById('charCount');

        // Estado da aplicação
        this.isLoading = false;
        this.messageHistory = [];

        // Inicializar
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkModelStatus();
        this.focusInput();
    }

    setupEventListeners() {
        // Enviar mensagem
        this.sendButton.addEventListener('click', () => this.sendMessage());
        
        // Enter para enviar
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Contador de caracteres
        this.messageInput.addEventListener('input', (e) => {
            this.updateCharCount(e.target.value.length);
        });

        // Limpar chat
        this.clearButton.addEventListener('click', () => this.clearChat());

        // Foco automático ao clicar no container
        this.chatContainer.addEventListener('click', () => {
            if (!this.isLoading) {
                this.messageInput.focus();
            }
        });
    }

    async checkModelStatus() {
        try {
            this.updateStatus('Verificando modelo...', 'loading');
            
            const response = await fetch('/status');
            const data = await response.json();
            
            // Atualiza informações do dispositivo
            if (data.device_info && document.getElementById('deviceInfo')) {
                const device = data.device_info.cuda_available ? 
                    `GPU (${data.device_info.gpu_name || 'CUDA'})` : 'CPU';
                document.getElementById('deviceInfo').textContent = `Dispositivo: ${device}`;
            }
            
            if (data.model_loaded) {
                this.updateStatus('Modelo carregado ✅', 'online');
            } else {
                this.updateStatus(data.loading_status || 'Carregando modelo...', 'loading');
                // Verifica novamente em 5 segundos se ainda está carregando
                setTimeout(() => this.checkModelStatus(), 5000);
            }
        } catch (error) {
            this.updateStatus('Erro de conexão ❌', 'offline');
            console.error('Erro ao verificar status:', error);
        }
    }

    updateStatus(text, type) {
        this.statusText.textContent = text;
        this.statusIndicator.className = `status-indicator ${type}`;
    }

    updateCharCount(count) {
        this.charCount.textContent = `${count}/200`;
        if (count > 180) {
            this.charCount.style.color = '#dc3545';
        } else if (count > 150) {
            this.charCount.style.color = '#ffc107';
        } else {
            this.charCount.style.color = '#666';
        }
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        
        if (!message || this.isLoading) {
            return;
        }

        // Adicionar mensagem do usuário
        this.addMessage(message, 'user');
        this.messageHistory.push({ role: 'user', content: message });
        
        // Limpar input e mostrar loading
        this.messageInput.value = '';
        this.updateCharCount(0);
        this.setLoading(true);

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: message })
            });

            const data = await response.json();

            if (data.success) {
                this.addMessage(data.response, 'bot');
                this.messageHistory.push({ role: 'assistant', content: data.response });
                
                // Mostra informações do dispositivo se disponível
                const deviceInfo = data.device ? ` (${data.device})` : '';
                this.updateStatus(`Resposta gerada ✅${deviceInfo}`, 'online');
            } else {
                this.handleError(data.error, response.status, data.loading);
            }

        } catch (error) {
            this.handleError('Erro de conexão. Tente novamente.', null);
            console.error('Erro:', error);
        } finally {
            this.setLoading(false);
            this.focusInput();
        }
    }

    handleError(errorMessage, statusCode, isLoading) {
        let displayMessage = errorMessage;
        let statusMessage = 'Erro ❌';

        if (isLoading || statusCode === 503) {
            displayMessage = 'O modelo ainda está carregando. Isso pode levar alguns minutos na primeira execução.';
            statusMessage = 'Carregando modelo ⏳';
            this.updateStatus(statusMessage, 'loading');
            
            // Verifica status novamente em 10 segundos
            setTimeout(() => this.checkModelStatus(), 10000);
        } else if (statusCode === 408) {
            displayMessage = 'Timeout - o modelo pode estar ocupado. Tente novamente.';
            statusMessage = 'Timeout ⏳';
            this.updateStatus(statusMessage, 'loading');
        } else {
            this.updateStatus(statusMessage, 'offline');
        }

        this.addMessage(displayMessage, 'error');
    }

    addMessage(content, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = content;

        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = this.getCurrentTime();

        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(timeDiv);
        
        this.chatContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    getCurrentTime() {
        const now = new Date();
        return now.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    setLoading(loading) {
        this.isLoading = loading;
        
        if (loading) {
            this.loadingIndicator.classList.add('active');
            this.sendButton.disabled = true;
            this.sendButton.querySelector('.btn-text').textContent = 'Enviando...';
            this.messageInput.disabled = true;
        } else {
            this.loadingIndicator.classList.remove('active');
            this.sendButton.disabled = false;
            this.sendButton.querySelector('.btn-text').textContent = 'Enviar';
            this.messageInput.disabled = false;
        }
    }

    scrollToBottom() {
        setTimeout(() => {
            this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
        }, 100);
    }

    focusInput() {
        setTimeout(() => {
            this.messageInput.focus();
        }, 100);
    }

    clearChat() {
        // Confirmação
        if (this.messageHistory.length > 2) { // Mais que a mensagem inicial
            if (!confirm('Deseja limpar todo o histórico do chat?')) {
                return;
            }
        }

        // Limpar container
        this.chatContainer.innerHTML = `
            <div class="message bot-message">
                <div class="message-content">
                    Olá! Sou o DialoGPT da Microsoft. Como posso ajudá-lo hoje?
                </div>
                <div class="message-time">Sistema</div>
            </div>
        `;

        // Resetar histórico
        this.messageHistory = [];
        
        // Feedback visual
        this.updateStatus('Chat limpo ✅', 'online');
        
        // Focar no input
        this.focusInput();

        // Verificar status do modelo novamente
        setTimeout(() => {
            this.checkModelStatus();
        }, 2000);
    }

    // Método público para debugging
    getHistory() {
        return this.messageHistory;
    }

    // Método para exportar conversa
    exportChat() {
        const messages = this.chatContainer.querySelectorAll('.message');
        let chatText = 'Conversa com DialoGPT\n';
        chatText += '='.repeat(30) + '\n\n';

        messages.forEach(message => {
            const content = message.querySelector('.message-content').textContent;
            const time = message.querySelector('.message-time').textContent;
            const type = message.classList.contains('user-message') ? 'Você' : 'Bot';
            
            chatText += `[${time}] ${type}: ${content}\n\n`;
        });

        // Criar download
        const blob = new Blob([chatText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat_${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// Inicializar aplicação quando DOM carregar
document.addEventListener('DOMContentLoaded', () => {
    window.chatApp = new ChatApp();
    
    // Adicionar atalhos de teclado
    document.addEventListener('keydown', (e) => {
        // Ctrl+L para limpar chat
        if (e.ctrlKey && e.key === 'l') {
            e.preventDefault();
            window.chatApp.clearChat();
        }
        
        // Ctrl+E para exportar chat
        if (e.ctrlKey && e.key === 'e') {
            e.preventDefault();
            window.chatApp.exportChat();
        }
    });

    // Log de inicialização
    console.log('🤖 Chat DialoGPT inicializado');
    console.log('💡 Dicas:');
    console.log('   - Ctrl+L: Limpar chat');
    console.log('   - Ctrl+E: Exportar conversa');
    console.log('   - Enter: Enviar mensagem');
});