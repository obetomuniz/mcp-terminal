import { Message } from './messages/types';
import { MessageDisplay } from './messages/MessageComponents';

interface MessageContainerProps {
  messages: Message[];
}

export const MessageContainer = ({ messages }: MessageContainerProps) => (
  <div className="min-h-[150px] max-h-[300px] mb-2 bg-slate-700 p-2 rounded overflow-y-auto">
    {messages.map((msg, idx) => (
      <MessageDisplay key={idx} message={msg} />
    ))}
  </div>
); 