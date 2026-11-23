import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  DollarSign, Calendar, Phone, Plus, Trash2, CheckCircle, 
  Clock, AlertTriangle, ArrowRight, RefreshCw, Send, Search, 
  Eye, Filter, CreditCard, Landmark, BookOpen, AlertCircle, ShoppingBag, X,
  Printer, FileText, Settings as SettingsIcon, Link as LinkIcon, Zap, Share2
} from 'lucide-react';
import { Debtor, DebtorPayment, Product, Invoice, SupplierPayable } from '../types';
import { generateDebtReminder } from '../services/geminiService';
import ShareActions from './ShareActions';
import { usageLimiter } from '../utils/usageLimiter';
import { billingService } from '../services/billingService';
import CreditPromptModal from './CreditPromptModal';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { marketingService } from '../services/marketingService';
import { motion, AnimatePresence } from 'framer-motion';

interface DebtorBookProps {
  credits?: number;
  onUpdateCredits?: (credits: number) => void;
}

const DebtorBook: React.FC<DebtorBookProps> = ({ credits = 0, onUpdateCredits }) => {
  const navigate = useNavigate();
  const [primaryMode, setPrimaryMode] = useState<'RECEIVABLES' | 'PAYABLES'>('RECEIVABLES');

  const [debtors, setDebtors] = useState<Debtor[]>(() => {
    const saved = localStorage.getItem('sb_debtors');
    return saved ? JSON.parse(saved) : [];
  });

  const [suppliers, setSuppliers] = useState<SupplierPayable[]>(() => {
    const saved = localStorage.getItem('sb_supplier_payables');
    return saved ? JSON.parse(saved) : [];
  });

  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    supplierName: '',
    phone: '',
    amount: '',
    itemsSupplied: '',
    invoiceNumber: '',
    dueDate: '',
    notes: ''
  });
  
  const [showForm, setShowForm] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get('action') === 'new';
    } catch {
      return false;
    }
  });
  const [activeTab, setActiveTab] = useState<'english' | 'pidgin'>('english');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Per-debtor selected tone state
  const [selectedTones, setSelectedTones] = useState<Record<string, 'POLITE' | 'FIRM' | 'STRICT' | 'NATIVE_PIDGIN' | 'DISCOUNT_INCENTIVE'>>({});
  
  const getDebtorTone = (debtorId: string): 'POLITE' | 'FIRM' | 'STRICT' | 'NATIVE_PIDGIN' | 'DISCOUNT_INCENTIVE' => {
    return selectedTones[debtorId] || 'POLITE';
  };
  
  // Advanced features state
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNPAID' | 'PARTIAL' | 'PAID' | 'ARCHIVED'>('ALL');
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
  const [reminder, setReminder] = useState<{ text: { english: string; pidgin: string }; debtor: Debtor; tone: string } | null>(null);
  const [sendingCloudReminder, setSendingCloudReminder] = useState(false);

  // Gbege Automation & Enterprise Recovery States
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; sent: number; failed: number } | null>(null);
  const [isBatchSending, setIsBatchSending] = useState(false);
  const [showAutomationPolicy, setShowAutomationPolicy] = useState(false);
  const [demandNoticeDebtor, setDemandNoticeDebtor] = useState<Debtor | null>(null);
  const [copiedLinkDebtorId, setCopiedLinkDebtorId] = useState<string | null>(null);

  // Live verified merchant bank details
  const [merchantBank, setMerchantBank] = useState<{ bank_name: string; account_number: string; account_name: string } | null>(() => {
    try {
      const saved = localStorage.getItem('sb_bank_payout');
      if (saved) {
        const b = JSON.parse(saved);
        if (b.account_number && !['0098765432', '1012345678', '0123456789'].includes(b.account_number)) {
          return b;
        }
      }
    } catch {}
    return null;
  });

  useEffect(() => {
    // 1. Fetch live bank payout details from backend
    api.get('/api/marketplace/payout/details/').then(res => {
      if (res.data && res.data.account_number && !['0098765432', '1012345678', '0123456789'].includes(res.data.account_number)) {
        const payoutInfo = {
          bank_name: res.data.bank_name || '',
          account_number: res.data.account_number || '',
          account_name: res.data.account_name || ''
        };
        setMerchantBank(payoutInfo);
        localStorage.setItem('sb_bank_payout', JSON.stringify(payoutInfo));
      }
    }).catch(() => {});

    const onBankUpdated = () => {
      try {
        const saved = localStorage.getItem('sb_bank_payout');
        if (saved) {
          const b = JSON.parse(saved);
          if (b.account_number && !['0098765432', '1012345678'].includes(b.account_number)) {
            setMerchantBank(b);
          }
        }
      } catch {}
    };
    window.addEventListener('sb_bank_payout_updated', onBankUpdated);
    return () => window.removeEventListener('sb_bank_payout_updated', onBankUpdated);
  }, []);

  // Helper: Retrieve merchant branding & bank details for payment embedding
  const getMerchantDetails = () => {
    let merchantName = 'My Business';
    let merchantPhone = '';
    let bankName = '';
    let bankAccount = '';
    let bankAccountName = '';

    try {
      const savedUser = localStorage.getItem('sb_user');
      if (savedUser) {
        const u = JSON.parse(savedUser);
        merchantName = u.businessName || u.business_name || u.name || merchantName;
        merchantPhone = u.phone || '';
      }
    } catch {}

    const DUMMY_ACCOUNTS = ['0098765432', '1012345678', '0123456789', '1234567890'];

    if (merchantBank && merchantBank.account_number && !DUMMY_ACCOUNTS.includes(merchantBank.account_number)) {
      bankName = merchantBank.bank_name || '';
      bankAccount = merchantBank.account_number;
      bankAccountName = merchantBank.account_name || merchantName;
    } else {
      try {
        const savedBank = localStorage.getItem('sb_bank_payout');
        if (savedBank) {
          const b = JSON.parse(savedBank);
          if (b.account_number && !DUMMY_ACCOUNTS.includes(b.account_number)) {
            bankName = b.bank_name || '';
            bankAccount = b.account_number;
            bankAccountName = b.account_name || merchantName;
          }
        }
      } catch {}
    }

    if (!bankAccount) {
      try {
        const savedInvoices = localStorage.getItem('sb_invoices_detailed');
        if (savedInvoices) {
          const invList = JSON.parse(savedInvoices);
          const withBank = invList.find((i: any) => 
            i.bankAccountNumber && 
            !DUMMY_ACCOUNTS.includes(i.bankAccountNumber) &&
            !String(i.id || '').startsWith('INV-202')
          );
          if (withBank) {
            bankName = withBank.bankName || '';
            bankAccount = withBank.bankAccountNumber;
            bankAccountName = withBank.bankAccountName || merchantName;
          }
        }
      } catch {}
    }

    return { merchantName, merchantPhone, bankName, bankAccount, bankAccountName };
  };

  // Helper: Generate universal 1-Tap Paystack settlement URL
  const buildSettlementUrl = (debtor: Debtor) => {
    const outstanding = getOutstandingBalance(debtor);
    const m = getMerchantDetails();
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://smartbizcoach.com.ng';
    const params = new URLSearchParams();
    if (debtor.name) params.set('n', debtor.name);
    if (debtor.amount) params.set('a', String(debtor.amount));
    if (outstanding) params.set('b', String(outstanding));
    if (debtor.itemsBought) params.set('i', debtor.itemsBought.slice(0, 50));
    if (debtor.dueDate) params.set('d', debtor.dueDate);
    if (m.merchantName) params.set('m', m.merchantName);
    if (m.merchantPhone) params.set('p', m.merchantPhone);
    if (m.bankAccount && m.bankName) {
      params.set('bn', m.bankName);
      params.set('ba', m.bankAccount);
      params.set('ban', m.bankAccountName || m.merchantName);
    }
    return `${origin}/pay-debt/${debtor.id}?${params.toString()}`;
  };

  // Helper: Build tailored multi-stage WhatsApp reminder copy with embedded online link and bank details
  const buildReminderCopy = (
    debtor: Debtor,
    tone: 'POLITE' | 'FIRM' | 'STRICT' | 'NATIVE_PIDGIN' | 'DISCOUNT_INCENTIVE',
    lang: 'english' | 'pidgin' = 'english'
  ) => {
    const outstanding = getOutstandingBalance(debtor);
    const m = getMerchantDetails();
    const payUrl = buildSettlementUrl(debtor);
    const daysOverdue = debtor.dueDate ? Math.max(0, Math.floor((Date.now() - new Date(debtor.dueDate).getTime()) / 86400000)) : 0;

    const bankBlock = m.bankAccount
      ? `\n\n🏦 *Direct Bank Transfer:*\n• Bank: *${m.bankName}*\n• Account: *${m.bankAccount}*\n• Name: *${m.bankAccountName}*`
      : '';
    const payBlock = `\n\n💳 *Pay Online Instantly (Card / USSD / Transfer):*\n${payUrl}`;

    if (lang === 'pidgin' || tone === 'NATIVE_PIDGIN') {
      let body = '';
      if (tone === 'DISCOUNT_INCENTIVE') {
        const discounted = Math.round(outstanding * 0.95);
        body = `How far ${debtor.name} 🎁! Quick promo offer from ${m.merchantName}: If you clear your *₦${outstanding.toLocaleString()}* balance for *${debtor.itemsBought}* today, pay only *₦${discounted.toLocaleString()}* (5% discount)!`;
      } else if (tone === 'STRICT') {
        body = `⚠️ *GBEGE FINAL NOTICE*\nHow far ${debtor.name}, your *₦${outstanding.toLocaleString()}* balance for *${debtor.itemsBought}* don pass time by ${daysOverdue} days. Abeg clear am today make we no freeze credit for your name.`;
      } else if (tone === 'FIRM') {
        body = `Good day ${debtor.name}, na important reminder from ${m.merchantName} on top your *₦${outstanding.toLocaleString()}* balance for *${debtor.itemsBought}*. E don pass due date. Kindly balance up today.`;
      } else {
        body = `How far ${debtor.name} 👋! Na gentle reminder from ${m.merchantName} on top your *₦${outstanding.toLocaleString()}* balance for *${debtor.itemsBought}*. Make you help us do the transfer make we balance our record. Thank you! 🙏`;
      }
      return `${body}${payBlock}${bankBlock}\n\n_Reply with your screenshot or receipt once you pay!_`;
    }

    // English Version
    let body = '';
    if (tone === 'DISCOUNT_INCENTIVE') {
      const discounted = Math.round(outstanding * 0.95);
      body = `Hello ${debtor.name} 🎁! Special early-settlement incentive from ${m.merchantName}: Settle your outstanding balance of *₦${outstanding.toLocaleString()}* for *${debtor.itemsBought}* within 24 hours and pay only *₦${discounted.toLocaleString()}* (5% early waiver)!`;
    } else if (tone === 'STRICT') {
      body = `⚠️ *FORMAL DEMAND & DEFAULT NOTICE*\nDear ${debtor.name}, your account balance of *₦${outstanding.toLocaleString()}* for *${debtor.itemsBought}* with ${m.merchantName} is now ${daysOverdue > 0 ? `${daysOverdue} days overdue` : 'past due'}. Settle immediately to avoid formal credit reporting and suspension of credit privileges.`;
    } else if (tone === 'FIRM') {
      body = `Dear ${debtor.name}, this is a firm follow-up regarding your overdue balance of *₦${outstanding.toLocaleString()}* for *${debtor.itemsBought}* with ${m.merchantName}. Kindly complete this settlement today.`;
    } else {
      body = `Hello ${debtor.name} 👋, warm greetings from ${m.merchantName}! This is a polite reminder regarding your outstanding balance of *₦${outstanding.toLocaleString()}* for *${debtor.itemsBought}*. We appreciate your valued patronage.`;
    }

    return `${body}${payBlock}${bankBlock}\n\n_Please reply with your transfer receipt or confirmation after payment._`;
  };

  const handleSendCloudWAReminder = async () => {
    if (!reminder) return;
    setSendingCloudReminder(true);
    try {
      const msgText = reminder.text[activeTab];
      const res = await marketingService.sendWhatsAppCloudMessage({
        phone: reminder.debtor.phone,
        message: msgText
      });
      if (res.sent_via_cloud_api) {
        toast.success(res.message || "WhatsApp debt reminder sent via Cloud API! ⚡");
      } else if (res.whatsapp_url) {
        toast.success("Opening WhatsApp chat with debtor... 💬");
        window.open(res.whatsapp_url, '_blank');
      } else {
        toast.success(res.message || "Reminder processed successfully!");
      }
    } catch (err: any) {
      const fallbackUrl = err?.response?.data?.whatsapp_url;
      if (fallbackUrl) {
        toast("Connecting to WhatsApp chat directly... 💬");
        window.open(fallbackUrl, '_blank');
      } else {
        toast.error(err?.response?.data?.error || "Failed to send WhatsApp message. Falling back to direct chat.");
      }
    } finally {
      setSendingCloudReminder(false);
    }
  };

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

    if (!newDebtor.phone || !newDebtor.phone.trim()) {
      toast.error("Customer phone number is required for WhatsApp debt tracking and recovery.");
      return;
    }
    const cleanPhone = newDebtor.phone.replace(/[\s\-()]/g, '');
    const ngPhoneRegex = /^(?:\+?234|0)[789][01]\d{8}$/;
    if (!ngPhoneRegex.test(cleanPhone) || /^0+$/.test(cleanPhone)) {
      toast.error("Please enter a valid Nigerian mobile phone number (e.g. 08012345678 or +2348012345678) for WhatsApp debt recovery.");
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

    // Also post to backend DailySale as a credit sale so backend analytics and cash cliff are synchronized
    api.post('/api/marketplace/daily-sales/', {
      item_name: itemsText || 'General Credit Sale',
      total_amount: parseFloat(newDebtor.amount),
      quantity: 1,
      unit_price: parseFloat(newDebtor.amount),
      payment_method: 'CREDIT',
      is_debt: true,
      customer_name: newDebtor.name,
      customer_phone: newDebtor.phone,
      debt_due_date: newDebtor.dueDate || undefined,
      notes: `Gbege Book Debtor #${d.id}`
    }).catch(err => {
      console.warn("Could not sync credit sale to backend:", err);
    });

    toast.success("Debtor recorded successfully!");
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplier.supplierName || !newSupplier.amount) {
      toast.error('Supplier name and amount are required!');
      return;
    }
    const sup: SupplierPayable = {
      id: `sup-${Date.now()}`,
      supplierName: newSupplier.supplierName,
      phone: newSupplier.phone,
      amount: parseFloat(newSupplier.amount) || 0,
      paidAmount: 0,
      itemsSupplied: newSupplier.itemsSupplied || 'Goods on Credit',
      invoiceNumber: newSupplier.invoiceNumber,
      dueDate: newSupplier.dueDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      status: 'UNPAID',
      date: new Date().toISOString().split('T')[0],
      notes: newSupplier.notes
    };
    const updated = [sup, ...suppliers];
    setSuppliers(updated);
    localStorage.setItem('sb_supplier_payables', JSON.stringify(updated));
    setNewSupplier({ supplierName: '', phone: '', amount: '', itemsSupplied: '', invoiceNumber: '', dueDate: '', notes: '' });
    setShowSupplierForm(false);
    toast.success('Supplier credit recorded successfully! 📦');
  };

  const handleToggleSupplierStatus = (id: string) => {
    const updated = suppliers.map(s => {
      if (s.id === id) {
        const isPaid = s.status === 'PAID';
        return {
          ...s,
          status: (isPaid ? 'UNPAID' : 'PAID') as 'UNPAID' | 'PAID',
          paidAmount: isPaid ? 0 : s.amount
        };
      }
      return s;
    });
    setSuppliers(updated);
    localStorage.setItem('sb_supplier_payables', JSON.stringify(updated));
    toast.success('Supplier payment status updated!');
  };

  const handleSupplierWhatsApp = (sup: SupplierPayable) => {
    const text = `Hello ${sup.supplierName},\n\nRegarding the goods taken on credit (*${sup.itemsSupplied}*, Total: ₦${sup.amount.toLocaleString()}):\nConfirming payment is scheduled for ${sup.dueDate}.\nThank you for your trusted supply partnership! 🙏`;
    const cleanPhone = sup.phone ? sup.phone.replace(/\D/g, '') : '';
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone.startsWith('0') ? '234' + cleanPhone.slice(1) : cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const totalSupplierDebt = suppliers.filter(s => s.status !== 'PAID').reduce((acc, curr) => acc + (curr.amount - (curr.paidAmount || 0)), 0);
  const totalSupplierPaid = suppliers.filter(s => s.status === 'PAID').reduce((acc, curr) => acc + curr.amount, 0);

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

    // Synchronize receipt transaction with DailyCashbook and backend
    const today = new Date().toISOString().split('T')[0];
    const saleReceiptPayload = {
      item_name: `Debtor Recovery: ${paymentModalDebtor.name} (${paymentNote || 'Installment'})`,
      total_amount: payVal,
      quantity: 1,
      unit_price: payVal,
      payment_method: paymentMethod, // 'TRANSFER', 'CASH', or 'POS'
      is_debt: false,
      customer_name: paymentModalDebtor.name,
      customer_phone: paymentModalDebtor.phone,
      notes: `Gbege installment receipt for debtor #${paymentModalDebtor.id}`
    };

    // 1. Post to backend DailySale
    api.post('/api/marketplace/daily-sales/', saleReceiptPayload).catch(err => {
      console.warn("Failed to sync debtor receipt to backend:", err);
    });

    // 2. Also save to local offline sales cache so Day-Book reflects it immediately
    try {
      const localOffline = JSON.parse(localStorage.getItem('sb_offline_sales') || '[]');
      const localSale = {
        id: `deb-rec-${Date.now()}`,
        date: today,
        created_at: new Date().toISOString(),
        ...saleReceiptPayload
      };
      localStorage.setItem('sb_offline_sales', JSON.stringify([localSale, ...localOffline]));

      const cachedToday = JSON.parse(localStorage.getItem(`sb_cached_sales_${today}`) || '[]');
      localStorage.setItem(`sb_cached_sales_${today}`, JSON.stringify([localSale, ...cachedToday]));
    } catch (e) {
      console.warn("Could not cache debtor receipt locally:", e);
    }

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
    if (confirm("Are you sure you want to archive this debtor record? It can be restored anytime from the Archived tab.")) {
      setDebtors(debtors.map(d => d.id === id ? { ...d, is_archived: true, deleted_at: new Date().toISOString() } : d));
      toast.success("Debtor record moved to archive");
    }
  };

  const handleRestore = (id: string) => {
    setDebtors(debtors.map(d => d.id === id ? { ...d, is_archived: false, deleted_at: undefined } : d));
    toast.success("Debtor record restored from archive");
  };

  const executeGenerateReminder = async (
    debtor: Debtor, 
    deduct: boolean, 
    cost: number, 
    targetTone: 'POLITE' | 'FIRM' | 'STRICT' | 'NATIVE_PIDGIN' | 'DISCOUNT_INCENTIVE' = 'POLITE'
  ) => {
    setIsGenerating(true);
    setShowCreditPrompt(false);
    const balance = getOutstandingBalance(debtor);
    try {
      // API returns structured { english, pidgin } debt recovery messages tailored to exact tone
      const result = await generateDebtReminder(
        debtor.name, 
        balance, 
        targetTone,
        debtor.itemsBought,
        debtor.dueDate
      );
      
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

      const autoEn = buildReminderCopy(debtor, targetTone, 'english');
      const autoPcm = buildReminderCopy(debtor, targetTone, 'pidgin');

      if (typeof result === 'string') {
        setReminder({ 
          text: { 
            english: `${result}\n\n${buildSettlementUrl(debtor) ? `💳 Pay Online: ${buildSettlementUrl(debtor)}` : ''}`, 
            pidgin: autoPcm
          }, 
          debtor,
          tone: targetTone
        });
      } else if (result?.english || result?.pidgin) {
        setReminder({ 
          text: { 
            english: `${result.english || autoEn}\n\n💳 Pay Online: ${buildSettlementUrl(debtor)}`, 
            pidgin: `${result.pidgin || autoPcm}\n\n💳 Pay Online: ${buildSettlementUrl(debtor)}` 
          }, 
          debtor,
          tone: targetTone
        });
      } else {
        setReminder({ 
          text: { 
            english: autoEn, 
            pidgin: autoPcm
          }, 
          debtor,
          tone: targetTone
        });
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate AI reminder. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateReminder = async (
    debtor: Debtor, 
    targetTone?: 'POLITE' | 'FIRM' | 'STRICT' | 'NATIVE_PIDGIN' | 'DISCOUNT_INCENTIVE'
  ) => {
    const toneToUse = targetTone || getDebtorTone(debtor.id);
    const usage = usageLimiter.checkUsage('debt_reminder', credits);
    if (!usage.allowed) {
      setDeductOnConfirm(null);
      setShowCreditPrompt(true);
      return;
    }
    if (usage.useCredits) {
      setDeductOnConfirm(() => async () => { await executeGenerateReminder(debtor, true, usage.cost, toneToUse); });
      setShowCreditPrompt(true);
      return;
    }
    await executeGenerateReminder(debtor, false, 0, toneToUse);
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
  const unpaidDebtorsList = debtors.filter(d => !d.is_archived && d.status !== 'PAID');
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
    if (activeFilter === 'ARCHIVED') {
      if (!debtor.is_archived) return false;
    } else {
      if (debtor.is_archived) return false;
      if (activeFilter === 'UNPAID' && debtor.status !== 'UNPAID') return false;
      if (activeFilter === 'PARTIAL' && debtor.status !== 'PARTIAL') return false;
      if (activeFilter === 'PAID' && debtor.status !== 'PAID') return false;
    }

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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 font-heading flex items-center gap-2">
            <span>📒</span> Gbege Book (Credit & Debt Ledger)
          </h2>
          <p className="text-slate-500 text-xs mt-1">Track customer debts and manage wholesale supplier payables so your cashflow stays healthy.</p>
        </div>

        {/* Primary Mode Tabs */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full md:w-fit border border-slate-200">
          <button
            onClick={() => setPrimaryMode('RECEIVABLES')}
            className={`flex-1 md:flex-initial px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              primaryMode === 'RECEIVABLES'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>📒</span> Customers Who Owe Me ({debtors.filter(d => d.status !== 'PAID').length})
          </button>

          <button
            onClick={() => setPrimaryMode('PAYABLES')}
            className={`flex-1 md:flex-initial px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              primaryMode === 'PAYABLES'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>📦</span> Suppliers I Owe ({suppliers.filter(s => s.status !== 'PAID').length})
          </button>
        </div>
      </div>

      {/* Verified Bank Account Status Banner */}
      {!getMerchantDetails().bankAccount && (
        <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-xl shrink-0">⚠️</span>
            <div>
              <p className="text-xs font-black text-amber-950">Direct Bank Account Not Configured for Debt Settlement</p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Customers can settle debts via online Paystack checkout, but direct bank transfer details won't be shown until you configure your verified bank account in Settings & Wallet.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard/settings?tab=payouts')}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            Add Bank Account ➔
          </button>
        </div>
      )}

      {primaryMode === 'RECEIVABLES' ? (
        <>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {overdueDebtorsList.length > 0 && (
              <button
                onClick={() => setShowBatchModal(true)}
                className="flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white px-4 py-3 rounded-2xl text-xs font-black shadow-md shadow-rose-600/20 active:scale-95 transition-all cursor-pointer border-0 animate-pulse"
                title="1-Click Auto-Pilot Batch Recovery for all overdue accounts"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Nudge All Overdue ({overdueDebtorsList.length})</span>
              </button>
            )}

            <button
              onClick={() => setShowAutomationPolicy(true)}
              className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-3 rounded-2xl text-xs font-extrabold transition-all cursor-pointer border-0"
              title="Configure automated escalation schedules and debt policy"
            >
              <SettingsIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Auto-Pilot</span> Rules
            </button>

            <button
              onClick={handleSyncUnpaidInvoices}
              disabled={isSyncing}
              className="flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 px-4 py-3 rounded-2xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync Invoices'}</span>
            </button>
            
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-2xl text-xs font-black shadow-lg shadow-emerald-600/15 active:scale-95 transition-all border-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{showForm ? 'Cancel' : 'Record New Debt'}</span>
            </button>
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
            { id: 'PAID', label: '🟢 Paid' },
            { id: 'ARCHIVED', label: '🗄️ Archived' }
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
          const daysOverdue = debtor.dueDate ? Math.max(0, Math.floor((Date.now() - new Date(debtor.dueDate).getTime()) / 86400000)) : 0;
          const paidRatio = debtor.amount > 0 ? totalPaid / debtor.amount : 0;

          // Sprint 3.2: ML Default Risk Scoring & Escalation Engine
          const mlRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' =
            debtor.status === 'PAID' ? 'LOW' :
            (daysOverdue > 21 || ((debtor.remindersSentCount || 0) >= 3 && paidRatio < 0.2)) ? 'HIGH' :
            (daysOverdue > 5 || (debtor.remindersSentCount || 0) >= 1) ? 'MEDIUM' : 'LOW';

          const recoveryProbPct =
            debtor.status === 'PAID' ? 100 :
            mlRiskLevel === 'LOW' ? Math.min(96, Math.round(85 + paidRatio * 12)) :
            mlRiskLevel === 'MEDIUM' ? Math.round(64 + paidRatio * 18) :
            Math.max(28, Math.round(42 - Math.min(14, daysOverdue / 4)));

          const handleInstantWhatsAppEscalation = () => {
            const tone = getDebtorTone(debtor.id);
            const waText = buildReminderCopy(debtor, tone, tone === 'NATIVE_PIDGIN' ? 'pidgin' : 'english');

            // Log nudge count
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

            const cleanPhone = (debtor.phone || '').replace(/\D/g, '');
            const intlPhone = cleanPhone.startsWith('0') && cleanPhone.length === 11 ? '234' + cleanPhone.slice(1) : cleanPhone;
            const url = intlPhone.length >= 10
              ? `https://wa.me/${intlPhone}?text=${encodeURIComponent(waText)}`
              : `https://wa.me/?text=${encodeURIComponent(waText)}`;
            window.open(url, '_blank', 'noopener,noreferrer');
          };

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
                    {debtor.status !== 'PAID' && (
                      <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider border ${
                        isOverdue ? 'bg-rose-100 text-rose-800 border-rose-200' :
                        (debtor.payments && debtor.payments.length > 0) ? 'bg-amber-100 text-amber-800 border-amber-200' :
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {isOverdue 
                          ? `⚠️ Overdue by ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''}` 
                          : (debtor.payments && debtor.payments.length > 0)
                          ? `Repaying: ${Math.round(paidRatio * 100)}% Settled`
                          : 'Active Credit • Awaiting Initial Payment'}
                      </span>
                    )}
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
                <div className="flex flex-col sm:flex-row lg:flex-col justify-end gap-3 min-w-[260px]">
                  {debtor.status !== 'PAID' && (
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        {/* Escalate Tone select based on nudge count */}
                        <select
                          className="text-[10px] font-bold border border-slate-200 rounded-xl px-2.5 py-2 bg-slate-50 text-slate-700 outline-none cursor-pointer focus:ring-1 focus:ring-indigo-500 shadow-sm"
                          value={getDebtorTone(debtor.id)}
                          onChange={(e) => setSelectedTones(prev => ({ ...prev, [debtor.id]: e.target.value as any }))}
                        >
                          <option value="POLITE">😊 Polite Tone</option>
                          <option value="FIRM">⚖️ Firm & Direct</option>
                          <option value="STRICT">🚨 Strict Warning</option>
                          <option value="NATIVE_PIDGIN">🇳🇬 Naija Pidgin</option>
                          <option value="DISCOUNT_INCENTIVE">🎁 5% Waiver Offer</option>
                        </select>
                        
                        <button
                          type="button"
                          onClick={handleInstantWhatsAppEscalation}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider py-2.5 px-3 rounded-xl transition-all border-0 flex items-center justify-center gap-1 cursor-pointer active:scale-95 shadow-sm"
                          title="Instant 1-Click WhatsApp Escalation (0 Credits)"
                        >
                          <span>📲</span>
                          <span>1-Tap WhatsApp</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleGenerateReminder(debtor, getDebtorTone(debtor.id))}
                          disabled={isGenerating}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-wider py-2.5 px-2.5 rounded-xl transition-all border-0 flex items-center justify-center gap-1 cursor-pointer active:scale-95 shadow-sm"
                          title="Generate Custom Gemini AI Nudge"
                        >
                          {isGenerating ? (
                            <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <span>✨ AI</span>
                          )}
                        </button>
                      </div>
                      
                      <div className="flex flex-wrap gap-1.5">
                        <button 
                          type="button"
                          onClick={() => {
                            setPaymentModalDebtor(debtor);
                            setPaymentAmount(String(outstanding));
                          }}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider py-2.5 px-2 rounded-xl transition-all border-0 cursor-pointer active:scale-95"
                        >
                          Record Payment
                        </button>
                        
                        <button 
                          type="button"
                          onClick={() => {
                            const url = buildSettlementUrl(debtor);
                            navigator.clipboard?.writeText(url);
                            setCopiedLinkDebtorId(debtor.id);
                            toast.success("1-Tap Paystack settlement link copied!");
                            setTimeout(() => setCopiedLinkDebtorId(null), 2500);
                          }}
                          className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 p-2.5 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                          title="Copy 1-Tap Paystack settlement link"
                        >
                          <LinkIcon size={12} />
                          <span>{copiedLinkDebtorId === debtor.id ? 'Copied!' : 'Pay Link'}</span>
                        </button>

                        <button 
                          type="button"
                          onClick={() => setDemandNoticeDebtor(debtor)}
                          className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 p-2.5 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                          title="Generate Official Demand Notice & Statement of Account (PDF)"
                        >
                          <FileText size={12} />
                          <span>Notice</span>
                        </button>

                        <button 
                          type="button"
                          onClick={() => setExpandedDebtorId(expandedDebtorId === debtor.id ? null : debtor.id)}
                          className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 p-2.5 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Eye size={12} />
                          <span>{expandedDebtorId === debtor.id ? 'Hide' : 'Ledger'}</span>
                        </button>

                        {debtor.is_archived ? (
                          <button 
                            type="button"
                            onClick={() => handleRestore(debtor.id)}
                            className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 px-3 py-2 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                            title="Restore Debtor Record"
                          >
                            <span>↩️ Restore</span>
                          </button>
                        ) : (
                          <button 
                            type="button"
                            onClick={() => handleDelete(debtor.id)}
                            className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 p-2.5 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                            title="Archive / Void Debtor Record"
                          >
                            <Trash2 size={12} />
                            <span>Archive</span>
                          </button>
                        )}
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
                      
                      {debtor.is_archived ? (
                        <button 
                          type="button"
                          onClick={() => handleRestore(debtor.id)} 
                          className="text-emerald-600 text-[10px] font-black uppercase tracking-wider hover:bg-emerald-50 border border-transparent hover:border-emerald-200 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
                        >
                          Restore
                        </button>
                      ) : (
                        <button 
                          type="button"
                          onClick={() => handleDelete(debtor.id)} 
                          className="text-red-500 text-[10px] font-black uppercase tracking-wider hover:bg-red-50 border border-transparent hover:border-red-200 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
                        >
                          Archive
                        </button>
                      )}
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
      </>
      ) : (
        /* PAYABLES MODE: SUPPLIERS I OWE */
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <span>📦</span> Wholesale Supplier Payables (Creditors)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Track goods collected on credit from importers and wholesalers to ensure you never default on your supplier terms.
              </p>
            </div>

            <button
              onClick={() => setShowSupplierForm(true)}
              className="bg-amber-600 hover:bg-amber-500 text-white px-5 py-3 rounded-2xl text-xs font-black shadow-lg shadow-amber-600/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Log Goods on Credit
            </button>
          </div>

          {/* Supplier Analytics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-3xl p-6">
              <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Total Supplier Balance Owed</p>
              <h3 className="text-3xl font-black text-amber-950 font-heading mt-1">₦{totalSupplierDebt.toLocaleString()}</h3>
              <p className="text-[10px] text-amber-700 mt-1">{suppliers.filter(s => s.status !== 'PAID').length} pending supplier balance(s)</p>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-3xl p-6">
              <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Settled Supplier Invoices</p>
              <h3 className="text-3xl font-black text-emerald-950 font-heading mt-1">₦{totalSupplierPaid.toLocaleString()}</h3>
              <p className="text-[10px] text-emerald-700 mt-1">Fully cleared supplier debts</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-between">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Supplier Creditors</p>
              <h3 className="text-3xl font-black text-slate-800 font-heading mt-1">{suppliers.length}</h3>
              <p className="text-[10px] text-slate-400 mt-1">Wholesalers & importers logged</p>
            </div>
          </div>

          {/* Supplier Payables List */}
          {suppliers.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm">
              <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-2xl mb-4">
                📦
              </div>
              <h3 className="text-base font-bold text-slate-800">No supplier payables recorded yet</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Log merchandise, raw materials, or stock taken on credit from your distributors and suppliers.
              </p>
              <button
                onClick={() => setShowSupplierForm(true)}
                className="mt-5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
              >
                + Record Supplier Credit
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {suppliers.map((sup) => {
                const isPaid = sup.status === 'PAID';
                const isOverdue = !isPaid && sup.dueDate && new Date(sup.dueDate) < new Date();
                return (
                  <div key={sup.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:border-amber-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-slate-900">{sup.supplierName}</span>
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                          isPaid 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : isOverdue 
                            ? 'bg-rose-100 text-rose-800 animate-pulse' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {isPaid ? '✅ Settled' : isOverdue ? '🚨 Overdue' : `Due: ${sup.dueDate}`}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium">
                        📦 Items: <strong className="text-slate-800">{sup.itemsSupplied}</strong>
                      </p>
                      {sup.phone && (
                        <p className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" /> {sup.phone}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-base font-black text-slate-900">₦{sup.amount.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-400">Due: {sup.dueDate || 'No date'}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleSupplierStatus(sup.id)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                            isPaid
                              ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600 shadow-sm'
                          }`}
                        >
                          {isPaid ? 'Reopen' : 'Mark Settled'}
                        </button>

                        <button
                          onClick={() => handleSupplierWhatsApp(sup)}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 p-2 rounded-xl transition-all cursor-pointer"
                          title="Send WhatsApp Payment Update"
                        >
                          <Send className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            if (confirm('Delete this supplier record?')) {
                              const updated = suppliers.filter(s => s.id !== sup.id);
                              setSuppliers(updated);
                              localStorage.setItem('sb_supplier_payables', JSON.stringify(updated));
                            }
                          }}
                          className="text-slate-400 hover:text-rose-600 p-2 rounded-xl transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Modal to log supplier goods on credit */}
          {showSupplierForm && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
              <div className="bg-white rounded-[32px] max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">📦 Log Goods on Credit from Supplier</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Track what you owe importers and wholesalers</p>
                  </div>
                  <button 
                    onClick={() => setShowSupplierForm(false)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveSupplier} className="space-y-4">
                  <div>
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                      Supplier / Company Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newSupplier.supplierName}
                      onChange={(e) => setNewSupplier({ ...newSupplier, supplierName: e.target.value })}
                      placeholder="e.g. Alhaji Sani Wholesales, Alaba"
                      className="w-full bg-slate-50 border-0 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                        Supplier WhatsApp/Phone
                      </label>
                      <input
                        type="tel"
                        value={newSupplier.phone}
                        onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                        placeholder="08012345678"
                        className="w-full bg-slate-50 border-0 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                        Amount Owed (₦) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        required
                        value={newSupplier.amount}
                        onChange={(e) => setNewSupplier({ ...newSupplier, amount: e.target.value })}
                        placeholder="0.00"
                        className="w-full bg-slate-50 border-0 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                      Items / Merchandise Supplied on Credit *
                    </label>
                    <input
                      type="text"
                      required
                      value={newSupplier.itemsSupplied}
                      onChange={(e) => setNewSupplier({ ...newSupplier, itemsSupplied: e.target.value })}
                      placeholder="e.g. 10 Bales of Fabric, 20 Cartons of Noodles"
                      className="w-full bg-slate-50 border-0 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                        Payment Due Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={newSupplier.dueDate}
                        onChange={(e) => setNewSupplier({ ...newSupplier, dueDate: e.target.value })}
                        className="w-full bg-slate-50 border-0 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                        Invoice / Waybill Number
                      </label>
                      <input
                        type="text"
                        value={newSupplier.invoiceNumber}
                        onChange={(e) => setNewSupplier({ ...newSupplier, invoiceNumber: e.target.value })}
                        placeholder="WB-9102"
                        className="w-full bg-slate-50 border-0 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-extrabold text-xs py-4 rounded-2xl shadow-lg transition-all cursor-pointer"
                  >
                    💾 Save Supplier Credit Record
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

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
            <div className="flex justify-between items-start mb-1">
              <div>
                <h3 className="font-extrabold text-slate-800 font-heading text-sm uppercase tracking-wider flex items-center gap-1.5">
                  <span>💬</span> AI Debt Recovery Copy
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Tailored for <strong className="text-slate-700">{reminder.debtor.name}</strong> • ₦{getOutstandingBalance(reminder.debtor).toLocaleString()}
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setReminder(null)} 
                className="text-slate-400 hover:text-slate-650 text-base bg-slate-50 rounded-full w-8 h-8 flex items-center justify-center border-0 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Quick Tone Switcher inside Modal */}
            <div className="bg-slate-50 p-2 rounded-2xl flex items-center justify-between gap-2 border border-slate-100">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0 pl-1">Tone:</span>
                <select
                  className="text-[10px] font-bold bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-slate-700 outline-none cursor-pointer flex-1"
                  value={getDebtorTone(reminder.debtor.id)}
                  onChange={(e) => {
                    const newTone = e.target.value as any;
                    setSelectedTones(prev => ({ ...prev, [reminder.debtor.id]: newTone }));
                    handleGenerateReminder(reminder.debtor, newTone);
                  }}
                >
                  <option value="POLITE">😊 Polite Reminder</option>
                  <option value="FIRM">⚖️ Firm & Direct</option>
                  <option value="STRICT">🚨 Strict Warning</option>
                  <option value="NATIVE_PIDGIN">🇳🇬 Naija Pidgin</option>
                  <option value="DISCOUNT_INCENTIVE">🎁 Discount Offer</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => handleGenerateReminder(reminder.debtor, getDebtorTone(reminder.debtor.id))}
                disabled={isGenerating}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all border-0 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <RefreshCw size={11} className={isGenerating ? 'animate-spin' : ''} />
                <span>{isGenerating ? 'Drafting...' : 'Regenerate'}</span>
              </button>
            </div>

            {/* Tab buttons */}
            <div className="flex border-b border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('english')}
                className={`flex-1 py-2.5 font-black text-[10px] uppercase tracking-wider transition-all ${activeTab === 'english' ? 'border-b-2 border-indigo-600 text-indigo-650' : 'text-slate-400 hover:text-slate-600 bg-transparent border-0'}`}
              >
                🇬🇧 English Version
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('pidgin')}
                className={`flex-1 py-2.5 font-black text-[10px] uppercase tracking-wider transition-all ${activeTab === 'pidgin' ? 'border-b-2 border-indigo-600 text-indigo-650' : 'text-slate-400 hover:text-slate-600 bg-transparent border-0'}`}
              >
                🇳🇬 Naija Pidgin
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl text-xs text-slate-700 whitespace-pre-wrap italic border-l-4 border-indigo-500 max-h-52 overflow-y-auto leading-relaxed select-all">
              "{reminder.text[activeTab]}"
            </div>

            <div className="flex flex-col gap-2 pt-2">
              {reminder.debtor.phone && (
                <button
                  onClick={handleSendCloudWAReminder}
                  disabled={sendingCloudReminder}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-center py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/15 disabled:opacity-50 cursor-pointer border-0"
                >
                  <span>⚡</span> {sendingCloudReminder ? 'Sending...' : 'Auto-Send via WhatsApp API'}
                </button>
              )}

              {reminder.debtor.phone ? (
                <a
                  href={`https://wa.me/${reminder.debtor.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(reminder.text[activeTab])}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-slate-900 hover:bg-black text-white text-center py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 text-decoration-none cursor-pointer border-0"
                >
                  <span>💬</span> Open in WhatsApp App
                </a>
              ) : (
                <p className="text-[10px] text-amber-600 text-center font-bold">No phone number recorded. Copy the message below to send manually.</p>
              )}
              
              <ShareActions text={reminder.text[activeTab]} url="" title="Debt Reminder" />
            </div>
          </div>
        </div>
      )}

      {/* 1. Batch Overdue Auto-Pilot Recovery Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-lg">
                  ⚡
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Auto-Pilot Batch Recovery</h3>
                  <p className="text-xs text-slate-500">Dispatch customized recovery nudges with 1-Tap payment links to all overdue accounts.</p>
                </div>
              </div>
              <button
                onClick={() => setShowBatchModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Overdue Summary Card */}
            <div className="bg-gradient-to-r from-rose-50 to-amber-50 border border-rose-200/60 rounded-2xl p-4 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Total Capital in Default</p>
                <p className="text-2xl font-black text-rose-600">₦{totalOverdue.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Accounts Overdue</p>
                <p className="text-xl font-extrabold text-slate-800">{overdueDebtorsList.length} Defaulters</p>
              </div>
            </div>

            {/* Debtor Overdue List Preview */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {overdueDebtorsList.map((d) => {
                const bal = getOutstandingBalance(d);
                const days = d.dueDate ? Math.max(0, Math.floor((Date.now() - new Date(d.dueDate).getTime()) / 86400000)) : 0;
                return (
                  <div key={d.id} className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-extrabold text-slate-800">{d.name}</p>
                      <p className="text-[10px] text-slate-400">
                        {d.phone || 'No phone'} · <span className="text-rose-600 font-bold">{days} days overdue</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-slate-800">₦{bal.toLocaleString()}</p>
                      <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-black">
                        {getDebtorTone(d.id)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Execution Actions */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <button
                onClick={async () => {
                  const eligible = overdueDebtorsList.filter(d => d.phone);
                  if (eligible.length === 0) {
                    toast.error("No debtors have a phone number recorded.");
                    return;
                  }
                  setIsBatchSending(true);
                  let sent = 0;
                  let failed = 0;
                  setBatchProgress({ current: 0, total: eligible.length, sent: 0, failed: 0 });

                  for (let i = 0; i < eligible.length; i++) {
                    const deb = eligible[i];
                    try {
                      const msg = buildReminderCopy(deb, getDebtorTone(deb.id), 'english');
                      await marketingService.sendWhatsAppCloudMessage({
                        phone: deb.phone,
                        message: msg
                      });
                      sent++;
                      // Update nudge count
                      setDebtors(prev => prev.map(item => item.id === deb.id ? {
                        ...item,
                        remindersSentCount: (item.remindersSentCount || 0) + 1,
                        lastReminderSent: Date.now()
                      } : item));
                    } catch (e) {
                      failed++;
                    }
                    setBatchProgress({ current: i + 1, total: eligible.length, sent, failed });
                  }

                  setIsBatchSending(false);
                  toast.success(`Batch finished! Sent ${sent} recovery messages.`);
                }}
                disabled={isBatchSending}
                className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                <Zap className="w-4 h-4" />
                <span>{isBatchSending ? `Dispatching... (${batchProgress?.current}/${batchProgress?.total})` : 'Auto-Send All via WhatsApp API'}</span>
              </button>

              <p className="text-[10px] text-center text-slate-400">
                Each message includes an encrypted 1-Tap Paystack checkout link and your verified bank transfer details.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. Gbege Automation Rules & Escalation Policy Modal */}
      {showAutomationPolicy && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-lg">
                  ⚙️
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Debt Recovery Policy & Automation</h3>
                  <p className="text-xs text-slate-500">Standardized Bank of Industry & MSME progressive debt collection workflow.</p>
                </div>
              </div>
              <button
                onClick={() => setShowAutomationPolicy(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* 4-Stage Progressive Timeline */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400">Automated Escalation Schedule</h4>
              <div className="space-y-2 text-xs">
                <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-3 flex gap-3 items-center">
                  <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center shrink-0">1</span>
                  <div>
                    <p className="font-extrabold text-slate-800">T-3 Days: Courtesy Pre-Due Date Nudge</p>
                    <p className="text-[10px] text-slate-500">Polite reminder sent 3 days before credit maturity with statement breakdown.</p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-3 flex gap-3 items-center">
                  <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-black text-xs flex items-center justify-center shrink-0">2</span>
                  <div>
                    <p className="font-extrabold text-slate-800">Due Date (Day 0): Settlement Request + 1-Tap Pay Link</p>
                    <p className="text-[10px] text-slate-500">Friendly prompt attaching instant online Paystack checkout & bank details.</p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-3 flex gap-3 items-center">
                  <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center shrink-0">3</span>
                  <div>
                    <p className="font-extrabold text-slate-800">T+3 Days Overdue: Firm Account Warning</p>
                    <p className="text-[10px] text-slate-500">Professional follow-up citing pending credit ledger status.</p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-3 flex gap-3 items-center">
                  <span className="w-8 h-8 rounded-xl bg-rose-100 text-rose-800 font-black text-xs flex items-center justify-center shrink-0">4</span>
                  <div>
                    <p className="font-extrabold text-slate-800">T+7 Days Overdue: Strict Final Notice / 5% Early Waiver Offer</p>
                    <p className="text-[10px] text-slate-500">Automatic suspension of trade credit & formal legal demand notice generation.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Collection Bank Account */}
            <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-4 text-xs space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Configured Settlement Bank Account</p>
              <p className="font-extrabold text-slate-800">
                {getMerchantDetails().bankName} · {getMerchantDetails().bankAccount || 'Not configured in Settings'}
              </p>
              <p className="text-[11px] text-slate-500">Name: {getMerchantDetails().bankAccountName || getMerchantDetails().merchantName}</p>
            </div>

            <button
              onClick={() => setShowAutomationPolicy(false)}
              className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              Close & Apply Policy
            </button>
          </div>
        </div>
      )}

      {/* 3. Formal Legal Demand Notice & Statement of Account Modal */}
      {demandNoticeDebtor && (() => {
        const totalPaid = (demandNoticeDebtor.payments || []).reduce((a, p) => a + p.amount, 0);
        const outstandingBal = getOutstandingBalance(demandNoticeDebtor);
        const isOverdueNow = demandNoticeDebtor.dueDate && new Date(demandNoticeDebtor.dueDate) < new Date();
        const shortCleanUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://smartbizcoach.com.ng'}/pay-debt/${demandNoticeDebtor.id}`;
        const fullPaystackUrl = buildSettlementUrl(demandNoticeDebtor);

        return (
          <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            {/* Dedicated Print Styles for Single Page A4 output */}
            <style>{`
              @media print {
                body * { visibility: hidden !important; }
                #demand-notice-printable, #demand-notice-printable * { visibility: visible !important; }
                #demand-notice-printable {
                  position: fixed !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  margin: 0 !important;
                  padding: 12mm 15mm !important;
                  background: white !important;
                  z-index: 999999 !important;
                  box-shadow: none !important;
                  border: none !important;
                }
                .no-print { display: none !important; }
                @page { size: A4 portrait; margin: 8mm; }
              }
            `}</style>

            <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-8 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto overflow-x-hidden">
              {/* Action Bar */}
              <div className="flex justify-between items-center border-b border-slate-200 pb-3 no-print">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700">Official Demand Notice & Statement</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
                  >
                    <Printer size={13} /> Print / Save PDF
                  </button>
                  <button
                    onClick={() => setDemandNoticeDebtor(null)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Printable Letterhead Document */}
              <div id="demand-notice-printable" className="space-y-5 text-slate-800 font-sans p-1 sm:p-2 bg-white">
                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
                  <div>
                    <h2 className="text-xl font-black text-slate-950 uppercase tracking-tight">{getMerchantDetails().merchantName}</h2>
                    <p className="text-xs text-slate-600 font-medium">Commercial Trade Credit & Accounts Receivable</p>
                    <p className="text-[11px] text-slate-500">Official Partner · Bank of Industry MSME Credit Framework</p>
                  </div>
                  <div className="text-right text-xs space-y-0.5">
                    <p className="font-mono font-bold text-slate-800">REF: SB-DEMAND-{Date.now().toString().slice(-6)}</p>
                    <p className="text-slate-500">Date: {new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>

                {/* Recipient */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Notice Served To:</p>
                  <p className="font-extrabold text-sm text-slate-900">{demandNoticeDebtor.name}</p>
                  <p className="text-slate-600">Phone: {demandNoticeDebtor.phone || 'N/A'}</p>
                  {demandNoticeDebtor.dueDate && (
                    <p className={`font-bold ${isOverdueNow ? 'text-rose-600' : 'text-slate-700'}`}>
                      Credit Maturity Date: {demandNoticeDebtor.dueDate} {isOverdueNow ? '(OVERDUE)' : '(ACTIVE)'}
                    </p>
                  )}
                </div>

                {/* Notice Title */}
                <div className="text-center py-0.5">
                  <h3 className={`text-xs sm:text-sm font-black uppercase tracking-wider underline underline-offset-4 ${isOverdueNow ? 'text-rose-700' : 'text-slate-900'}`}>
                    {isOverdueNow 
                      ? 'FORMAL NOTICE OF OVERDUE TRADE DEBT & DEMAND FOR IMMEDIATE SETTLEMENT' 
                      : 'OFFICIAL STATEMENT OF ACCOUNT & TRADE CREDIT SETTLEMENT NOTICE'}
                  </h3>
                </div>

                {/* Statement Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-black uppercase text-[10px]">
                      <tr>
                        <th className="p-3 text-left">Description of Goods / Services</th>
                        <th className="p-3 text-right">Credit Value</th>
                        <th className="p-3 text-right">Paid to Date</th>
                        <th className="p-3 text-right">Net Balance Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="p-3 font-medium text-slate-800">{demandNoticeDebtor.itemsBought}</td>
                        <td className="p-3 text-right font-mono font-semibold">₦{demandNoticeDebtor.amount.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono text-emerald-600 font-semibold">
                          {totalPaid > 0 ? `-₦${totalPaid.toLocaleString()}` : '₦0'}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-rose-600 text-sm">
                          ₦{outstandingBal.toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Legal Demand Clause */}
                <div className="text-xs text-slate-600 leading-relaxed bg-slate-50/80 p-4 rounded-2xl border border-slate-200 space-y-1.5">
                  <p>
                    <strong>Notice is hereby given</strong> that the net balance of <strong>₦{outstandingBal.toLocaleString()}</strong> is{' '}
                    {isOverdueNow ? 'overdue and remains unsettled' : 'currently outstanding and due for settlement'}{' '}
                    in our official accounts receivable registry.
                  </p>
                  <p>
                    In accordance with commercial trade credit practices and Bank of Industry MSME credit compliance frameworks, kindly arrange for full liquidation of this balance{' '}
                    {isOverdueNow ? 'within seven (7) business days from the date of this notice' : `on or before ${demandNoticeDebtor.dueDate || 'the stipulated due date'}`}. Continued default may lead to suspension of trade credit privileges and formal credit ledger reporting.
                  </p>
                </div>

                {/* Settlement Instructions */}
                <div className="bg-emerald-50/80 rounded-2xl p-4 border border-emerald-200 text-xs space-y-2">
                  <p className="font-black text-emerald-950 uppercase text-[10px] tracking-wider">Authorized Settlement Channels:</p>
                  <div className="text-emerald-900 space-y-1">
                    <p className="break-words">
                      • <strong>Online 1-Tap Portal (Paystack):</strong>{' '}
                      <a
                        href={fullPaystackUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-700 underline font-extrabold hover:text-emerald-900 break-all"
                      >
                        Click to pay online via Card/USSD/Transfer
                      </a>
                    </p>
                    <p className="text-[11px] font-mono text-emerald-700 pl-3 break-all">
                      {shortCleanUrl}
                    </p>
                    <p className="pt-1">
                      • <strong>Direct Bank Transfer:</strong> {getMerchantDetails().bankName} · Acc No: <strong>{getMerchantDetails().bankAccount || 'Contact Store'}</strong> ({getMerchantDetails().bankAccountName || getMerchantDetails().merchantName})
                    </p>
                  </div>
                </div>

                {/* Signature Line */}
                <div className="pt-4 flex justify-between items-end border-t border-slate-200 text-xs">
                  <div>
                    <div className="w-36 border-b border-slate-800 mb-1" />
                    <p className="font-extrabold text-slate-900">Authorized Signature & Stamp</p>
                    <p className="text-[10px] text-slate-500">{getMerchantDetails().merchantName}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-1 rounded font-black">
                      OFFICIAL TRADE DOSSIER
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Credit Prompt Modal */}
      <CreditPromptModal
        isOpen={showCreditPrompt}
        featureLabel="AI Debtor Gbege WhatsApp Recovery"
        creditCost={25}
        currentCredits={credits}
        onConfirm={deductOnConfirm || (() => {})}
        onClose={() => setShowCreditPrompt(false)}
        onCreditsUpdated={onUpdateCredits}
      />

    </div>
  );
};

export default DebtorBook;