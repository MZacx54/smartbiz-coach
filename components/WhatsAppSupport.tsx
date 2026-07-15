
import React, { useState, useEffect, useRef } from 'react';
import { chatWithSmartBiz } from '../services/geminiService';
import VoiceInput from './VoiceInput';
import { usageLimiter } from '../utils/usageLimiter';
import { billingService } from '../services/billingService';
import CreditPromptModal from './CreditPromptModal';

interface ChatMessage {
  id: number;
  text: string;
  sender: 'user' | 'bot';
}

interface WhatsAppSupportProps {
  credits?: number;
  onUpdateCredits?: (credits: number) => void;
}

const WhatsAppSupport: React.FC<WhatsAppSupportProps> = ({ credits = 0, onUpdateCredits }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, text: "Welcome to SmartBiz Growth Lab! 🚀 I am Antigravity, your digital marketing strategist and business growth advisor. Ask me how to optimize your brand, create converting content, recover debts, or find grants to scale your business!", sender: 'bot' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Credit modal state
  const [showCreditPrompt, setShowCreditPrompt] = useState(false);
  const [deductOnConfirm, setDeductOnConfirm] = useState<(() => Promise<void>) | null>(null);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const executeSendMessage = async (userMsgText: string, deduct: boolean, cost: number) => {
    // Add user message
    const newUserMsg: ChatMessage = { id: Date.now(), text: userMsgText, sender: 'user' };
    setMessages(prev => [...prev, newUserMsg]);
    setMessage('');
    setIsTyping(true);
    setShowCreditPrompt(false);

    try {
      // Prepare history for Gemini
      const history = messages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'model' as const,
        parts: [{ text: m.text }]
      }));

      // Get AI response
      const responseText = await chatWithSmartBiz(history, userMsgText);

      // Only charge credits / increment usage if successful
      if (deduct) {
        const billingResponse = await billingService.deductCredits(cost, 'AI Live Support Chat');
        if (onUpdateCredits) onUpdateCredits(billingResponse.credits);
      } else {
        usageLimiter.incrementUsage('ai_chat');
      }

      const botMsg: ChatMessage = {
        id: Date.now() + 1,
        text: responseText,
        sender: 'bot'
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: Date.now() + 1,
        text: "Sorry, I'm having trouble processing that. Please try again or contact human support.",
        sender: 'bot'
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!message.trim()) return;

    const userMsgText = message;
    const usage = usageLimiter.checkUsage('ai_chat', credits);
    
    if (!usage.allowed) {
      setDeductOnConfirm(null);
      setShowCreditPrompt(true);
      return;
    }

    if (usage.useCredits) {
      setDeductOnConfirm(() => async () => { await executeSendMessage(userMsgText, true, usage.cost); });
      setShowCreditPrompt(true);
      return;
    }

    await executeSendMessage(userMsgText, false, 0);
  };

  const handleOpenWhatsApp = () => {
    window.open("https://wa.me/2349064556107?text=Hello%20SmartBiz%20Support", "_blank");
  };

  return (
    <div className="max-w-2xl mx-auto h-[600px] flex flex-col bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in">
      {/* Header */}
      <div className="bg-indigo-900 p-4 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center font-bold text-lg">
            🚀
          </div>
          <div>
            <h2 className="font-extrabold text-sm tracking-wide font-heading">Antigravity AI Advisor</h2>
            <p className="text-[10px] text-emerald-300 flex items-center gap-1 font-bold">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
              Digital Marketing Strategist
            </p>
          </div>
        </div>
        <button
          onClick={handleOpenWhatsApp}
          className="text-xs bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-full font-bold flex items-center gap-1 transition-colors"
        >
          <span>💬</span> Human Agent
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-gray-50 p-4 overflow-y-auto space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`
              max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
              ${msg.sender === 'user'
                ? 'bg-indigo-600 text-white rounded-br-none'
                : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm'
              }
            `}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 p-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Action Area */}
      <div className="p-4 bg-white border-t border-gray-100">
        <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
          <div className="flex-shrink-0">
            <VoiceInput onTranscript={(text) => setMessage(text)} placeholder="" />
          </div>
          <input
            type="text"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            placeholder="Ask about business, grants, or marketing..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button
            type="submit"
            disabled={!message.trim() || isTyping}
            className="bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            ➤
          </button>
        </form>
      </div>

      <CreditPromptModal
        isOpen={showCreditPrompt}
        featureLabel="AI Live Support Chat"
        creditCost={1}
        currentCredits={credits}
        onConfirm={deductOnConfirm || (() => {})}
        onClose={() => setShowCreditPrompt(false)}
      />
    </div>
  );
};

export default WhatsAppSupport;