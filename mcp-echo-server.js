import express from 'express';
import cors from 'cors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';

const app = express();
app.use(express.json());

// Configuração do CORS para permitir apenas o domínio local
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST'],
  credentials: true,
}));

// Debug logger para ajudar no diagnóstico
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  if (req.method === 'POST') {
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

const server = new McpServer({ name: 'EchoServer', version: '1.0.0' });

// Define uma ferramenta 'echo' com um schema simples
server.tool(
  'echo',
  { message: z.string() },
  async ({ message }) => {
    console.log('Echo tool chamado com message:', message);
    return {
      content: [{ type: 'text', text: JSON.stringify({ message }) }]
    };
  }
);

let transport = null;

// Endpoint SSE para iniciar conexão MCP
app.get('/mcp-server/start', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  transport = new SSEServerTransport('/mcp-server/messages', res);
  try {
    await server.connect(transport);
    console.log('✅ Cliente MCP conectado via SSE');
  } catch (error) {
    console.error('❌ Erro ao conectar com o cliente MCP:', error);
    res.status(500).end();
  }
});

// Endpoint POST MCP (mensagens JSON-RPC)
app.post('/mcp-server/messages', async (req, res) => {
  if (!transport) {
    return res.status(503).send('Transporte SSE não iniciado');
  }
  
  try {
    await transport.handlePostMessage(req, res, req.body);
  } catch (error) {
    console.error('❌ Erro ao processar mensagem:', error);
    res.status(500).json({
      error: {
        code: -32000,
        message: 'Erro interno do servidor'
      }
    });
  }
});

app.listen(3002, () => {
  console.log('Servidor MCP rodando em http://localhost:3002/mcp-server/start');
});
