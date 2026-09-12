import React, { useState, useRef, useEffect } from 'react';
import { Product, Sale, Expense, Customer, Supplier, BusinessProfile } from '../types';
import { formatCurrency, calculateDashboardMetrics } from '../utils/calculations';
import { X, Send, Bot, Sparkles, User } from 'lucide-react';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: BusinessProfile;
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  customers: Customer[];
  suppliers: Supplier[];
}

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  profile,
  products,
  sales,
  expenses,
  customers,
  suppliers,
}) => {
  const metrics = calculateDashboardMetrics(products, sales, expenses, [], customers, suppliers);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg_welcome',
      sender: 'ai',
      text: `Hello ${profile.ownerName || 'there'}! I'm your SmartLedger AI Business Partner. You can ask me questions about your sales, profit, expenses, cash flow, debt tracking, and business insights!`,
      timestamp: 'Just now',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!isOpen) return null;

  const quickPrompts = [
    'How much profit did I make today?',
    'Which product sells the most?',
    'Who owes me money?',
    'What stock is running low?',
  ];

  const handleSendMessage = async (textToSend: string) => {
    const userText = textToSend.trim();
    if (!userText) return;

    const userMsg: Message = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // First try backend Gemini API
      const response = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userText,
          context: {
            businessName: profile.name,
            businessType: profile.type,
            currency: profile.currency,
            salesToday: metrics.salesToday,
            expensesToday: metrics.expensesToday,
            profitToday: metrics.profitToday,
            cashAvailable: metrics.cashAvailable,
            receivables: metrics.totalReceivables,
            payables: metrics.totalPayables,
            healthScore: metrics.healthScore,
            bestSelling: metrics.bestSellingProduct,
            lowStockItems: products.filter((p) => p.stock <= p.minStockLevel).map((p) => ({ name: p.name, stock: p.stock })),
            debtors: customers.filter((c) => c.amountOwed > 0).map((c) => ({ name: c.name, owed: c.amountOwed })),
            creditors: suppliers.filter((s) => s.amountOwed > 0).map((s) => ({ name: s.name, owed: s.amountOwed })),
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.reply) {
          setMessages((prev) => [
            ...prev,
            {
              id: `ai_${Date.now()}`,
              sender: 'ai',
              text: data.reply,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
          setLoading(false);
          return;
        }
      }
    } catch {
      // Fall through to instant intelligent ledger engine
    }

    // Instant Local AI Logic (Accurate, Real Data, Offline Ready)
    setTimeout(() => {
      let reply = '';
      const lower = userText.toLowerCase();

      if (lower.includes('profit')) {
        reply = `You made ${formatCurrency(metrics.profitToday, profile.currency)} in gross profit today (Sales: ${formatCurrency(metrics.salesToday, profile.currency)}, Expenses: ${formatCurrency(metrics.expensesToday, profile.currency)}). Your net cash position is healthy!`;
      } else if (lower.includes('sells the most') || lower.includes('best seller') || lower.includes('popular')) {
        if (metrics.bestSellingProduct) {
          reply = `${metrics.bestSellingProduct.name} is your best-selling product! You have sold ${metrics.bestSellingProduct.soldCount} units so far.`;
        } else {
          reply = "You haven't recorded any product sales yet. Once you record your first sale, your best seller will be identified automatically.";
        }
      } else if (lower.includes('owes') || lower.includes('debt') || lower.includes('customer')) {
        const debtors = customers.filter((c) => c.amountOwed > 0);
        if (debtors.length > 0) {
          const names = debtors.map((c) => `${c.name} (${formatCurrency(c.amountOwed, profile.currency)})`).join(', ');
          reply = `${debtors.length} customers currently owe you a total of ${formatCurrency(metrics.totalReceivables, profile.currency)}: ${names}.`;
        } else {
          reply = `Great news! No customers currently owe you any money. All sales are paid in full.`;
        }
      } else if (lower.includes('stock') || lower.includes('low') || lower.includes('re-order')) {
        const low = products.filter((p) => p.stock <= p.minStockLevel);
        if (low.length > 0) {
          const list = low.map((p) => `${p.name} (Only ${p.stock} ${p.unit || 'units'} left, min is ${p.minStockLevel})`).join('; ');
          reply = `⚠️ Stock Alert: ${low.length} item(s) are running low: ${list}. I recommend contacting your supplier today.`;
        } else {
          reply = `All your products are comfortably above minimum stock thresholds. No urgent restocks needed right now.`;
        }
      } else if (lower.includes('health') || lower.includes('score')) {
        reply = `🟢 Your Business Health Score is ${metrics.healthScore}/100 (${metrics.healthStatus}). ${metrics.healthExplanation}`;
      } else {
        reply = `Looking at ${profile.name}: Today you've made ${formatCurrency(metrics.salesToday, profile.currency)} in sales with ${formatCurrency(metrics.profitToday, profile.currency)} profit. Cash available is ${formatCurrency(metrics.cashAvailable, profile.currency)}. Let me know if you want details on customer debts, suppliers, or product margins!`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          sender: 'ai',
          text: reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setLoading(false);
    }, 450);
  };

  return (
    <div 
      id="smartledger-ai-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[600px] max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-['Outfit',sans-serif] flex items-center gap-1.5">
                <span>SmartLedger AI Partner</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
                  Live
                </span>
              </h3>
              <p className="text-xs text-slate-400">Understands your sales, debts & profit margins</p>
            </div>
          </div>
          <button
            id="ai-modal-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-2.5 max-w-[85%] ${
                m.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs ${
                  m.sender === 'user'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900 text-emerald-400 border border-slate-700'
                }`}
              >
                {m.sender === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              <div
                className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-emerald-600 text-white rounded-tr-none'
                    : 'bg-white text-slate-800 border border-slate-200 shadow-sm rounded-tl-none'
                }`}
              >
                <p>{m.text}</p>

                <span
                  className={`text-[10px] block mt-1.5 ${
                    m.sender === 'user' ? 'text-emerald-200' : 'text-slate-400'
                  }`}
                >
                  {m.timestamp}
                </span>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-2.5 max-w-[85%] mr-auto items-center">
              <div className="w-7 h-7 rounded-lg bg-slate-900 text-emerald-400 border border-slate-700 flex items-center justify-center">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce delay-100"></span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce delay-200"></span>
                <span className="ml-1">Analyzing ledger...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 bg-white border-t border-slate-100 flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none text-[11px]">
          <span className="text-slate-400 font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-500" />
            <span>Ask:</span>
          </span>
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(p)}
              className="px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 text-slate-700 text-[11px] font-medium transition-colors cursor-pointer flex-shrink-0"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(input);
          }}
          className="p-3.5 bg-white border-t border-slate-200 flex items-center gap-2 flex-shrink-0"
        >
          <input
            id="ai-user-prompt-input"
            type="text"
            placeholder="Ask about sales, profit, best sellers, debts..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            id="ai-send-btn"
            type="submit"
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
