import { useEffect, useRef, useState } from 'react';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

export type McpClientConfig = {
  serverUrl: string;
  clientName: string;
  clientVersion: string;
}

export interface McpResponse {
  content?: Array<{
    type: string;
    text?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

// Hook for managing MCP client connection and tool calls
export const useMcpClient = (config: McpClientConfig) => {
  const clientRef = useRef<Client | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize MCP client
    const client = new Client({ 
      name: config.clientName, 
      version: config.clientVersion 
    });

    // Initialize SSE client transport
    const serverUrl = new URL(config.serverUrl);
    const transport = new SSEClientTransport(serverUrl);
    
    // Connect MCP client to server
    client.connect(transport)
      .then(() => setIsConnected(true))
      .catch(err => {
        console.error('Error connecting MCP client:', err);
        setError(err instanceof Error ? err.message : 'Connection error');
      });

    clientRef.current = client;

    return () => {
      clientRef.current = null;
    };
  }, [config]);

  // Call MCP tool handler
  const callTool = async (
    name: string, 
    args: Record<string, unknown>, 
    timeout = 10000
  ) => {
    if (!clientRef.current) throw new Error('MCP client not initialized');
    
    return await clientRef.current.callTool({
      name,
      arguments: args
    }, undefined, { timeout });
  };

  return {
    client: clientRef.current,
    isConnected,
    error,
    callTool
  };
}; 