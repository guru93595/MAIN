import { useState } from 'react';
import { Send, Sparkles, MessageSquare, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Message {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

const AIAssistant = () => {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 1,
            role: 'assistant',
            content: 'Hello! I\'m your AI Water Infrastructure Assistant. I can help you analyze water usage patterns, predict maintenance needs, optimize resource allocation, and provide insights on your water infrastructure. How can I assist you today?',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    // Lock Logic: Block if user is customer AND plan is 'base' or 'pro'
    // Allowed: 'plus', 'enterprise', or Any Admin/Distributor
    const isLocked = user?.role === 'customer' && ['base', 'pro'].includes(user.plan as any);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage: Message = {
            id: messages.length + 1,
            role: 'user',
            content: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsTyping(true);

        // Simulate AI response
        setTimeout(() => {
            const aiResponse: Message = {
                id: messages.length + 2,
                role: 'assistant',
                content: getAIResponse(input),
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiResponse]);
            setIsTyping(false);
        }, 1500);
    };

    const getAIResponse = (query: string): string => {
        const lowerQuery = query.toLowerCase();

        if (lowerQuery.includes('usage') || lowerQuery.includes('consumption')) {
            return 'Based on your current water usage patterns, I\'ve analyzed that your consumption has decreased by 12% this month compared to last month. The main contributors are EvaraTank #1 (optimized flow control) and EvaraDeep #3 (improved efficiency). Would you like detailed analytics?';
        } else if (lowerQuery.includes('maintenance') || lowerQuery.includes('predict')) {
            return 'Predictive maintenance analysis shows that EvaraFlow #2 requires attention within the next 2 weeks. The flow sensor is showing degradation patterns. I recommend scheduling preventive maintenance to avoid potential failures.';
        } else if (lowerQuery.includes('optimize') || lowerQuery.includes('efficiency')) {
            return 'I\'ve identified 3 optimization opportunities: 1) Adjust pump schedules for EvaraDeep #5 to reduce energy consumption by 18%, 2) Implement smart flow control on EvaraTank #4 to minimize water waste, 3) Upgrade firmware on older devices for better performance.';
        } else if (lowerQuery.includes('alert') || lowerQuery.includes('issue')) {
            return 'Currently, you have 2 critical alerts that need immediate attention. The most urgent is the high flow rate on EvaraFlow #2, which exceeded the threshold 30 minutes ago. I recommend checking the device for potential leaks or sensor malfunctions.';
        } else {
            return 'I understand you\'re asking about your water infrastructure. I can help with usage analysis, predictive maintenance, optimization recommendations, alert management, and trend forecasting. Could you please provide more details about what you\'d like to know?';
        }
    };

    return (
        <div className="p-6 h-[calc(100vh-64px)] flex flex-col gap-4 bg-slate-50/50 relative">
            {/* ─── PAYWALL OVERLAY ─── */}
            {isLocked && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-white/30">
                    <div className="max-w-md w-full rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                        {/* Gradient Header Card (Purple/Pink as requested) */}
                        <div className="bg-gradient-to-br from-purple-600 to-pink-500 p-8 text-white text-center relative overflow-hidden">
                            {/* Pro Badge Icon Style */}
                            <div className="absolute top-4 right-4">
                                <Sparkles size={20} className="text-white/80" />
                            </div>

                            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/30">
                                <Lock size={32} className="text-white" />
                            </div>

                            <h2 className="text-3xl font-bold mb-2">Pro Feature</h2>
                            <p className="text-white/90 text-sm font-medium">Unlock AI-Powered Insights</p>
                        </div>

                        {/* Body */}
                        <div className="bg-white p-8 text-center">
                            <p className="text-slate-600 mb-6 text-sm leading-relaxed">
                                Upgrade to Evara <span className="font-bold text-slate-800">Plus</span> to access our advanced AI Assistant. Get predictive maintenance alerts, usage optimization, and 24/7 intelligent support.
                            </p>

                            <button className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-sm shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all hover:scale-[1.02] active:scale-[0.98]">
                                Upgrade Now
                            </button>

                            <p className="mt-4 text-xs text-slate-400">
                                Enterprise plans also include this feature.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className={`flex items-center gap-3 ${isLocked ? 'filter blur-[2px]' : ''}`}>
                <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
                    <Sparkles size={24} className="text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        AI Assistant
                        {isLocked && (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold uppercase tracking-wider">
                                PRO
                            </span>
                        )}
                    </h1>
                    <p className="text-sm text-slate-500">Intelligent insights for your water infrastructure</p>
                </div>
                <div className="ml-auto px-3 py-1.5 bg-purple-100 text-purple-700 text-xs font-bold rounded-full border border-purple-200">
                    ANALYSIS TOOL
                </div>
            </div>

            {/* Chat Container */}
            <div className={`flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden ${isLocked ? 'filter blur-sm select-none pointer-events-none' : ''}`}>
                {/* Messages */}
                <div className="flex-1 overflow-auto p-6 space-y-4">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'assistant'
                                ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                                : 'bg-blue-500'
                                }`}>
                                {msg.role === 'assistant' ? (
                                    <Sparkles size={16} className="text-white" />
                                ) : (
                                    <MessageSquare size={16} className="text-white" />
                                )}
                            </div>
                            <div className={`flex-1 max-w-[70%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                                <div className={`inline-block px-4 py-3 rounded-2xl ${msg.role === 'assistant'
                                    ? 'bg-slate-100 text-slate-800'
                                    : 'bg-blue-500 text-white'
                                    }`}>
                                    <p className="text-sm leading-relaxed">{msg.content}</p>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1 px-2">
                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-purple-500 to-pink-500">
                                <Sparkles size={16} className="text-white" />
                            </div>
                            <div className="bg-slate-100 rounded-2xl px-4 py-3">
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input */}
                <div className="p-4 border-t border-slate-200 bg-slate-50">
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Ask me anything about your water infrastructure..."
                            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isTyping}
                            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium flex items-center gap-2 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send size={18} />
                            Send
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIAssistant;
