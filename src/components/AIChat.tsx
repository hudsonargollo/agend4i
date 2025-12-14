import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { MOCK_PROVIDER } from '../constants';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, X, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const AIChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'init', role: 'model', text: `E aí! 👋 Sou o assistente da ${MOCK_PROVIDER.name}. Como posso te ajudar hoje? Quer saber sobre serviços, horários ou fazer um agendamento?`, timestamp: Date.now() }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!inputText.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      // Build messages for the API (excluding the initial bot message)
      const apiMessages = messages
        .filter(m => m.id !== 'init')
        .map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.text
        }));
      
      apiMessages.push({ role: 'user', content: inputText });

      const { data, error } = await supabase.functions.invoke('chat-ai', {
        body: { 
          messages: apiMessages,
          providerInfo: {
            name: MOCK_PROVIDER.name,
            location: MOCK_PROVIDER.location,
            rating: MOCK_PROVIDER.rating,
            services: MOCK_PROVIDER.services,
            professionals: MOCK_PROVIDER.professionals,
            policies: MOCK_PROVIDER.policies,
            loyaltyProgram: MOCK_PROVIDER.loyaltyProgram
          }
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.error) {
        toast({
          title: "Erro",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: data.response || "Desculpe, não consegui processar sua mensagem.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (e) {
      console.error("Chat error:", e);
      toast({
        title: "Erro de conexão",
        description: "Não foi possível conectar ao assistente. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 w-12 h-12 bg-foreground dark:bg-secondary rounded-full shadow-xl flex items-center justify-center border border-border hover:scale-105 active:scale-95 transition-all z-40"
      >
        <MessageCircle className="w-6 h-6 text-background dark:text-foreground" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
      <div 
        className="bg-card w-full max-w-md h-[600px] max-h-[80vh] rounded-2xl flex flex-col shadow-2xl border border-border overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex justify-between items-center bg-gradient-to-r from-primary/10 to-secondary">
          <div className="flex items-center gap-3">
            <img 
              src={MOCK_PROVIDER.avatarUrl} 
              alt={MOCK_PROVIDER.name}
              className="w-10 h-10 rounded-full object-cover border-2 border-primary/30"
            />
            <div>
              <h3 className="font-semibold text-foreground text-sm">{MOCK_PROVIDER.name}</h3>
              <p className="text-xs text-green-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                Online agora
              </p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/50">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.role === 'user' 
                    ? 'bg-primary text-primary-foreground rounded-br-none' 
                    : 'bg-secondary text-foreground rounded-bl-none'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
             <div className="flex justify-start">
               <div className="bg-secondary text-muted-foreground rounded-2xl rounded-bl-none px-4 py-2 text-xs flex items-center gap-1">
                 <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"></span>
                 <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:100ms]"></span>
                 <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:200ms]"></span>
               </div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border bg-secondary">
          <div className="relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Pergunte sobre horários..."
              className="w-full bg-card text-foreground rounded-full pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary border border-border"
            />
            <button 
              onClick={handleSend}
              disabled={!inputText.trim() || loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground disabled:opacity-50 disabled:bg-muted"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
