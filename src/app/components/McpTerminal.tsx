"use client"

import { useEffect, useState } from 'react';
import { McpResponse, useMcpClient } from '../hooks/useMcpClient';
import { Message } from './messages/types';
import { MessageContainer } from './MessageContainer';
import { MessageInput } from './MessageInput';

// Config constants
const MCP_CONFIG = {
  serverUrl: 'http://localhost:3002/mcp-server/start',
  clientName: 'MyMCPClient',
  clientVersion: '0.1.0'
};

export default function McpTerminal() {
  const [messages, setMessages] = useState<Message[]>([]);
  const { isConnected, error, callTool } = useMcpClient(MCP_CONFIG);
  
  // Show connection status once we have a result
  useEffect(() => {
    if (isConnected) {
      setMessages(prev => [
        ...prev, 
        { sender: 'system', text: '✅ Connected to MCP server.' }
      ]);
    } else if (error) {
      setMessages(prev => [
        ...prev, 
        { sender: 'system', text: `❌ Error connecting to MCP server: ${error}` }
      ]);
    }
  }, [isConnected, error]);

  // Command processor
  const processCommand = async (command: string, args: Record<string, unknown>) => {
    const requestId = Date.now().toString();
    
    // Add processing message
    setMessages(prev => [
      ...prev, 
      { 
        sender: 'server', 
        text: `Processing ${command} command...`,
        isProcessing: true,
        id: requestId
      }
    ]);
    
    try {
      if (command === 'echo') {
        const result = await callTool('echo', args) as McpResponse;
        const responseText = JSON.parse(result?.content?.[0]?.text || '');
        
        // Replace processing message with result
        setMessages(prev => {
          const filtered = prev.filter(msg => !(msg.isProcessing && msg.id === requestId));
          return [
            ...filtered, 
            { sender: 'server', text: responseText.message, tool: 'echo' }
          ];
        });
      } else if (command === 'add') {
        const result = await callTool('add', args) as McpResponse;
        const responseText = JSON.parse(result?.content?.[0]?.text || '');

        // Replace processing message with result
        setMessages(prev => {
          const filtered = prev.filter(msg => !(msg.isProcessing && msg.id === requestId));
          return [
            ...filtered, 
            { sender: 'server', text: responseText.result, tool: 'add' }
          ];
        });
      } else {
        throw new Error(`Unknown command: ${command}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get server response';
      
      // Remove processing message and add error
      setMessages(prev => {
        const filtered = prev.filter(msg => !(msg.isProcessing && msg.id === requestId));
        return [
          ...filtered, 
          { sender: 'system', text: `❌ Error: ${errorMessage}` }
        ];
      });
    }
  };

  const handleSendMessage = async (message: string) => {
    // Add user message to log
    setMessages(prev => [...prev, { sender: 'user', text: message }]);

    // Parse commands
    if (message.startsWith('@')) {
      if (message.startsWith('@echo ')) {
        const echoText = message.substring(6).trim();
        await processCommand('echo', { message: echoText });
      } else if (message.startsWith('@add ')) {
        const addText = message.substring(5).trim();
        const [a, b] = addText.split(' ').map(Number);
        await processCommand('add', { a, b });
      } else {
        setMessages(prev => [
          ...prev, 
          { sender: 'system', text: 'Command not recognized.' }
        ]);
      } 
    } else {
      // Regular text (not a command)
      setMessages(prev => [
        ...prev, 
        { sender: 'system', text: 'Free text processing will be implemented soon.' }
      ]);
    }
  };

  return (
    <div className="border border-gray-300 p-4 rounded bg-slate-800 text-gray-100">
      <h3 className="text-lg font-medium mb-2">MCP Terminal</h3>
      <MessageContainer messages={messages} />
      <MessageInput onSendMessage={handleSendMessage} />
    </div>
  );
} 