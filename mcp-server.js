import express from 'express';
import cors from 'cors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';

const CONFIG = {
  PORT: 3002,
  CORS_ORIGIN: 'http://localhost:3000',
  SERVER_NAME: 'EchoServer',
  SERVER_VERSION: '1.0.0',
  ENDPOINTS: {
    START: '/mcp-server/start',
    MESSAGES: '/mcp-server/messages'
  }
};

// Express Server Setup
const app = express();

// Middlewares
app.use(express.json());
app.use(cors({
  origin: CONFIG.CORS_ORIGIN,
  methods: ['GET', 'POST'],
  credentials: true,
}));

// Request logging middleware
const requestLogger = (req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  if (req.method === 'POST') {
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }
  next();
};
app.use(requestLogger);

// MCP Server Setup
const server = new McpServer({ 
  name: CONFIG.SERVER_NAME, 
  version: CONFIG.SERVER_VERSION 
});

// Register MCP Tools
server.tool(
  'echo',
  { message: z.string() },
  async ({ message }) => {
    console.log('Echo tool called with message:', message);
    return {
      content: [{ type: 'text', text: JSON.stringify({ message }) }]
    };
  }
);

server.tool(
  "add",
  { a: z.number(), b: z.number() },
  async ({ a, b }) => ({
    content: [{ type: "text", text: JSON.stringify({ result: String(a + b) }) }]
  })
);

// Shared state for SSE transport
let transport = null;

// SSE Connection Route Handler
const handleSseConnection = async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  transport = new SSEServerTransport(CONFIG.ENDPOINTS.MESSAGES, res);
  try {
    await server.connect(transport);
    console.log('✅ MCP client connected via SSE');
  } catch (error) {
    console.error('❌ Error connecting to MCP client:', error);
    res.status(500).end();
  }
};

// Message Route Handler
const handleMessages = async (req, res) => {
  if (!transport) {
    return res.status(503).json({
      error: { code: -32003, message: 'SSE transport not started' }
    });
  }
  
  try {
    await transport.handlePostMessage(req, res, req.body);
  } catch (error) {
    console.error('❌ Error processing message:', error);
    res.status(500).json({
      error: {
        code: -32000,
        message: 'Internal server error'
      }
    });
  }
};

// Route Registration
app.get(CONFIG.ENDPOINTS.START, handleSseConnection);
app.post(CONFIG.ENDPOINTS.MESSAGES, handleMessages);

// Server Start
app.listen(CONFIG.PORT, () => {
  console.log(`MCP Server running at http://localhost:${CONFIG.PORT}${CONFIG.ENDPOINTS.START}`);
});
