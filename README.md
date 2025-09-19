# 🤖 Chat com DialoGPT Local - Transformers

Uma aplicação web que roda o modelo DialoGPT **localmente** usando a biblioteca `transformers`.

## 📁 Estrutura do Projeto

```
projeto/
├── app.py                 # Backend Python (Flask + Transformers)
├── requirements.txt       # Dependências Python
├── templates/
│   └── index.html        # HTML principal
└── static/
    ├── style.css         # Estilos CSS
    └── script.js         # JavaScript frontend
```

## 🚀 Instalação e Execução

### 1. Pré-requisitos

- **Python 3.8+**
- **4GB+ de RAM** (recomendado 8GB+)
- **2GB+ espaço livre** (para download do modelo)
- **GPU com CUDA** (opcional, mas muito mais rápido)

### 2. Crie a estrutura de pastas
```bash
mkdir projeto
cd projeto
mkdir templates static
```

### 3. Instale as dependências
```bash
pip install -r requirements.txt
```

**⚠️ Nota:** A instalação do PyTorch pode demorar alguns minutos.

### 4. Execute o servidor
```bash
python app.py
```

### 5. Acesse no navegador
```
http://localhost:5000
```

## ⚡ Funcionamento

### 🔄 **Primeira execução:**
1. Servidor inicia imediatamente
2. Modelo é baixado em background (~1GB)
3. Chat funciona após carregamento completo
4. Status é atualizado em tempo real

### 🚀 **Execuções seguintes:**
- Modelo já está baixado
- Carregamento rápido (~30 segundos)
- Respostas instantâneas

## 🎯 Vantagens da Versão Local

### ✅ **Benefícios:**
- **Sem limites de API** - Use quantas vezes quiser
- **Privacidade total** - Dados não saem do seu computador  
- **Funciona offline** - Após download inicial
- **Sem erros 401/429** - Não depende de APIs externas
- **Customizável** - Pode ajustar parâmetros do modelo

### 📊 **Performance:**
- **Com GPU:** Respostas em ~1-2 segundos
- **Apenas CPU:** Respostas em ~5-10 segundos
- **RAM necessária:** 3-4GB durante uso

## 🔧 Dependências Principais

- **Flask** - Servidor web
- **Transformers** - Biblioteca da Hugging Face
- **PyTorch** - Framework de deep learning  
- **Accelerate** - Otimizações de performance

## 🐛 Solução de Problemas

### **Modelo não carrega:**
```bash
# Limpar cache se necessário
python -c "from transformers import AutoModel; AutoModel.from_pretrained('microsoft/DialoGPT-medium', force_download=True)"
```

### **Pouca memória:**
- Use modelo menor: `microsoft/DialoGPT-small`
- Feche outros programas
- Reinicie o sistema

### **Muito lento:**
- Instale CUDA para usar GPU
- Use modelo DistilGPT-2 (mais rápido)

## 🎛️ Personalização

### **Trocar modelo:**
No `app.py`, linha 11:
```python
MODEL_NAME = "microsoft/DialoGPT-small"  # Mais rápido
# ou
MODEL_NAME = "gpt2"  # Alternativo
```

### **Ajustar geração:**
Na função `generate_response()`:
```python
outputs = model.generate(
    inputs,
    max_length=200,        # Respostas mais longas
    temperature=0.8,       # Mais criativo (0.1-1.0)
    top_p=0.9             # Controle de qualidade
)
```

## 🔍 Monitoramento

- **Status em tempo real** na interface
- **Logs detalhados** no terminal
- **Debug endpoint:** `/debug`
- **Status endpoint:** `/status`

## 💡 Dicas de Uso

- **Primeira conversa pode ser menos fluida** (modelo "esquentando")
- **Respostas melhoram com contexto** - mantenha conversa
- **GPU faz MUITA diferença** na velocidade
- **Modelo aprende durante conversa** (contexto limitado)

---

**🎉 Agora você tem um ChatBot totalmente privado e local!**