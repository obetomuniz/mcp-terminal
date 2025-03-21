"use client"

import { useEffect, useRef, useState } from 'react';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

// Define response type interface
interface McpResponse {
  content?: Array<{
    type: string;
    text?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

type Message = { 
  sender: 'user' | 'server' | 'system'; 
  text: string;
  tool?: string; // Identificador da ferramenta que processou a mensagem
  isProcessing?: boolean; // Flag para indicar mensagem em processamento
  id?: string; // ID único para identificar mensagens
};

// Componente para mensagens padrão
const DefaultMessage = ({ message }: { message: Message }) => {
  return (
    <div className="mb-1 p-1.5 rounded bg-slate-600">
      <strong>{message.sender === 'user' ? 'Você' : message.sender === 'server' ? 'Servidor' : 'Sistema'}:</strong> {message.text}
    </div>
  );
};

// Componente específico para mensagens Echo
const EchoMessage = ({ message }: { message: Message }) => {
  return (
    <div className="mb-1 text-red-300 font-bold border border-red-900 p-1.5 rounded bg-red-900/30">
      <strong>Echo:</strong> {message.text}
    </div>
  );
};

// Componente para mensagens em processamento
const ProcessingMessage = () => {
  return (
    <div className="mb-1 p-1.5 rounded bg-yellow-900/30 border border-yellow-800 text-yellow-300 animate-pulse">
      <strong>Processando</strong> <span className="inline-block">...</span>
    </div>
  );
};

// Componente que decide qual tipo de mensagem renderizar
const MessageDisplay = ({ message }: { message: Message }) => {
  if (message.isProcessing) {
    return <ProcessingMessage />;
  }
  if (message.tool === 'echo') {
    return <EchoMessage message={message} />;
  }
  return <DefaultMessage message={message} />;
};

export default function McpTerminal() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const mcpClientRef = useRef<Client | null>(null);

  useEffect(() => {
    // Inicializa o cliente MCP com um nome e versão (identificação opcional)
    const client = new Client({ name: 'MyMCPClient', version: '0.1.0' });
    // Configura o transporte SSE, apontando para a URL base do servidor MCP
    const serverUrl = new URL('http://localhost:3002/mcp-server/start');
    const transport = new SSEClientTransport(serverUrl);
    
    // Conecta ao servidor MCP usando o transporte definido
    client.connect(transport).then(() => {
      // Assim que conectar, podemos registrar uma mensagem no log de chat
      setMessages(prev => [
        ...prev, 
        { sender: 'system', text: '✅ Conectado ao servidor MCP.' }
      ]);
    }).catch(error => {
      console.error('Erro ao conectar MCP client:', error);
      setMessages(prev => [
        ...prev, 
        { sender: 'system', text: '❌ Erro ao conectar ao servidor MCP.' }
      ]);
    });

    // Guarda o client na referência para usar posteriormente
    mcpClientRef.current = client;

    // Cleanup: ao desmontar, tenta desconectar se disponível
    return () => {
      if (client.connect && typeof client.connect === 'function') {
        try {
          // Não há método disconnect na API do SDK - apenas fechamos a ref
          mcpClientRef.current = null;
        } catch (error) {
          console.error('Erro ao finalizar conexão:', error);
        }
      }
    };
  }, []);

  const handleSend = async () => {
    if (!mcpClientRef.current) return;
    const client = mcpClientRef.current;
    const userMessage = inputText.trim();
    if (userMessage === '') return;

    // Adiciona mensagem do usuário ao log
    setMessages(prev => [...prev, { sender: 'user', text: userMessage }]);
    setInputText(''); // limpa o campo de input

    // Verifica se a mensagem é um comando
    if (userMessage.startsWith('@')) {
      // Comando @echo
      if (userMessage.startsWith('@echo ')) {
        try {
          // Extrai o texto após o comando "@echo "
          const echoMessage = userMessage.substring(6).trim();
          
          // Gera um ID único para esta requisição
          const requestId = Date.now().toString();
          
          // Adiciona mensagem de processamento
          setMessages(prev => [...prev, { 
            sender: 'server', 
            text: 'Processando comando echo...',
            isProcessing: true,
            id: requestId
          }]);
          
          // Envia a mensagem do usuário para o servidor MCP usando a estrutura correta
          const result = await client.callTool({
            name: 'echo',
            arguments: {
              message: echoMessage
            }
          }, undefined, {
            timeout: 10000 // Adiciona um timeout para garantir que a requisição não fique pendente
          }) as McpResponse;
          
          // Adiciona resposta do servidor ao log de mensagens
          const responseText = JSON.parse(result?.content?.[0]?.text || '');
          
          // Remove a mensagem de processamento e adiciona a resposta real
          setMessages(prev => {
            const filtered = prev.filter(msg => !(msg.isProcessing && msg.id === requestId));
            return [...filtered, { 
              sender: 'server', 
              text: responseText.message,
              tool: 'echo' // Marca esta mensagem como processada pela ferramenta 'echo'
            }];
          });
        } catch (error: unknown) {
          console.error('Erro ao enviar mensagem MCP:', error);
          const errorMessage = error instanceof Error ? error.message : 'Falha ao obter resposta do servidor';
          
          // Remove qualquer mensagem de processamento e adiciona mensagem de erro
          setMessages(prev => {
            const filtered = prev.filter(msg => !msg.isProcessing);
            return [...filtered, { 
              sender: 'system', 
              text: `❌ Erro: ${errorMessage}` 
            }];
          });
        }
      } else {
        // Outros comandos futuros podem ser adicionados aqui
        setMessages(prev => [
          ...prev, 
          { sender: 'system', text: 'Comando não reconhecido.' }
        ]);
      }
    } else {
      // Texto livre (não é um comando)
      // No futuro, aqui pode processar o texto para a LLM ou outros serviços
      setMessages(prev => [
        ...prev, 
        { sender: 'system', text: 'Processamento de texto livre será implementado em breve.' }
      ]);
    }
  };

  return (
    <div className="border border-gray-300 p-4 rounded bg-slate-800 text-gray-100">
      <h3 className="text-lg font-medium mb-2">Terminal MCP</h3>
      <div className="min-h-[150px] max-h-[300px] mb-2 bg-slate-700 p-2 rounded overflow-y-auto">
        {messages.map((msg, idx) => (
          <MessageDisplay key={idx} message={msg} />
        ))}
      </div>
      <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="flex gap-2">
        <input 
          type="text" 
          value={inputText} 
          onChange={e => setInputText(e.target.value)} 
          placeholder="Digite uma mensagem..." 
          className="flex-grow px-2 py-1 border border-slate-600 rounded bg-slate-700 text-gray-100 placeholder:text-gray-400"
        />
        <button 
          type="submit" 
          className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors"
        >
          Enviar
        </button>
      </form>
    </div>
  );
} 