import { useState } from 'react';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
}

export const MessageInput = ({ onSendMessage }: MessageInputProps) => {
  const [inputText, setInputText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const message = inputText.trim();
    if (message) {
      onSendMessage(message);
      setInputText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input 
        type="text" 
        value={inputText} 
        onChange={e => setInputText(e.target.value)} 
        placeholder="Type a message..." 
        className="flex-grow px-2 py-1 border border-slate-600 rounded bg-slate-700 text-gray-100 placeholder:text-gray-400"
      />
      <button 
        type="submit" 
        className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors"
      >
        Send
      </button>
    </form>
  );
}; 