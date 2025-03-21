export type Message = { 
  sender: 'user' | 'server' | 'system'; 
  text: string;
  tool?: string;
  isProcessing?: boolean;
  id?: string;
}; 