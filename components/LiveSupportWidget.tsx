import React, { useState, useEffect, useRef } from 'react';
import { chatWithSmartBiz } from '../services/geminiService';
import VoiceInput from './VoiceInput';
import { usageLimiter } from '../utils/usageLimiter';
import { billingService } from '../services/billingService';
import CreditPromptModal from './CreditPromptModal';
import { toast } from 'react-hot-toast';

interface ChatMessage {
  id: number;
  text: string;
  sender: 'user' | 'bot';
}

interface LiveSupportWidgetProps {
  credits?: number;
  onUpdateCredits?: (credits: number) => void;
}

const LiveSupportWidget: React.FC<LiveSupportWidgetProps> = ({ credits = 0, onUpdateCredits }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, text: "Hi there! 👋 I am the SmartBiz AI Assistant. Ask me anything about your business or our platform!", sender: 'bot' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Credit modal state
  const [showCreditPrompt, setShowCreditPrompt] = useState(false);
  const [deductOnConfirm, setDeductOnConfirm] = useState<(() => Promise<void>) | null>(null);

  // Scroll to bottom on new message or typing state change
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

  const executeSendMessage = async (userMsgText: string, deduct: boolean, cost: number) => {
    const newUserMsg: ChatMessage = { id: Date.now(), text: userMsgText, sender: 'user' };
    setMessages(prev => [...prev, newUserMsg]);
    setMessage('');
    setIsTyping(true);
    setShowCreditPrompt(false);

    try {
      if (deduct) {
        const billingResponse = await billingService.deductCredits(cost, 'AI Live Support Chat');
        if (onUpdateCredits) onUpdateCredits(billingResponse.credits);
      } else {
        usageLimiter.incrementUsage('ai_chat');
      }

      const history = messages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'model' as const,
        parts: [{ text: m.text }]
      }));

      const responseText = await chatWithSmartBiz(history, userMsgText);

      const botMsg: ChatMessage = {
        id: Date.now() + 1,
        text: responseText,
        sender: 'bot'
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: Date.now() + 1,
        text: "Sorry, I'm having trouble connecting right now. Tap 'Human Agent' to chat with us directly on WhatsApp!",
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
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Floating Support Bubble Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-300 transform active:scale-95 focus:outline-none focus:ring-0 outline-none border-0 ${
          isOpen ? 'bg-red-500 hover:bg-red-600 rotate-90' : 'bg-emerald-600 hover:bg-emerald-500 hover:shadow-emerald-500/25'
        }`}
        title="Live Support Chat"
      >
        {isOpen ? (
          <span className="text-xl">✕</span>
        ) : (
          <div className="relative">
            <span className="text-2xl">💬</span>
            <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500 border-2 border-white"></span>
            </span>
          </div>
        )}
      </button>

      {/* Floating Chat Panel overlay */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[340px] sm:w-[380px] h-[480px] bg-white border border-slate-100 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 duration-350 z-50">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold text-lg">
                  🤖
                </div>
                <div>
                  <h3 className="font-extrabold text-sm leading-tight">SmartBiz Support</h3>
                  <p className="text-[10px] text-emerald-100 flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                    AI Coach & WhatsApp Support
                  </p>
                </div>
              </div>
              <button
                onClick={handleOpenWhatsApp}
                className="text-[10px] bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full font-bold flex items-center gap-1 transition-colors border border-white/10"
              >
                💬 Human Help
              </button>
            </div>
          </div>

          {/* Chat History */}
          <div className="flex-1 bg-slate-50/50 p-4 overflow-y-auto space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`
                  max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap
                  ${msg.sender === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-none shadow-md shadow-emerald-650/10'
                    : 'bg-white text-slate-800 border border-slate-200/50 rounded-bl-none shadow-sm'
                  }
                `}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200/50 p-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Action Input Area */}
          <div className="p-3 bg-white border-t border-slate-100">
            <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
              <div className="flex-shrink-0 scale-90 origin-left">
                <VoiceInput onTranscript={(text) => setMessage(text)} placeholder="" />
              </div>
              <input
                type="text"
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-emerald-500 outline-none text-xs bg-slate-50/50 focus:bg-white transition-colors"
                placeholder="Ask our AI or say hello..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <button
                type="submit"
                disabled={!message.trim() || isTyping}
                className="bg-emerald-600 text-white p-2.5 rounded-xl hover:bg-emerald-500 disabled:opacity-50 transition-colors shadow-lg shadow-emerald-650/10"
              >
                ➤
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Credit Prompt Modal */}
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

export default LiveSupportWidget;
