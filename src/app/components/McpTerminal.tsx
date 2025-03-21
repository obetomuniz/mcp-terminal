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

type Message = { sender: 'user' | 'server' | 'system'; text: string };

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

    try {
      // Envia a mensagem do usuário para o servidor MCP usando a estrutura correta
      const result = await client.callTool({
        name: 'echo',
        arguments: {
          message: userMessage
        }
      }, undefined, {
        timeout: 10000 // Adiciona um timeout para garantir que a requisição não fique pendente
      }) as McpResponse;
      
      // Adiciona resposta do servidor ao log de mensagens
      const responseText = result?.content?.[0]?.text 
        ? result.content[0].text 
        : JSON.stringify(result);
        
      setMessages(prev => [...prev, { sender: 'server', text: responseText }]);
    } catch (error: unknown) {
      console.error('Erro ao enviar mensagem MCP:', error);
      const errorMessage = error instanceof Error ? error.message : 'Falha ao obter resposta do servidor';
      setMessages(prev => [
        ...prev, 
        { sender: 'system', text: `❌ Erro: ${errorMessage}` }
      ]);
    }
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: 4 }}>
      <h3>Terminal MCP</h3>
      <div style={{ minHeight: '150px', maxHeight: '300px', marginBottom: '0.5rem', background: '#f9f9f9', padding: '0.5rem', borderRadius: 4, overflowY: 'auto' }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{ marginBottom: '0.25rem' }}>
            <strong>{msg.sender === 'user' ? 'Você' : msg.sender === 'server' ? 'Servidor' : 'Sistema'}:</strong> {msg.text}
          </div>
        ))}
      </div>
      <form onSubmit={e => { e.preventDefault(); handleSend(); }}>
        <input 
          type="text" 
          value={inputText} 
          onChange={e => setInputText(e.target.value)} 
          placeholder="Digite uma mensagem..." 
          style={{ width: '80%' }}
        />
        <button type="submit" style={{ width: '18%', marginLeft: '2%' }}>
          Enviar
        </button>
      </form>
    </div>
  );
} 