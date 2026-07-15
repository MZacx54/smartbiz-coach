import React, { useState, useEffect, useRef } from 'react';
import { 
  DollarSign, Calendar, Phone, Plus, Trash2, CheckCircle, 
  Clock, AlertTriangle, ArrowRight, RefreshCw, Send, Search, 
  Eye, Filter, CreditCard, Landmark, BookOpen, AlertCircle, ShoppingBag, X
} from 'lucide-react';
import { Debtor, DebtorPayment, Product, Invoice } from '../types';
import { generateDebtReminder } from '../services/geminiService';
import ShareActions from './ShareActions';
import { usageLimiter } from '../utils/usageLimiter';
import { billingService } from '../services/billingService';
import CreditPromptModal from './CreditPromptModal';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [activeTab, setActiveTab] = useState<'english' | 'pidgin'>('english');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reminderTone, setReminderTone] = useState<'POLITE' | 'FIRM' | 'STRICT'>('POLITE');
  
  // Advanced features state
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNPAID' | 'PARTIAL' | 'PAID'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDebtorId, setExpandedDebtorId] = useState<string | null>(null);
  
  // Payment Modal States
  const [paymentModalDebtor, setPaymentModalDebtor] = useState<Debtor | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER' | 'POS'>('TRANSFER');
  const [paymentNote, setPaymentNote] = useState('');
  
  // Catalog Integration States
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [selectedItems, setSelectedItems] = useState<{ product: Product; quantity: number }[]>([]);
  const [deductStockOnSave, setDeductStockOnSave] = useState(true);

  // New debtor form states
  const [newDebtor, setNewDebtor] = useState({ name: '', amount: '', phone: '', itemsBought: '', dueDate: '' });

  // Reminder Modal State
  const [reminder, setReminder] = useState<{ text: { english: string; pidgin: string }; debtor: Debtor } | null>(null);

  // Credit modal state
  const [showCreditPrompt, setShowCreditPrompt] = useState(false);
  const [deductOnConfirm, setDeductOnConfirm] = useState<(() => Promise<void>) | null>(null);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch catalog products
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const response = await api.get('/api/marketplace/products/');
        setCatalogProducts(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error("Failed to load catalog products:", err);
      }
    };
    fetchCatalog();
  }, []);

  // Save debtors to localStorage
  useEffect(() => {
    localStorage.setItem('sb_debtors', JSON.stringify(debtors));
  }, [debtors]);

  // Synchronize invoice payments back to sb_invoices_detailed
  const syncInvoicePayment = (invoiceId: string, isPaid: boolean, remainingBalance: number) => {
    try {
      const savedInvoices = localStorage.getItem('sb_invoices_detailed');
      if (!savedInvoices) return;

      const invoicesList: Invoice[] = JSON.parse(savedInvoices);
      const updated = invoicesList.map(inv => {
        if (inv.id === invoiceId) {
          return {
            ...inv,
            paymentStatus: isPaid ? 'PAID' as const : 'SENT' as const,
            note: `Updated via Gbege Book ledger. Remaining balance: ₦${remainingBalance.toLocaleString()}`
          };
        }
        return inv;
      });

      localStorage.setItem('sb_invoices_detailed', JSON.stringify(updated));

      // Also maintain dashboard overview compliance (sb_invoices)
      const summaryStats = updated.map(inv => {
        const sub = inv.items.reduce((a, item) => a + (item.quantity * item.price), 0);
        const disc = sub * (inv.discount / 100);
        const tax = (sub - disc) * (inv.taxRate / 100);
        return {
          id: inv.id,
          clientName: inv.clientName,
          total: sub - disc + tax,
          date: inv.date
        };
      });
      localStorage.setItem('sb_invoices', JSON.stringify(summaryStats));
    } catch (e) {
      console.error("Failed to sync status back to Invoice book:", e);
    }
  };

  // Auto-scan and sync unpaid invoices
  const handleSyncUnpaidInvoices = () => {
    setIsSyncing(true);
    try {
      const savedInvoices = localStorage.getItem('sb_invoices_detailed');
      if (!savedInvoices) {
        toast.error("No invoice data found to synchronize.");
        setIsSyncing(false);
        return;
      }

      const invoicesList: Invoice[] = JSON.parse(savedInvoices);
      const unpaidInvoices = invoicesList.filter(inv => inv.paymentStatus === 'SENT' || inv.paymentStatus === 'OVERDUE');
      
      if (unpaidInvoices.length === 0) {
        toast.success("All invoices are fully synchronized!");
        setIsSyncing(false);
        return;
      }

      let addedCount = 0;
      let updatedCount = 0;
      const updatedDebtors = [...debtors];

      unpaidInvoices.forEach(inv => {
        const sub = inv.items.reduce((a, item) => a + (item.quantity * item.price), 0);
        const disc = sub * (inv.discount / 100);
        const tax = (sub - disc) * (inv.taxRate / 100);
        const totalAmount = sub - disc + tax;
        const itemsText = inv.items.map(i => `${i.quantity}x ${i.description}`).join(', ');

        const existingIdx = updatedDebtors.findIndex(d => d.linkedInvoiceId === inv.id);
        if (existingIdx !== -1) {
          // Update amount/details if unpaid
          if (updatedDebtors[existingIdx].status !== 'PAID') {
            updatedDebtors[existingIdx].amount = totalAmount;
            updatedDebtors[existingIdx].name = inv.clientName;
            updatedDebtors[existingIdx].itemsBought = itemsText;
            updatedCount++;
          }
        } else {
          // Import new debtor
          updatedDebtors.push({
            id: `invoice-debt-${inv.id}`,
            name: inv.clientName,
            phone: inv.clientPhone || '',
            amount: totalAmount,
            dueDate: inv.dueDate || '',
            itemsBought: itemsText,
            status: 'UNPAID',
            linkedInvoiceId: inv.id,
            payments: [],
            remindersSentCount: 0
          });
          addedCount++;
        }
      });

      setDebtors(updatedDebtors);
      toast.success(`Sync Complete: Imported ${addedCount} new debts, updated ${updatedCount} profiles!`);
    } catch (e) {
      toast.error("Failed to parse invoice ledger database");
    } finally {
      setIsSyncing(false);
    }
  };

  // Add items from inventory to the current debtor form
  const handleSelectItem = (prod: Product) => {
    const exists = selectedItems.find(item => item.product.id === prod.id);
    if (exists) {
      setSelectedItems(selectedItems.map(item => 
        item.product.id === prod.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setSelectedItems([...selectedItems, { product: prod, quantity: 1 }]);
    }
    
    // Recalculate price sum
    const totalAmount = [...selectedItems.map(i => i.product.id === prod.id ? { ...i, quantity: i.quantity + 1 } : i), 
      ...(exists ? [] : [{ product: prod, quantity: 1 }])
    ].reduce((acc, curr) => acc + (parseFloat(curr.product.price) * curr.quantity), 0);
    
    setNewDebtor(prev => ({
      ...prev,
      amount: String(totalAmount)
    }));
    setShowProductDropdown(false);
    setProductSearchQuery('');
  };

  const handleRemoveSelectedItem = (prodId: number) => {
    const updated = selectedItems.filter(item => item.product.id !== prodId);
    setSelectedItems(updated);
    const totalAmount = updated.reduce((acc, curr) => acc + (parseFloat(curr.product.price) * curr.quantity), 0);
    setNewDebtor(prev => ({
      ...prev,
      amount: String(totalAmount)
    }));
  };

  // Save new manually entered debtor
  const handleAddDebtor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDebtor.name || !newDebtor.amount) {
      toast.error("Name and Amount are required!");
      return;
    }

    const itemsText = selectedItems.length > 0 
      ? selectedItems.map(i => `${i.quantity}x ${i.product.name}`).join(', ') 
      : newDebtor.itemsBought;

    const d: Debtor = {
      id: Date.now().toString(),
      name: newDebtor.name,
      amount: parseFloat(newDebtor.amount),
      phone: newDebtor.phone,
      itemsBought: itemsText || 'General Credit Sale',
      dueDate: newDebtor.dueDate,
      status: 'UNPAID',
      payments: [],
      remindersSentCount: 0
    };

    // Deduct stock levels in local/backend catalog if toggle active
    if (deductStockOnSave && selectedItems.length > 0) {
      const toastId = toast.loading("Deducting product inventory stock...");
      try {
        for (const item of selectedItems) {
          const newQty = Math.max(0, (item.product.stock_count || 0) - item.quantity);
          const payload = {
            ...item.product,
            stock_count: newQty
          };
          await api.put(`/api/marketplace/products/${item.product.id}/`, payload);
        }
        toast.success("Inventory stock levels updated!", { id: toastId });
      } catch (err) {
        console.error("Failed to deduct inventory stock:", err);
        toast.error("Failed to deduct catalog stock levels automatically.", { id: toastId });
      }
    }

    setDebtors([d, ...debtors]);
    setNewDebtor({ name: '', amount: '', phone: '', itemsBought: '', dueDate: '' });
    setSelectedItems([]);
    setShowForm(false);
    toast.success("Debtor recorded successfully!");
  };

  // Record payment installment
  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalDebtor || !paymentAmount) return;

    const payVal = parseFloat(paymentAmount);
    if (isNaN(payVal) || payVal <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    const outstanding = getOutstandingBalance(paymentModalDebtor);
    if (payVal > outstanding) {
      toast.error(`Amount exceeds outstanding balance of ₦${outstanding.toLocaleString()}`);
      return;
    }

    const paymentEntry: DebtorPayment = {
      amount: payVal,
      timestamp: new Date().toISOString(),
      method: paymentMethod,
      note: paymentNote
    };

    const updatedDebtors = debtors.map(d => {
      if (d.id === paymentModalDebtor.id) {
        const updatedPayments = [...(d.payments || []), paymentEntry];
        const totalPaid = updatedPayments.reduce((acc, p) => acc + p.amount, 0);
        const finalBalance = d.amount - totalPaid;
        const newStatus = finalBalance <= 0 ? 'PAID' as const : 'PARTIAL' as const;
        
        // Sync back to invoice generator if linked
        if (d.linkedInvoiceId) {
          syncInvoicePayment(d.linkedInvoiceId, newStatus === 'PAID', finalBalance);
        }

        return {
          ...d,
          payments: updatedPayments,
          status: newStatus
        };
      }
      return d;
    });

    setDebtors(updatedDebtors);
    setPaymentModalDebtor(null);
    setPaymentAmount('');
    setPaymentNote('');
    toast.success("Payment transaction recorded successfully!");
  };

  const getOutstandingBalance = (debtor: Debtor) => {
    const totalPaid = (debtor.payments || []).reduce((acc, p) => acc + p.amount, 0);
    return Math.max(0, debtor.amount - totalPaid);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this debtor record?")) {
      setDebtors(debtors.filter(d => d.id !== id));
      toast.success("Debtor record deleted");
    }
  };

  const executeGenerateReminder = async (debtor: Debtor, deduct: boolean, cost: number) => {
    setIsGenerating(true);
    setShowCreditPrompt(false);
    const balance = getOutstandingBalance(debtor);
    try {
      // API now returns { english, pidgin } structured response
      const result = await generateDebtReminder(debtor.name, balance, reminderTone);
      
      // Only charge credits / increment usage if successful
      if (deduct) {
        const billingResponse = await billingService.deductCredits(cost, 'AI Debt Reminder');
        if (onUpdateCredits) onUpdateCredits(billingResponse.credits);
      } else {
        usageLimiter.incrementUsage('debt_reminder');
      }

      // Update nudge count
      setDebtors(prev => prev.map(d => {
        if (d.id === debtor.id) {
          return {
            ...d,
            remindersSentCount: (d.remindersSentCount || 0) + 1,
            lastReminderSent: Date.now()
          };
        }
        return d;
      }));

      if (typeof result === 'string') {
        setReminder({ text: { english: result, pidgin: `Abeg ${debtor.name}, please settle the ₦${balance.toLocaleString()} balance. Na important matter be this.` }, debtor });
      } else if (result?.english || result?.pidgin) {
        setReminder({ text: { english: result.english, pidgin: result.pidgin }, debtor });
      } else if (result?.message) {
        setReminder({ text: { english: result.message, pidgin: `Abeg ${debtor.name}, settle the ₦${balance.toLocaleString()} wey you owe. Thank you.` }, debtor });
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate AI reminders.");
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

  // Ageing Analytics Calculations
  const getDebtAgeingStatus = (dueDateStr: string) => {
    if (!dueDateStr) return 'ACTIVE';
    const due = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    due.setHours(0,0,0,0);
    
    if (due >= today) return 'ACTIVE';
    const diffTime = Math.abs(today.getTime() - due.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 15) return 'OVERDUE_1_15';
    if (diffDays <= 30) return 'OVERDUE_16_30';
    return 'OVERDUE_30_PLUS';
  };

  // Outstanding amounts
  const unpaidDebtorsList = debtors.filter(d => d.status !== 'PAID');
  const totalDebt = unpaidDebtorsList.reduce((acc, d) => acc + getOutstandingBalance(d), 0);
  
  const overdueDebtorsList = unpaidDebtorsList.filter(d => {
    if (!d.dueDate) return false;
    return new Date(d.dueDate) < new Date();
  });
  const totalOverdue = overdueDebtorsList.reduce((acc, d) => acc + getOutstandingBalance(d), 0);

  // Ageing segments
  const activeDebt = unpaidDebtorsList.filter(d => getDebtAgeingStatus(d.dueDate) === 'ACTIVE').reduce((acc, d) => acc + getOutstandingBalance(d), 0);
  const overdue1_15 = unpaidDebtorsList.filter(d => getDebtAgeingStatus(d.dueDate) === 'OVERDUE_1_15').reduce((acc, d) => acc + getOutstandingBalance(d), 0);
  const overdue16_30 = unpaidDebtorsList.filter(d => getDebtAgeingStatus(d.dueDate) === 'OVERDUE_16_30').reduce((acc, d) => acc + getOutstandingBalance(d), 0);
  const overdue30Plus = unpaidDebtorsList.filter(d => getDebtAgeingStatus(d.dueDate) === 'OVERDUE_30_PLUS').reduce((acc, d) => acc + getOutstandingBalance(d), 0);

  const activePercent = totalDebt > 0 ? (activeDebt / totalDebt) * 100 : 0;
  const overdue1_15Percent = totalDebt > 0 ? (overdue1_15 / totalDebt) * 100 : 0;
  const overdue16_30Percent = totalDebt > 0 ? (overdue16_30 / totalDebt) * 100 : 0;
  const overdue30PlusPercent = totalDebt > 0 ? (overdue30Plus / totalDebt) * 100 : 0;

  // Filtered & Searched Debtors list
  const filteredDebtors = debtors.filter(debtor => {
    // Filter check
    if (activeFilter === 'UNPAID' && debtor.status !== 'UNPAID') return false;
    if (activeFilter === 'PARTIAL' && debtor.status !== 'PARTIAL') return false;
    if (activeFilter === 'PAID' && debtor.status !== 'PAID') return false;

    // Search query check
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        debtor.name.toLowerCase().includes(query) ||
        debtor.phone.includes(query) ||
        debtor.itemsBought.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-20">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 font-heading flex items-center gap-2">
            <span>📒</span> Gbege Book (Debtor Tracker)
          </h2>
          <p className="text-slate-500 text-xs mt-1">Track outstanding balances, log payments, and recover business funds with smart AI WhatsApp reminders.</p>
        </div>
        <div className="flex gap-2.5 w-full sm:w-auto">
          <button
            onClick={handleSyncUnpaidInvoices}
            disabled={isSyncing}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 px-5 py-3.5 rounded-2xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Invoices'}
          </button>
          
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-5 py-3.5 rounded-2xl text-xs font-black shadow-lg shadow-red-600/10 active:scale-95 transition-all border-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {showForm ? 'Cancel' : 'Record New Debt'}
          </button>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Total Owed Card */}
        <div className="bg-gradient-to-br from-red-50 to-orange-50/50 border border-red-100 rounded-3xl p-6 flex justify-between items-start shadow-sm relative overflow-hidden">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-red-800/70 uppercase tracking-widest">Total Outstanding Debt</p>
            <h3 className="text-3xl font-black text-red-950 font-heading">₦{totalDebt.toLocaleString()}</h3>
            <p className="text-[10px] text-red-700 font-medium">Locked up cash flow</p>
          </div>
          <div className="bg-red-500/10 text-red-650 p-3 rounded-2xl text-xl">💸</div>
        </div>

        {/* Overdue Owed Card */}
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50/50 border border-amber-100 rounded-3xl p-6 flex justify-between items-start shadow-sm relative overflow-hidden">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-amber-800/70 uppercase tracking-widest">Overdue Balances</p>
            <h3 className="text-3xl font-black text-amber-955 font-heading">₦{totalOverdue.toLocaleString()}</h3>
            <p className="text-[10px] text-amber-700 font-medium">Past specified due dates</p>
          </div>
          <div className="bg-amber-500/10 text-amber-655 p-3 rounded-2xl text-xl">⚠️</div>
        </div>

        {/* Ageing bar Card */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Debt Ageing Distribution</p>
          
          <div className="space-y-2">
            {/* Unified Bar */}
            <div className="w-full h-2.5 rounded-full overflow-hidden bg-slate-100 flex">
              <div style={{ width: `${activePercent}%` }} className="bg-emerald-500" title="Active" />
              <div style={{ width: `${overdue1_15Percent}%` }} className="bg-amber-400" title="1-15 days overdue" />
              <div style={{ width: `${overdue16_30Percent}%` }} className="bg-orange-500" title="16-30 days overdue" />
              <div style={{ width: `${overdue30PlusPercent}%` }} className="bg-red-600" title="30+ days overdue" />
            </div>
            
            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 text-[9px] font-black text-slate-500">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Active: ₦{activeDebt.toLocaleString()}
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                1-15d Overdue: ₦{overdue1_15.toLocaleString()}
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                16-30d: ₦{overdue16_30.toLocaleString()}
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                30d+: ₦{overdue30Plus.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Record Debt Form */}
      {showForm && (
        <form onSubmit={handleAddDebtor} className="bg-white p-6 sm:p-8 rounded-[40px] border border-slate-150 shadow-xl space-y-6 animate-in slide-in-from-top-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
              <span>✍️</span> Record New Debt Ledger
            </h3>
            <button 
              type="button" 
              onClick={() => setShowForm(false)} 
              className="text-slate-400 hover:text-slate-600 text-sm bg-slate-50 p-1.5 rounded-full w-8 h-8 flex items-center justify-center transition-colors border-0 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Customer Name</label>
              <input 
                required 
                className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-xs font-bold focus:ring-2 focus:ring-red-500" 
                placeholder="Enter customer name" 
                value={newDebtor.name} 
                onChange={e => setNewDebtor({ ...newDebtor, name: e.target.value })} 
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Outstanding Balance (₦)</label>
              <input 
                required 
                type="number" 
                className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-xs font-black text-indigo-650 focus:ring-2 focus:ring-red-500" 
                placeholder="0.00" 
                value={newDebtor.amount} 
                onChange={e => setNewDebtor({ ...newDebtor, amount: e.target.value })} 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Customer Phone Contact</label>
              <input 
                required 
                className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-xs font-bold focus:ring-2 focus:ring-red-500" 
                placeholder="e.g. 08012345678" 
                value={newDebtor.phone} 
                onChange={e => setNewDebtor({ ...newDebtor, phone: e.target.value })} 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Due Date</label>
              <input 
                type="date" 
                className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-xs font-bold text-slate-500 focus:ring-2 focus:ring-red-500" 
                value={newDebtor.dueDate} 
                onChange={e => setNewDebtor({ ...newDebtor, dueDate: e.target.value })} 
              />
            </div>
          </div>

          {/* Product Catalog Linking Selector */}
          <div className="space-y-3 bg-slate-50 p-4.5 rounded-3xl border border-slate-200/60 relative">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Link Items from Inventory Catalog</label>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="deductToggle"
                  checked={deductStockOnSave} 
                  onChange={(e) => setDeductStockOnSave(e.target.checked)} 
                  className="w-3.5 h-3.5 rounded text-red-650 bg-slate-900" 
                />
                <label htmlFor="deductToggle" className="text-[10px] font-bold text-slate-500 cursor-pointer">Auto-deduct stock on save</label>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search catalog products..."
                  value={productSearchQuery}
                  onChange={(e) => {
                    setProductSearchQuery(e.target.value);
                    setShowProductDropdown(true);
                  }}
                  onFocus={() => setShowProductDropdown(true)}
                  className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 text-xs outline-none focus:ring-2 focus:ring-red-500"
                />
                
                {showProductDropdown && productSearchQuery.trim() && (
                  <div className="absolute top-full mt-2 w-full bg-white border border-slate-200 rounded-2xl shadow-xl z-20 max-h-56 overflow-y-auto divide-y divide-slate-50">
                    {catalogProducts
                      .filter(p => p.name.toLowerCase().includes(productSearchQuery.toLowerCase()))
                      .map(prod => (
                        <div
                          key={prod.id}
                          onClick={() => handleSelectItem(prod)}
                          className="flex items-center justify-between p-3 hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-700">{prod.name}</p>
                            <p className="text-[9px] text-slate-400">Stock: {prod.stock_count || 0} left • SKU: {prod.sku || 'N/A'}</p>
                          </div>
                          <span className="text-xs font-black text-indigo-650">₦{parseFloat(prod.price).toLocaleString()}</span>
                        </div>
                      ))}
                    {catalogProducts.filter(p => p.name.toLowerCase().includes(productSearchQuery.toLowerCase())).length === 0 && (
                      <div className="p-3.5 text-center text-xs text-slate-450 italic">No products matched query</div>
                    )}
                  </div>
                )}
              </div>
              {showProductDropdown && (
                <button 
                  type="button" 
                  onClick={() => setShowProductDropdown(false)} 
                  className="bg-slate-200 hover:bg-slate-300 text-slate-600 px-3 py-3 rounded-2xl text-xs font-bold transition-all border-0"
                >
                  Close
                </button>
              )}
            </div>

            {/* Selected items wrapper */}
            {selectedItems.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-slate-200/60">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Selected Staged items:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedItems.map((item) => (
                    <div key={item.product.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="w-3.5 h-3.5 text-red-500" />
                        <div>
                          <p className="text-xs font-bold text-slate-700">{item.product.name}</p>
                          <p className="text-[9px] text-slate-400">{item.quantity} x ₦{parseFloat(item.product.price).toLocaleString()}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSelectedItem(item.product.id)}
                        className="text-red-500 text-xs font-bold hover:underline bg-transparent border-0 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Manual Items Purchased Memo (Fallback)</label>
            <textarea 
              className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-xs font-bold focus:ring-2 focus:ring-red-500 resize-none" 
              rows={2}
              placeholder="e.g. 2 Ankara fabrics, catering deposit balance" 
              value={newDebtor.itemsBought} 
              onChange={e => setNewDebtor({ ...newDebtor, itemsBought: e.target.value })} 
            />
          </div>

          <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4.5 rounded-3xl font-black text-xs uppercase tracking-widest active:scale-95 shadow-xl transition-all border-0 cursor-pointer">
            Save Debtor Profile
          </button>
        </form>
      )}

      {/* Filter and Search controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-100 p-3.5 rounded-3xl shadow-sm">
        
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search debtor name/phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-150/70 rounded-2xl pl-12 pr-4 py-3 text-xs outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-150/50 gap-1 w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'ALL', label: '🗂️ All' },
            { id: 'UNPAID', label: '🔴 Owing' },
            { id: 'PARTIAL', label: '🟡 Partial' },
            { id: 'PAID', label: '🟢 Paid' }
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setActiveFilter(opt.id as any)}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-bold transition-all border-0 cursor-pointer ${activeFilter === opt.id ? 'bg-white shadow-sm text-slate-800' : 'text-slate-450 hover:text-slate-700'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>

      </div>

      {/* Debtors List Grid */}
      <div className="space-y-4">
        {filteredDebtors.length === 0 && (
          <div className="text-center py-14 bg-white border border-slate-100 rounded-[36px] shadow-sm">
            <span className="text-4xl">🎉</span>
            <p className="text-slate-500 text-xs font-bold mt-2">No debtors recorded in this segment. Cash flow is healthy!</p>
          </div>
        )}

        {filteredDebtors.map(debtor => {
          const outstanding = getOutstandingBalance(debtor);
          const totalPaid = (debtor.payments || []).reduce((acc, p) => acc + p.amount, 0);
          const isOverdue = debtor.dueDate && new Date(debtor.dueDate) < new Date() && debtor.status !== 'PAID';
          const nudgeToneSuggestion = (debtor.remindersSentCount || 0) >= 3 ? 'STRICT' : (debtor.remindersSentCount || 0) >= 1 ? 'FIRM' : 'POLITE';

          return (
            <div 
              key={debtor.id} 
              className={`bg-white border rounded-[36px] p-6 shadow-sm transition-all hover:shadow-md ${
                debtor.status === 'PAID' ? 'opacity-65 border-slate-100 bg-slate-50/50' : 
                isOverdue ? 'border-red-150 bg-red-50/5' : 'border-slate-100'
              }`}
            >
              <div className="flex flex-col lg:flex-row justify-between gap-6">
                
                {/* Left side: Profile details */}
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-extrabold text-slate-800 text-base">{debtor.name}</h4>
                    {debtor.status === 'PAID' && <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded font-black uppercase tracking-wider">PAID</span>}
                    {debtor.status === 'PARTIAL' && <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-150 px-2 py-0.5 rounded font-black uppercase tracking-wider">PARTIAL</span>}
                    {debtor.status === 'UNPAID' && <span className="text-[9px] bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded font-black uppercase tracking-wider">OWING</span>}
                    {isOverdue && <span className="text-[9px] bg-rose-600 text-white px-2 py-0.5 rounded-full font-black animate-pulse uppercase tracking-wider flex items-center gap-1"><AlertCircle size={9} />OVERDUE</span>}
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-xs text-slate-650 font-bold flex items-center gap-1.5">
                      <span className="text-indigo-650">Outstanding: ₦{outstanding.toLocaleString()}</span>
                      {totalPaid > 0 && <span className="text-slate-400 font-medium text-[11px]">(Total debt: ₦{debtor.amount.toLocaleString()}, Paid: ₦{totalPaid.toLocaleString()})</span>}
                    </p>
                    <p className="text-xs text-slate-400 font-semibold italic">Items: {debtor.itemsBought}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-[10px] text-slate-400 font-bold">
                      {debtor.dueDate && <span className="flex items-center gap-1"><Calendar size={11} /> Due: {debtor.dueDate}</span>}
                      {debtor.phone && <span className="flex items-center gap-1"><Phone size={11} /> {debtor.phone}</span>}
                      {debtor.remindersSentCount ? (
                        <span className="flex items-center gap-1 text-indigo-500"><Send size={11} /> Reminded {debtor.remindersSentCount}x (Last: {new Date(debtor.lastReminderSent || 0).toLocaleDateString()})</span>
                      ) : (
                        <span className="flex items-center gap-1 text-slate-450"><Send size={11} /> No nudges sent yet</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right side: Action controls */}
                <div className="flex flex-col sm:flex-row lg:flex-col justify-end gap-3 min-w-[240px]">
                  {debtor.status !== 'PAID' && (
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        {/* Escalate Tone select based on nudge count */}
                        <select
                          className="text-[10px] font-bold border border-slate-200 rounded-xl px-2.5 bg-slate-50 text-slate-600 outline-none"
                          value={reminderTone}
                          onChange={(e) => setReminderTone(e.target.value as any)}
                        >
                          <option value="POLITE">Polite Tone</option>
                          <option value="FIRM">Firm Tone</option>
                          <option value="STRICT">Strict Tone</option>
                        </select>
                        
                        <button
                          type="button"
                          onClick={() => {
                            if (reminderTone !== nudgeToneSuggestion) {
                              toast(`Note: AI suggests using ${nudgeToneSuggestion.toLowerCase()} tone based on nudge count.`);
                            }
                            handleGenerateReminder(debtor);
                          }}
                          disabled={isGenerating}
                          className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-wider py-2.5 px-3 rounded-xl transition-all border-0 flex items-center justify-center gap-1"
                        >
                          {isGenerating ? '...' : 'Generate Nudge'}
                        </button>
                      </div>
                      
                      <div className="flex gap-2">
                        <button 
                          type="button"
                          onClick={() => {
                            setPaymentModalDebtor(debtor);
                            setPaymentAmount(String(outstanding));
                          }}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider py-2.5 rounded-xl transition-all border-0"
                        >
                          Record Payment
                        </button>
                        
                        <button 
                          type="button"
                          onClick={() => setExpandedDebtorId(expandedDebtorId === debtor.id ? null : debtor.id)}
                          className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 p-2.5 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1"
                        >
                          <Eye size={12} />
                          {expandedDebtorId === debtor.id ? 'Hide Ledger' : 'View Ledger'}
                        </button>
                      </div>
                    </div>
                  )}
                  {debtor.status === 'PAID' && (
                    <div className="flex justify-end items-center gap-3">
                      <button 
                        type="button"
                        onClick={() => setExpandedDebtorId(expandedDebtorId === debtor.id ? null : debtor.id)}
                        className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 px-3 py-2 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1"
                      >
                        <Eye size={12} /> Ledger
                      </button>
                      
                      <button 
                        type="button"
                        onClick={() => handleDelete(debtor.id)} 
                        className="text-red-500 text-[10px] font-black uppercase tracking-wider hover:bg-red-50 border border-transparent hover:border-red-200 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

              </div>

              {/* Expandable installment timeline ledger */}
              <AnimatePresence>
                {expandedDebtorId === debtor.id && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mt-4 pt-4 border-t border-slate-100"
                  >
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Installments / Payment Ledger</h5>
                    {(!debtor.payments || debtor.payments.length === 0) ? (
                      <p className="text-slate-450 italic text-[11px]">No transactions logged. Outstanding balance is 100% unpaid.</p>
                    ) : (
                      <div className="relative pl-4 border-l border-slate-200 space-y-4 py-1">
                        {debtor.payments.map((pay, pIdx) => (
                          <div key={pIdx} className="relative space-y-1">
                            {/* Bullet indicator */}
                            <span className="absolute -left-[20.5px] top-0.5 w-3 h-3 rounded-full bg-emerald-500 border border-white flex items-center justify-center text-[7px]" />
                            <div className="flex justify-between items-start text-xs">
                              <span className="font-bold text-slate-700">₦{pay.amount.toLocaleString()} ({pay.method})</span>
                              <span className="text-[10px] text-slate-400 font-medium">{new Date(pay.timestamp).toLocaleString()}</span>
                            </div>
                            {pay.note && <p className="text-[11px] text-slate-550 leading-relaxed italic">Memo: "{pay.note}"</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          );
        })}
      </div>

      {/* Record Payment Modal */}
      {paymentModalDebtor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <form onSubmit={handleRecordPaymentSubmit} className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95 space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-1.5">
                <span>💰</span> Record Installment
              </h3>
              <button 
                type="button" 
                onClick={() => setPaymentModalDebtor(null)} 
                className="text-slate-450 hover:text-slate-650 text-base bg-slate-50 rounded-full w-7 h-7 flex items-center justify-center border-0 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 font-semibold">
              Log payment entry for <b className="text-slate-800">{paymentModalDebtor.name}</b>. Remaining outstanding: <b className="text-indigo-650">₦{getOutstandingBalance(paymentModalDebtor).toLocaleString()}</b>
            </p>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount Paid (₦)</label>
              <input 
                required 
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-black text-indigo-600 focus:ring-2 focus:ring-emerald-500 outline-none" 
                placeholder="0.00" 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'CASH', label: '💵 Cash' },
                  { id: 'TRANSFER', label: '🏦 Transfer' },
                  { id: 'POS', label: '💳 POS' }
                ].map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id as any)}
                    className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                      paymentMethod === method.id
                        ? 'bg-emerald-650 border-emerald-700 text-white shadow-sm shadow-emerald-500/20'
                        : 'bg-slate-50 border-slate-200/60 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {method.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Memo / Note</label>
              <input 
                type="text"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none" 
                placeholder="Optional description" 
              />
            </div>

            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all border-0 cursor-pointer">
              Log Payment Transaction
            </button>
          </form>
        </div>
      )}

      {/* Reminder Message Detail Modal */}
      {reminder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 space-y-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-extrabold text-slate-800 font-heading text-sm uppercase tracking-wider flex items-center gap-1.5">
                  <span>💬</span> AI Reminder Generated
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Send a polite or firm message directly to WhatsApp</p>
              </div>
              <button 
                type="button" 
                onClick={() => setReminder(null)} 
                className="text-slate-400 hover:text-slate-650 text-base bg-slate-50 rounded-full w-8 h-8 flex items-center justify-center border-0 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Tab buttons */}
            <div className="flex border-b border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('english')}
                className={`flex-1 py-2.5 font-black text-[10px] uppercase tracking-wider ${activeTab === 'english' ? 'border-b-2 border-indigo-600 text-indigo-650' : 'text-slate-400 hover:text-slate-600 bg-transparent border-0'}`}
              >
                🇬🇧 English Version
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('pidgin')}
                className={`flex-1 py-2.5 font-black text-[10px] uppercase tracking-wider ${activeTab === 'pidgin' ? 'border-b-2 border-indigo-600 text-indigo-650' : 'text-indigo-650 hover:text-indigo-800 bg-transparent border-0'}`}
              >
                🇳🇬 Naija Pidgin
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl text-xs text-slate-700 whitespace-pre-wrap italic border-l-4 border-indigo-500 max-h-52 overflow-y-auto leading-relaxed">
              "{reminder.text[activeTab]}"
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <a
                href={`https://wa.me/${reminder.debtor.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(reminder.text[activeTab])}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-green-600 hover:bg-green-700 text-white text-center py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-green-600/15 hover:-translate-y-0.5 active:scale-95 text-decoration-none"
              >
                <span>💬</span> Send to WhatsApp
              </a>
              
              <ShareActions text={reminder.text[activeTab]} title="Debt Reminder" />
            </div>
          </div>
        </div>
      )}

      {/* Credit Prompt Modal */}
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