from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch
import threading
import time

app = Flask(__name__)
CORS(app)

# Configurações globais
MODEL_NAME = "microsoft/DialoGPT-medium"
model = None
tokenizer = None
model_loaded = False
loading_status = "Carregando modelo..."

def load_model():
    """Carrega o modelo DialoGPT localmente"""
    global model, tokenizer, model_loaded, loading_status
    
    try:
        print("🚀 Iniciando carregamento do modelo DialoGPT...")
        loading_status = "Baixando tokenizer..."
        
        # Carrega o tokenizer
        tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        
        # Adiciona token de padding se não existir
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token
        
        print("✅ Tokenizer carregado!")
        loading_status = "Baixando modelo (pode demorar na primeira vez)..."
        
        # Carrega o modelo
        model = AutoModelForCausalLM.from_pretrained(
            MODEL_NAME,
            torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
            device_map="auto" if torch.cuda.is_available() else None
        )
        
        # Move para GPU se disponível
        device = "cuda" if torch.cuda.is_available() else "cpu"
        if not torch.cuda.is_available():
            model = model.to(device)
            
        model.eval()  # Modo de inferência
        
        print(f"✅ Modelo carregado! Usando dispositivo: {device}")
        loading_status = "Modelo pronto!"
        model_loaded = True
        
    except Exception as e:
        print(f"❌ Erro ao carregar modelo: {e}")
        loading_status = f"Erro: {str(e)}"
        model_loaded = False

def generate_response(message, max_length=100):
    """Gera resposta usando o modelo local"""
    global model, tokenizer
    
    if not model_loaded:
        return "Modelo ainda não foi carregado. Aguarde alguns minutos."
    
    try:
        # Prepara o input
        input_text = message + tokenizer.eos_token
        
        # Tokeniza
        inputs = tokenizer.encode(input_text, return_tensors='pt')
        
        # Move para o mesmo dispositivo do modelo
        device = next(model.parameters()).device
        inputs = inputs.to(device)
        
        # Gera resposta
        with torch.no_grad():
            outputs = model.generate(
                inputs,
                max_length=inputs.shape[1] + max_length,
                num_return_sequences=1,
                temperature=0.7,
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id,
                eos_token_id=tokenizer.eos_token_id,
                attention_mask=torch.ones_like(inputs)
            )
        
        # Decodifica apenas a parte nova (resposta)
        response = tokenizer.decode(
            outputs[0][inputs.shape[1]:], 
            skip_special_tokens=True
        ).strip()
        
        # Se resposta vazia, tenta novamente com parâmetros diferentes
        if not response or len(response) < 3:
            with torch.no_grad():
                outputs = model.generate(
                    inputs,
                    max_length=inputs.shape[1] + 50,
                    num_return_sequences=1,
                    temperature=0.9,
                    do_sample=True,
                    pad_token_id=tokenizer.eos_token_id,
                    top_p=0.9
                )
            
            response = tokenizer.decode(
                outputs[0][inputs.shape[1]:], 
                skip_special_tokens=True
            ).strip()
        
        return response if response else "Desculpe, não consegui gerar uma resposta adequada."
        
    except Exception as e:
        print(f"Erro na geração: {e}")
        return f"Erro ao gerar resposta: {str(e)}"

@app.route('/')
def index():
    """Serve a página principal"""
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    """Endpoint para conversar com o DialoGPT local"""
    try:
        print("📨 Recebendo requisição no /chat")
        
        if not model_loaded:
            return jsonify({
                'success': False,
                'error': f'Modelo ainda não carregado. Status: {loading_status}',
                'loading': True
            }), 503
        
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'Dados JSON não encontrados'
            }), 400
            
        message = data.get('message', '').strip()
        print(f"💬 Mensagem: {message}")
        
        if not message:
            return jsonify({
                'success': False,
                'error': 'Mensagem não pode estar vazia'
            }), 400
        
        # Gera resposta
        print("🤖 Gerando resposta...")
        response = generate_response(message)
        print(f"✅ Resposta gerada: {response}")
        
        return jsonify({
            'success': True,
            'response': response,
            'model': f'{MODEL_NAME} (Local)',
            'device': 'GPU' if torch.cuda.is_available() else 'CPU'
        })
        
    except Exception as e:
        print(f"💥 Erro no chat: {e}")
        return jsonify({
            'success': False,
            'error': f'Erro interno: {str(e)}'
        }), 500

@app.route('/status', methods=['GET'])
def status():
    """Verifica status do modelo local"""
    try:
        device_info = {
            'cuda_available': torch.cuda.is_available(),
            'device_count': torch.cuda.device_count() if torch.cuda.is_available() else 0,
            'current_device': torch.cuda.current_device() if torch.cuda.is_available() else 'cpu'
        }
        
        if torch.cuda.is_available():
            device_info['gpu_name'] = torch.cuda.get_device_name()
            device_info['gpu_memory'] = f"{torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB"
        
        return jsonify({
            'model_loaded': model_loaded,
            'loading_status': loading_status,
            'model_name': MODEL_NAME,
            'device_info': device_info,
            'status': 'online' if model_loaded else 'loading'
        })
        
    except Exception as e:
        return jsonify({
            'model_loaded': False,
            'error': str(e),
            'status': 'error'
        })

@app.route('/favicon.ico')
def favicon():
    """Serve um favicon simples"""
    return '', 204

@app.route('/debug', methods=['GET'])
def debug():
    """Rota para debug do sistema"""
    import sys
    import psutil
    
    try:
        return jsonify({
            'python_version': sys.version,
            'torch_version': torch.__version__,
            'cuda_available': torch.cuda.is_available(),
            'model_loaded': model_loaded,
            'memory_usage': f"{psutil.virtual_memory().percent}%",
            'cpu_count': psutil.cpu_count(),
            'loading_status': loading_status
        })
    except Exception as e:
        return jsonify({'error': str(e)})

if __name__ == '__main__':
    print("🤖 Iniciando Chat DialoGPT Local")
    print("=" * 50)
    print(f"📱 Interface: http://localhost:5000")
    print(f"🧠 Modelo: {MODEL_NAME}")
    print(f"💻 Dispositivo: {'GPU (CUDA)' if torch.cuda.is_available() else 'CPU'}")
    print("⚡ Carregando modelo em background...")
    print("=" * 50)
    
    # Carrega o modelo em thread separada para não bloquear o Flask
    model_thread = threading.Thread(target=load_model)
    model_thread.daemon = True
    model_thread.start()
    
    app.run(debug=False, host='0.0.0.0', port=5000)