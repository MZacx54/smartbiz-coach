import React, { useState, useEffect, useRef } from 'react';
import { chatWithSmartBiz } from '../services/geminiService';
import VoiceInput from './VoiceInput';
import FormattedMarkdown from './FormattedMarkdown';
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

const LiveSupportWidget: React.FC<LiveSupportWidgetProps> = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      id: 1, 
      text: "Hello! 👋 I am your **SmartBiz AI Coach & Operations Strategist**.\n\nAsk me anything about scaling your business, your **FICO 300–850 Credit Health Score**, **Apprentice Till Theft audits**, **Snap-to-Studio 4K photography**, or **Section 23 CITA 0% tax shield**!", 
      sender: 'bot' 
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    { label: "📊 FICO Credit Score", prompt: "How is my FICO 300–850 credit risk score calculated and how do I get a bankable PDF dossier for BOI?" },
    { label: "🛡️ Till Theft Audit", prompt: "How does the Isolation Forest till fraud detector catch cashier theft and cash leaks?" },
    { label: "🎙️ Voice Note POS", prompt: "How do I record counter sales and petrol expenses using the 5-second Voice Note POS?" },
    { label: "⚖️ 0% Tax Exemption", prompt: "How do I get my Section 23 CITA official 0% tax exemption memo for small businesses?" },
    { label: "📸 4K Studio Photos", prompt: "How does Snap-to-Studio 2.0 transform raw bedsheet photos into 4K luxury scenes?" },
  ];

  // Scroll to bottom on new message or typing state change
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

  const executeSendMessage = async (userMsgText: string) => {
    const newUserMsg: ChatMessage = { id: Date.now(), text: userMsgText, sender: 'user' };
    setMessages(prev => [...prev, newUserMsg]);
    setMessage('');
    setIsTyping(true);

    try {
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
        text: "Sorry, I'm having trouble connecting right now. Tap 'Human Help' to chat with us directly on WhatsApp!",
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
    await executeSendMessage(userMsgText);
  };

  const handleOpenWhatsApp = () => {
    window.open("https://wa.me/2349064556107?text=Hello%20SmartBiz%20Support", "_blank");
  };

  return (
    <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 font-sans">
      {/* Floating Support Bubble Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-300 transform active:scale-95 focus:outline-none focus:ring-0 outline-none border-0 ${
          isOpen ? 'bg-red-500 hover:bg-red-600 rotate-90' : 'bg-emerald-600 hover:bg-emerald-500 hover:shadow-emerald-500/25'
        }`}
        title="Live Support Chat"
      >
        {isOpen ? (
          <span className="text-xl">✕</span>
        ) : (
          <div className="relative">
            <span className="text-xl sm:text-2xl">💬</span>
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500 border-2 border-white"></span>
            </span>
          </div>
        )}
      </button>

      {/* Floating Chat Panel overlay */}
      {isOpen && (
        <div className="fixed bottom-36 md:bottom-24 right-3 sm:right-6 w-[340px] sm:w-[390px] max-w-[calc(100vw-24px)] h-[480px] sm:h-[520px] max-h-[calc(100vh-160px)] bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 duration-350 z-50">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white flex-shrink-0">
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
          <div className="flex-1 bg-slate-50/70 p-4 overflow-y-auto space-y-3.5 no-scrollbar">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'user' ? (
                  <div className="max-w-[85%] p-3 rounded-2xl rounded-br-xs text-xs leading-relaxed bg-emerald-600 text-white shadow-sm whitespace-pre-wrap">
                    {msg.text}
                  </div>
                ) : (
                  <div className="max-w-[90%] p-3.5 rounded-2xl rounded-tl-xs text-xs leading-relaxed bg-white text-slate-800 border border-slate-200/80 shadow-sm">
                    <FormattedMarkdown content={msg.text} />
                  </div>
                )}
              </div>
            ))}

            {/* Quick Starter Suggestions */}
            {messages.length === 1 && !isTyping && (
              <div className="pt-2 pb-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">⚡ Quick Questions:</p>
                <div className="flex flex-wrap gap-1.5">
                  {quickPrompts.map((qp, idx) => (
                    <button
                      key={idx}
                      onClick={() => executeSendMessage(qp.prompt)}
                      className="text-[10px] font-semibold bg-white hover:bg-emerald-50 hover:border-emerald-300 text-slate-700 hover:text-emerald-800 border border-slate-200 px-2.5 py-1.5 rounded-xl shadow-xs transition-all text-left"
                    >
                      {qp.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200/80 p-3 rounded-2xl rounded-tl-xs shadow-sm flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce delay-75"></span>
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce delay-150"></span>
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
    </div>
  );
};

export default LiveSupportWidget;
