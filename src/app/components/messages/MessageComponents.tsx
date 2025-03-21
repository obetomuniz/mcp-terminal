import { Message } from './types';

export const DefaultMessage = ({ message }: { message: Message }) => (
  <div className="mb-1 p-1.5 rounded bg-slate-600">
    <strong>{message.sender === 'user' ? 'You' : message.sender === 'server' ? 'Server' : 'System'}:</strong> {message.text}
  </div>
);

export const EchoMessage = ({ message }: { message: Message }) => (
  <div className="mb-1 text-purple-300 font-bold border border-purple-900 p-1.5 rounded bg-purple-900/30">
    <strong>Echo:</strong> {message.text}
  </div>
);

export const AddMessage = ({ message }: { message: Message }) => (
  <div className="mb-1 text-green-300 font-bold border border-green-900 p-1.5 rounded bg-green-900/30">
    <strong>Add Result:</strong> {message.text}
  </div>
);

export const ProcessingMessage = () => (
  <div className="mb-1 p-1.5 rounded bg-yellow-900/30 border border-yellow-800 text-yellow-300 animate-pulse">
    <strong>Processing</strong> <span className="inline-block">...</span>
  </div>
);

export const MessageDisplay = ({ message }: { message: Message }) => {
  if (message.isProcessing) return <ProcessingMessage />;
  if (message.tool === 'echo') return <EchoMessage message={message} />;
  if (message.tool === 'add') return <AddMessage message={message} />;
  return <DefaultMessage message={message} />;
}; 