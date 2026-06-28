import React, { useState, useEffect } from 'react';
import { Debtor } from '../types';
import { generateDebtReminder } from '../services/geminiService';
import ShareActions from './ShareActions';
import { usageLimiter } from '../utils/usageLimiter';
import { billingService } from '../services/billingService';
import CreditPromptModal from './CreditPromptModal';

interface DebtorBookProps {
  credits?: number;
  onUpdateCredits?: (credits: number) => void;
}

const DebtorBook: React.FC<DebtorBookProps> = ({ credits = 0, onUpdateCredits }) => {
  const [debtors, setDebtors] = useState<Debtor[]>(() => {
    const saved = localStorage.getItem('sb_debtors');
    return saved ? JSON.parse(saved) : [];
  });
  const [showForm, setShowForm] = useState(false);
  const [newDebtor, setNewDebtor] = useState({ name: '', amount: '', phone: '', itemsBought: '', dueDate: '' });

  // Reminder State
  const [reminder, setReminder] = useState<{ text: string, debtor: Debtor } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reminderTone, setReminderTone] = useState<'POLITE' | 'FIRM' | 'STRICT'>('POLITE');

  // Credit modal state
  const [showCreditPrompt, setShowCreditPrompt] = useState(false);
  const [deductOnConfirm, setDeductOnConfirm] = useState<(() => Promise<void>) | null>(null);

  useEffect(() => {
    localStorage.setItem('sb_debtors', JSON.stringify(debtors));
  }, [debtors]);

  const handleAddDebtor = (e: React.FormEvent) => {
    e.preventDefault();
    const d: Debtor = {
      id: Date.now().toString(),
      name: newDebtor.name,
      amount: parseFloat(newDebtor.amount),
      phone: newDebtor.phone,
      itemsBought: newDebtor.itemsBought,
      dueDate: newDebtor.dueDate,
      status: 'UNPAID'
    };
    setDebtors([d, ...debtors]);
    setNewDebtor({ name: '', amount: '', phone: '', itemsBought: '', dueDate: '' });
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    setDebtors(debtors.filter(d => d.id !== id));
  };

  const handleMarkPaid = (id: string) => {
    setDebtors(debtors.map(d => d.id === id ? { ...d, status: 'PAID' } : d));
  };

  const executeGenerateReminder = async (debtor: Debtor, deduct: boolean, cost: number) => {
    setIsGenerating(true);
    setShowCreditPrompt(false);
    try {
      if (deduct) {
        const billingResponse = await billingService.deductCredits(cost, 'AI Debt Reminder');
        if (onUpdateCredits) onUpdateCredits(billingResponse.credits);
      } else {
        usageLimiter.incrementUsage('debt_reminder');
      }
      const text = await generateDebtReminder(debtor.name, debtor.amount, reminderTone);
      setReminder({ text, debtor });
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateReminder = async (debtor: Debtor) => {
    const usage = usageLimiter.checkUsage('debt_reminder', credits);
    if (!usage.allowed) {
      setDeductOnConfirm(null);
      setShowCreditPrompt(true);
      return;
    }
    if (usage.useCredits) {
      setDeductOnConfirm(() => async () => { await executeGenerateReminder(debtor, true, usage.cost); });
      setShowCreditPrompt(true);
      return;
    }
    await executeGenerateReminder(debtor, false, 0);
  };

  const totalDebt = debtors.filter(d => d.status !== 'PAID').reduce((acc, d) => acc + d.amount, 0);

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gbege Book (Debtors) 📒</h2>
          <p className="text-gray-600 text-sm mt-1">Track who owes you money. Don't forget.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-700 transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add Debtor'}
        </button>
      </div>

      <div className="bg-red-50 border border-red-100 rounded-xl p-6 mb-8 flex justify-between items-center shadow-sm">
        <div>
          <p className="text-xs font-bold text-red-800 uppercase">Total Owed to You</p>
          <h3 className="text-3xl font-bold text-red-900 mt-1">₦{totalDebt.toLocaleString()}</h3>
        </div>
        <div className="text-4xl">💸</div>
      </div>

      {showForm && (
        <form onSubmit={handleAddDebtor} className="bg-white p-6 rounded-xl border border-gray-200 mb-6 shadow-lg animate-in slide-in-from-top-2">
          <h3 className="font-bold text-gray-900 mb-4">Record New Debt</h3>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <input required className="w-full p-2 border rounded" placeholder="Customer Name" value={newDebtor.name} onChange={e => setNewDebtor({ ...newDebtor, name: e.target.value })} />
            <input required type="number" className="w-full p-2 border rounded" placeholder="Amount (₦)" value={newDebtor.amount} onChange={e => setNewDebtor({ ...newDebtor, amount: e.target.value })} />
            <input required className="w-full p-2 border rounded" placeholder="Phone Number" value={newDebtor.phone} onChange={e => setNewDebtor({ ...newDebtor, phone: e.target.value })} />
            <input type="date" className="w-full p-2 border rounded" placeholder="Due Date" value={newDebtor.dueDate} onChange={e => setNewDebtor({ ...newDebtor, dueDate: e.target.value })} />
            <input className="w-full p-2 border rounded md:col-span-2" placeholder="Items Bought (e.g. 2 bags of rice)" value={newDebtor.itemsBought} onChange={e => setNewDebtor({ ...newDebtor, itemsBought: e.target.value })} />
          </div>
          <button type="submit" className="w-full bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800">Save Debtor</button>
        </form>
      )}

      {/* Reminder Modal */}
      {reminder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-gray-900">AI Reminder Generated</h3>
              <button onClick={() => setReminder(null)} className="text-gray-400">✕</button>
            </div>
            <div className="bg-gray-100 p-4 rounded-lg text-sm text-gray-800 whitespace-pre-wrap mb-4 italic border-l-4 border-indigo-500">
              "{reminder.text}"
            </div>
            <ShareActions text={reminder.text} title="Debt Reminder" />
          </div>
        </div>
      )}

      <div className="space-y-4">
        {debtors.length === 0 && <p className="text-gray-500 text-center py-10">No debtors recorded. Business is good! 🎉</p>}

        {debtors.map(debtor => (
          <div key={debtor.id} className={`bg-white border rounded-xl p-4 shadow-sm transition-all ${debtor.status === 'PAID' ? 'opacity-60 bg-gray-50' : 'border-red-100'}`}>
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-gray-900 text-lg">{debtor.name}</h4>
                  {debtor.status === 'PAID' && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold">PAID</span>}
                  {debtor.status === 'UNPAID' && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold">OWING</span>}
                </div>
                <p className="text-sm text-gray-600 font-medium">₦{debtor.amount.toLocaleString()} <span className="text-gray-400">• {debtor.itemsBought}</span></p>
                <p className="text-xs text-gray-500 mt-1">Due: {debtor.dueDate || 'No date set'} • {debtor.phone}</p>
              </div>

              {debtor.status !== 'PAID' && (
                <div className="flex flex-col gap-2 min-w-[200px]">
                  <div className="flex gap-2">
                    <select
                      className="text-xs border rounded px-2 bg-gray-50"
                      value={reminderTone}
                      onChange={(e) => setReminderTone(e.target.value as any)}
                    >
                      <option value="POLITE">Polite</option>
                      <option value="FIRM">Firm</option>
                      <option value="STRICT">Strict</option>
                    </select>
                    <button
                      onClick={() => handleGenerateReminder(debtor)}
                      disabled={isGenerating}
                      className="flex-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 text-xs font-bold py-2 rounded"
                    >
                      {isGenerating ? '...' : 'Generate Reminder'}
                    </button>
                  </div>
                  <button onClick={() => handleMarkPaid(debtor.id)} className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2 rounded">
                    Mark as Paid
                  </button>
                </div>
              )}
              {debtor.status === 'PAID' && (
                <button onClick={() => handleDelete(debtor.id)} className="text-red-500 text-xs font-bold hover:underline self-center">
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <CreditPromptModal
        isOpen={showCreditPrompt}
        featureLabel="AI Debt Reminder"
        creditCost={1}
        currentCredits={credits}
        onConfirm={deductOnConfirm || (() => {})}
        onClose={() => setShowCreditPrompt(false)}
      />
    </div>
  );
};

export default DebtorBook;