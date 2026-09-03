import React, { useState, useEffect, useRef } from 'react';
import { 
  DollarSign, Plus, Trash2, Calendar, CheckCircle, 
  ArrowUpRight, ArrowDownRight, Clock, AlertTriangle, 
  Send, Share2, Download, Printer, RefreshCw, ShoppingCart, 
  FileText, ShieldCheck, Sparkles, Filter, X
} from 'lucide-react';
import { DailySale, DailyExpense, DailySummary, Product } from '../types';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const EXPENSE_CATEGORY_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  FUEL_GEN: { label: 'Fuel & Generator', icon: '⛽', color: 'bg-amber-100 text-amber-800' },
  LOGISTICS: { label: 'Logistics & Dispatch', icon: '🚚', color: 'bg-blue-100 text-blue-800' },
  RENT_BILLS: { label: 'Shop Rent, NEPA & Bills', icon: '💡', color: 'bg-purple-100 text-purple-800' },
  PACKAGING: { label: 'Packaging & Materials', icon: '📦', color: 'bg-emerald-100 text-emerald-800' },
  PERSONAL: { label: 'Personal / Oga Drawing', icon: '👤', color: 'bg-rose-100 text-rose-800' },
  STAFF: { label: 'Staff & Apprentice Pay', icon: '👥', color: 'bg-indigo-100 text-indigo-800' },
  OTHER: { label: 'Other Operating Cost', icon: '⚙️', color: 'bg-slate-100 text-slate-800' },
};

export const DailyCashbook: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [activeTab, setActiveTab] = useState<'SALES' | 'EXPENSES' | 'REPORT'>('SALES');
  const [sales, setSales] = useState<DailySale[]>([]);
  const [expenses, setExpenses] = useState<DailyExpense[]>([]);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Products from inventory for quick selection
  const [inventoryProducts, setInventoryProducts] = useState<Product[]>([]);

  // Modals
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [recentSaleReceipt, setRecentSaleReceipt] = useState<DailySale | null>(null);

  // Sale form state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [saleItemName, setSaleItemName] = useState('');
  const [saleQuantity, setSaleQuantity] = useState(1);
  const [saleUnitPrice, setSaleUnitPrice] = useState('');
  const [saleCostPrice, setSaleCostPrice] = useState('');
  const [salePaymentMethod, setSalePaymentMethod] = useState<'CASH' | 'TRANSFER' | 'CREDIT'>('CASH');
  const [saleCustomerName, setSaleCustomerName] = useState('');
  const [saleCustomerPhone, setSaleCustomerPhone] = useState('');
  const [saleDueDate, setSaleDueDate] = useState('');
  const [saleNotes, setSaleNotes] = useState('');

  // Expense form state
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<'FUEL_GEN' | 'LOGISTICS' | 'RENT_BILLS' | 'PACKAGING' | 'PERSONAL' | 'STAFF' | 'OTHER'>('FUEL_GEN');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expensePaymentMethod, setExpensePaymentMethod] = useState<'CASH' | 'TRANSFER'>('CASH');
  const [expenseNotes, setExpenseNotes] = useState('');

  const reportRef = useRef<HTMLDivElement>(null);

  // Fetch Inventory Products for autocomplete
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const res = await api.get('/api/marketplace/products/');
        if (res.data) {
          const list = Array.isArray(res.data) ? res.data : (res.data.results || []);
          setInventoryProducts(list);
        }
      } catch (err) {
        console.error('Failed to fetch inventory:', err);
      }
    };
    fetchInventory();
  }, []);

  // Fetch Daily Records
  const fetchDailyData = async () => {
    setIsLoading(true);
    try {
      const [salesRes, expensesRes, summaryRes] = await Promise.allSettled([
        api.get(`/api/marketplace/daily-sales/?date=${selectedDate}`),
        api.get(`/api/marketplace/daily-expenses/?date=${selectedDate}`),
        api.get(`/api/marketplace/daily-summary/?date=${selectedDate}`)
      ]);

      if (salesRes.status === 'fulfilled' && salesRes.value.data) {
        const list = Array.isArray(salesRes.value.data) ? salesRes.value.data : (salesRes.value.data.results || []);
        setSales(list);
      }

      if (expensesRes.status === 'fulfilled' && expensesRes.value.data) {
        const list = Array.isArray(expensesRes.value.data) ? expensesRes.value.data : (expensesRes.value.data.results || []);
        setExpenses(list);
      }

      if (summaryRes.status === 'fulfilled' && summaryRes.value.data) {
        setSummary(summaryRes.value.data);
      }
    } catch (err) {
      console.error('Error loading daily cashbook:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyData();
  }, [selectedDate]);

  // Handle Product Selection in Sale Modal
  const handleProductSelect = (productId: string) => {
    if (!productId) {
      setSelectedProduct(null);
      setSaleItemName('');
      setSaleUnitPrice('');
      setSaleCostPrice('');
      return;
    }
    const found = inventoryProducts.find(p => String(p.id) === productId);
    if (found) {
      setSelectedProduct(found);
      setSaleItemName(found.name);
      setSaleUnitPrice(String(found.price || 0));
      setSaleCostPrice(String((found as any).cost_price || 0));
    }
  };

  // Submit Sale
  const handleSaveSale = async (e: React.FormEvent) => {
    e.preventDefault();
    const unitPriceNum = parseFloat(saleUnitPrice) || 0;
    const qtyNum = parseInt(String(saleQuantity), 10) || 1;
    const totalAmount = unitPriceNum * qtyNum;

    if (!saleItemName || totalAmount <= 0) {
      toast.error('Please enter a valid item name and price.');
      return;
    }

    const payload = {
      product: selectedProduct ? selectedProduct.id : null,
      item_name: saleItemName,
      quantity: qtyNum,
      unit_price: unitPriceNum.toFixed(2),
      cost_price: (parseFloat(saleCostPrice) || 0).toFixed(2),
      total_amount: totalAmount.toFixed(2),
      payment_method: salePaymentMethod,
      customer_name: saleCustomerName,
      customer_phone: saleCustomerPhone,
      is_debt: salePaymentMethod === 'CREDIT',
      debt_due_date: salePaymentMethod === 'CREDIT' ? (saleDueDate || null) : null,
      notes: saleNotes
    };

    const toastId = toast.loading('Recording sale...');
    try {
      const res = await api.post('/api/marketplace/daily-sales/', payload);
      const savedSale: DailySale = res.data || { ...payload, id: Date.now() };

      setSales(prev => [savedSale, ...prev]);

      // If Credit, auto-sync to Gbege Book (DebtorBook in localStorage)
      if (salePaymentMethod === 'CREDIT') {
        try {
          const existingDebtors = JSON.parse(localStorage.getItem('sb_debtors') || '[]');
          const newDebtor = {
            id: `deb-${Date.now()}`,
            name: saleCustomerName || 'Walk-in Customer',
            phone: saleCustomerPhone || '',
            amount: totalAmount,
            paidAmount: 0,
            itemsBought: `${saleItemName} (Qty: ${qtyNum})`,
            dueDate: saleDueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
            status: 'UNPAID',
            date: selectedDate,
            createdAt: new Date().toISOString()
          };
          localStorage.setItem('sb_debtors', JSON.stringify([newDebtor, ...existingDebtors]));
          window.dispatchEvent(new Event('smartbiz_debtors_updated'));
          toast.success('Debt also synced to your Gbege Book! 📒');
        } catch (storageErr) {
          console.error('Failed to sync to Gbege Book:', storageErr);
        }
      }

      // Decrement local inventory state if product linked
      if (selectedProduct) {
        setInventoryProducts(prev => prev.map(p => {
          if (p.id === selectedProduct.id) {
            return { ...p, stock_count: Math.max(0, (p.stock_count || 0) - qtyNum) };
          }
          return p;
        }));
      }

      toast.success('Sale recorded successfully!', { id: toastId });
      setRecentSaleReceipt(savedSale);
      setShowSaleModal(false);

      // Reset form
      setSelectedProduct(null);
      setSaleItemName('');
      setSaleUnitPrice('');
      setSaleCostPrice('');
      setSaleQuantity(1);
      setSalePaymentMethod('CASH');
      setSaleCustomerName('');
      setSaleCustomerPhone('');
      setSaleDueDate('');
      setSaleNotes('');

      fetchDailyData();
    } catch (err: any) {
      console.error('Error recording sale:', err);
      toast.error(err.response?.data?.error || 'Failed to record sale. Check connection.', { id: toastId });
    }
  };

  // Submit Expense
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(expenseAmount) || 0;
    if (!expenseTitle || amountNum <= 0) {
      toast.error('Please enter expense description and amount.');
      return;
    }

    const payload = {
      title: expenseTitle,
      category: expenseCategory,
      amount: amountNum.toFixed(2),
      payment_method: expensePaymentMethod,
      notes: expenseNotes
    };

    const toastId = toast.loading('Logging petty cash expense...');
    try {
      const res = await api.post('/api/marketplace/daily-expenses/', payload);
      const savedExpense: DailyExpense = res.data || { ...payload, id: Date.now() };

      setExpenses(prev => [savedExpense, ...prev]);
      toast.success('Petty cash expense recorded!', { id: toastId });
      setShowExpenseModal(false);

      // Reset form
      setExpenseTitle('');
      setExpenseAmount('');
      setExpenseCategory('FUEL_GEN');
      setExpensePaymentMethod('CASH');
      setExpenseNotes('');

      fetchDailyData();
    } catch (err: any) {
      console.error('Error logging expense:', err);
      toast.error(err.response?.data?.error || 'Failed to log expense.', { id: toastId });
    }
  };

  // Calculated aggregates
  const totalRevenue = sales.reduce((acc, s) => acc + (parseFloat(String(s.total_amount)) || 0), 0);
  const cashSales = sales.filter(s => s.payment_method === 'CASH').reduce((acc, s) => acc + (parseFloat(String(s.total_amount)) || 0), 0);
  const transferSales = sales.filter(s => s.payment_method === 'TRANSFER').reduce((acc, s) => acc + (parseFloat(String(s.total_amount)) || 0), 0);
  const creditSales = sales.filter(s => s.payment_method === 'CREDIT').reduce((acc, s) => acc + (parseFloat(String(s.total_amount)) || 0), 0);

  const totalExpenses = expenses.reduce((acc, e) => acc + (parseFloat(String(e.amount)) || 0), 0);
  const cashExpenses = expenses.filter(e => e.payment_method === 'CASH').reduce((acc, e) => acc + (parseFloat(String(e.amount)) || 0), 0);
  const transferExpenses = expenses.filter(e => e.payment_method === 'TRANSFER').reduce((acc, e) => acc + (parseFloat(String(e.amount)) || 0), 0);

  const netCashInTill = cashSales - cashExpenses;

  // COGS & Profit
  const cogs = sales.reduce((acc, s) => acc + ((parseFloat(String(s.cost_price)) || 0) * (s.quantity || 1)), 0);
  const grossProfit = Math.max(0, totalRevenue - cogs);
  const netProfit = grossProfit - totalExpenses;

  // Format Nigerian Currency
  const formatNgn = (amt: number) => {
    return '₦' + Number(amt || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Generate WhatsApp Daily Report
  const handleShareReportWhatsApp = () => {
    const dateFormatted = new Date(selectedDate).toLocaleDateString('en-NG', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    const lowStockText = summary?.low_stock_products?.length 
      ? `\n⚠️ *Low Stock Alert (${summary.low_stock_products.length} items):*\n` + summary.low_stock_products.map(p => `• ${p.name} (Only ${p.stock_count} left)`).join('\n')
      : '';

    const text = `📊 *SmartBiz Coach • End-of-Day Report*\n` +
      `📅 *Date:* ${dateFormatted}\n\n` +
      `💰 *Total Sales Revenue:* ${formatNgn(totalRevenue)} (${sales.length} transactions)\n` +
      `  • 💵 Cash in Till: ${formatNgn(cashSales)}\n` +
      `  • 🏦 Bank Transfers / POS: ${formatNgn(transferSales)}\n` +
      `  • 📒 Credit / Unpaid Given: ${formatNgn(creditSales)}\n\n` +
      `💸 *Total Petty Cash / Expenses:* ${formatNgn(totalExpenses)} (${expenses.length} logs)\n` +
      `  • Paid from Cash: ${formatNgn(cashExpenses)}\n` +
      `  • Paid via Transfer: ${formatNgn(transferExpenses)}\n\n` +
      `📦 *Estimated Gross Margin:* ${formatNgn(grossProfit)}\n` +
      `📈 *Net Cashflow (Cash in Till):* ${formatNgn(netCashInTill)}\n` +
      `🎯 *Net Estimated Profit:* ${formatNgn(netProfit)}\n` +
      lowStockText +
      `\n\n_Generated securely via SmartBiz Coach OS 🚀_`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Generate WhatsApp Receipt for a single sale
  const handleShareSaleReceipt = (sale: DailySale) => {
    const text = `🧾 *SALES RECEIPT*\n` +
      `Item: *${sale.item_name}*\n` +
      `Quantity: *${sale.quantity}*\n` +
      `Unit Price: *${formatNgn(parseFloat(String(sale.unit_price)))}*\n` +
      `Total Paid: *${formatNgn(parseFloat(String(sale.total_amount)))}*\n` +
      `Payment Method: *${sale.payment_method === 'CASH' ? 'Cash' : sale.payment_method === 'TRANSFER' ? 'Bank Transfer' : 'Credit / On-Account'}*\n` +
      (sale.customer_name ? `Customer: ${sale.customer_name}\n` : '') +
      `Date: ${new Date(sale.created_at || Date.now()).toLocaleDateString()}\n\n` +
      `_Thank you for your patronage! 🙏_`;

    const phoneClean = sale.customer_phone ? sale.customer_phone.replace(/\D/g, '') : '';
    const url = phoneClean 
      ? `https://wa.me/${phoneClean.startsWith('0') ? '234' + phoneClean.slice(1) : phoneClean}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(url, '_blank');
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 rounded-[32px] p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-emerald-850/50">
        <div className="absolute right-0 top-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-450/40 px-3 py-1 rounded-full text-[11px] font-bold text-emerald-300 tracking-wide uppercase mb-3">
              <span>⚡</span> MSME Digital Ledger & Cashbook
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-heading tracking-tight text-white">
              Daily Day-Book & Cash Register
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
              Record 5-second sales, track generator fuel and petty cash, protect your till, and send automated End-of-Day reports to WhatsApp.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Date Picker */}
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 px-3 py-2 rounded-2xl text-xs">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-white border-0 text-xs font-bold focus:outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={() => setShowSaleModal(true)}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-xs px-4 py-3 rounded-2xl shadow-lg shadow-emerald-500/25 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Record Sale / Service
            </button>

            <button
              onClick={() => setShowExpenseModal(true)}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-extrabold text-xs px-4 py-3 rounded-2xl shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <ArrowDownRight className="w-4 h-4" /> Petty Cash / Expense
            </button>
          </div>
        </div>
      </div>

      {/* KPI Financial Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Inflow */}
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Sales Inflow</p>
          <p className="text-lg sm:text-xl font-black text-slate-900 mt-1">{formatNgn(totalRevenue)}</p>
          <p className="text-[11px] font-bold text-emerald-600 mt-0.5">{sales.length} sale{sales.length === 1 ? '' : 's'}</p>
        </div>

        {/* Cash in Till */}
        <div className="bg-white p-4 rounded-3xl border border-emerald-100 shadow-sm bg-gradient-to-b from-white to-emerald-50/30">
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-650">💵 Cash in Hand (Till)</p>
          <p className="text-lg sm:text-xl font-black text-emerald-700 mt-1">{formatNgn(netCashInTill)}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Cash In: {formatNgn(cashSales)}</p>
        </div>

        {/* Bank Transfers */}
        <div className="bg-white p-4 rounded-3xl border border-blue-100 shadow-sm bg-gradient-to-b from-white to-blue-50/30">
          <p className="text-[10px] font-black uppercase tracking-wider text-blue-650">🏦 Bank Transfers / POS</p>
          <p className="text-lg sm:text-xl font-black text-blue-700 mt-1">{formatNgn(transferSales)}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Confirmed bank credit</p>
        </div>

        {/* Petty Cash Out */}
        <div className="bg-white p-4 rounded-3xl border border-amber-100 shadow-sm bg-gradient-to-b from-white to-amber-50/30">
          <p className="text-[10px] font-black uppercase tracking-wider text-amber-650">📉 Petty Cash Spent</p>
          <p className="text-lg sm:text-xl font-black text-amber-700 mt-1">{formatNgn(totalExpenses)}</p>
          <p className="text-[11px] font-bold text-amber-600 mt-0.5">{expenses.length} expense{expenses.length === 1 ? '' : 's'}</p>
        </div>

        {/* Credit Given Out */}
        <div className="bg-white p-4 rounded-3xl border border-rose-100 shadow-sm bg-gradient-to-b from-white to-rose-50/30">
          <p className="text-[10px] font-black uppercase tracking-wider text-rose-650">📒 Credit (Gbege Debt)</p>
          <p className="text-lg sm:text-xl font-black text-rose-700 mt-1">{formatNgn(creditSales)}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Synced to Gbege Book</p>
        </div>

        {/* Estimated Profit */}
        <div className="bg-white p-4 rounded-3xl border border-purple-100 shadow-sm bg-gradient-to-b from-white to-purple-50/30">
          <p className="text-[10px] font-black uppercase tracking-wider text-purple-650">🎯 Est. Net Profit</p>
          <p className={`text-lg sm:text-xl font-black mt-1 ${netProfit >= 0 ? 'text-purple-700' : 'text-red-600'}`}>
            {formatNgn(netProfit)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Margin: {formatNgn(grossProfit)}</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('SALES')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'SALES'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            🛒 Sales & Services ({sales.length})
          </button>

          <button
            onClick={() => setActiveTab('EXPENSES')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'EXPENSES'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            💸 Petty Cash & Expenses ({expenses.length})
          </button>

          <button
            onClick={() => setActiveTab('REPORT')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'REPORT'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            🌙 End-of-Day Report & Reconciliation
          </button>
        </div>

        {activeTab === 'REPORT' && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleShareReportWhatsApp}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <span>📲</span> Send to WhatsApp
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: SALES LIST */}
      {activeTab === 'SALES' && (
        <div className="space-y-4">
          {sales.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-2xl mb-4">
                🛒
              </div>
              <h3 className="text-base font-bold text-slate-800">No sales recorded for this date yet</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Tap the green button to record your first sale or service. It takes only 5 seconds!
              </p>
              <button
                onClick={() => setShowSaleModal(true)}
                className="mt-5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
              >
                + Record Quick Sale
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="divide-y divide-slate-100">
                {sales.map((sale) => (
                  <div key={sale.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50/60 transition-all">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black ${
                        sale.payment_method === 'CASH' 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : sale.payment_method === 'TRANSFER'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}>
                        {sale.payment_method === 'CASH' ? '💵' : sale.payment_method === 'TRANSFER' ? '🏦' : '📒'}
                      </div>
                      <div>
                        <p className="text-sm font-extrabold text-slate-900">{sale.item_name}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-400">
                          <span>Qty: <strong className="text-slate-700">{sale.quantity}</strong></span>
                          <span>•</span>
                          <span>Unit: {formatNgn(parseFloat(String(sale.unit_price)))}</span>
                          {sale.customer_name && (
                            <>
                              <span>•</span>
                              <span className="text-slate-600 font-semibold">{sale.customer_name}</span>
                            </>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            sale.payment_method === 'CASH'
                              ? 'bg-emerald-50 text-emerald-700'
                              : sale.payment_method === 'TRANSFER'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}>
                            {sale.payment_method === 'CASH' ? 'Cash in Till' : sale.payment_method === 'TRANSFER' ? 'Bank Transfer' : 'Credit / Debt'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900">{formatNgn(parseFloat(String(sale.total_amount)))}</p>
                        <p className="text-[10px] text-slate-400">
                          {sale.created_at ? new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </p>
                      </div>

                      <button
                        onClick={() => handleShareSaleReceipt(sale)}
                        className="bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 p-2 rounded-xl transition-all cursor-pointer"
                        title="Share WhatsApp Receipt"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: EXPENSES / PETTY CASH */}
      {activeTab === 'EXPENSES' && (
        <div className="space-y-4">
          {expenses.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm">
              <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-2xl mb-4">
                ⛽
              </div>
              <h3 className="text-base font-bold text-slate-800">No petty cash or expenses logged today</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Log generator fuel, dispatch rider fees, packaging, and personal drawings so you know your real profit.
              </p>
              <button
                onClick={() => setShowExpenseModal(true)}
                className="mt-5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
              >
                + Record Petty Cash Expense
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="divide-y divide-slate-100">
                {expenses.map((expense) => {
                  const catMeta = EXPENSE_CATEGORY_LABELS[expense.category] || EXPENSE_CATEGORY_LABELS.OTHER;
                  return (
                    <div key={expense.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50/60 transition-all">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center text-base">
                          {catMeta.icon}
                        </div>
                        <div>
                          <p className="text-sm font-extrabold text-slate-900">{expense.title}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-400">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${catMeta.color}`}>
                              {catMeta.label}
                            </span>
                            <span>•</span>
                            <span className="text-slate-600 font-semibold">
                              Paid via {expense.payment_method === 'CASH' ? 'Cash from Till' : 'Bank Transfer'}
                            </span>
                            {expense.notes && (
                              <>
                                <span>•</span>
                                <span className="text-slate-500 italic">{expense.notes}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-black text-rose-600">-{formatNgn(parseFloat(String(expense.amount)))}</p>
                        <p className="text-[10px] text-slate-400">
                          {expense.created_at ? new Date(expense.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: END-OF-DAY RECONCILIATION REPORT */}
      {activeTab === 'REPORT' && (
        <div ref={reportRef} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-8">
          <div className="border-b border-slate-100 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🌙</span>
                <h2 className="text-xl font-black text-slate-900 font-heading">
                  End-of-Day Business Reconciliation
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Official closing audit for {new Date(selectedDate).toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-2xl">
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-800">Verified Till Status</p>
              <p className="text-base font-black text-emerald-700">{formatNgn(netCashInTill)} in Hand</p>
            </div>
          </div>

          {/* Core Balance Breakdown Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* INFLOWS */}
            <div className="bg-slate-50/70 p-6 rounded-3xl border border-slate-100 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2">
                <span>📈</span> Total Inflows & Collections
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">💵 Cash Sales in Till</span>
                  <strong className="text-slate-900 font-extrabold">{formatNgn(cashSales)}</strong>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">🏦 Bank Transfers / POS</span>
                  <strong className="text-slate-900 font-extrabold">{formatNgn(transferSales)}</strong>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">📒 Credit Given Out (Debtors)</span>
                  <strong className="text-rose-600 font-extrabold">{formatNgn(creditSales)}</strong>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm">
                  <span className="font-extrabold text-slate-800">Gross Sales Revenue</span>
                  <span className="font-black text-emerald-600 text-base">{formatNgn(totalRevenue)}</span>
                </div>
              </div>
            </div>

            {/* OUTFLOWS & EXPENSES */}
            <div className="bg-slate-50/70 p-6 rounded-3xl border border-slate-100 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-amber-600 flex items-center gap-2">
                <span>📉</span> Total Outflows & Petty Cash
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">💸 Cash Deducted from Till</span>
                  <strong className="text-slate-900 font-extrabold">{formatNgn(cashExpenses)}</strong>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">🏦 Transfer Expenses Paid</span>
                  <strong className="text-slate-900 font-extrabold">{formatNgn(transferExpenses)}</strong>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">📦 Cost of Goods Sold (COGS)</span>
                  <strong className="text-slate-700 font-extrabold">{formatNgn(cogs)}</strong>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm">
                  <span className="font-extrabold text-slate-800">Total Operational Expenses</span>
                  <span className="font-black text-amber-600 text-base">{formatNgn(totalExpenses)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* NET BUSINESS HEALTH SUMMARY BANNER */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-indigo-400">Net Estimated Profit After All Expenses</p>
              <p className={`text-2xl sm:text-3xl font-black mt-1 ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatNgn(netProfit)}
              </p>
              <p className="text-xs text-slate-300 mt-1">
                Gross Margin: {formatNgn(grossProfit)} • Expenses: {formatNgn(totalExpenses)}
              </p>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-[11px] font-black uppercase tracking-widest text-indigo-400">Expected Physical Cash in Till</p>
              <p className="text-2xl font-black text-white mt-1">{formatNgn(netCashInTill)}</p>
              <p className="text-xs text-slate-300 mt-1">Reconcile this with your physical cash drawer</p>
            </div>
          </div>

          {/* LOW STOCK ALERT (Restock for tomorrow) */}
          {summary?.low_stock_products && summary.low_stock_products.length > 0 && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-900">
                  Market Reorder Reminder: {summary.low_stock_products.length} Items Low on Stock
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {summary.low_stock_products.map((p) => (
                  <div key={p.id} className="bg-white p-3.5 rounded-2xl border border-amber-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{p.name}</p>
                      <p className="text-[10px] text-slate-400">Threshold: {p.low_stock_threshold} units</p>
                    </div>
                    <span className="bg-rose-100 text-rose-700 text-xs font-black px-2.5 py-1 rounded-xl">
                      {p.stock_count} left
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: RECORD SALE */}
      {showSaleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-[32px] max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-black text-slate-900">⚡ 5-Second Quick Sale</h3>
                <p className="text-xs text-slate-400 mt-0.5">Record customer purchase & update inventory</p>
              </div>
              <button 
                onClick={() => setShowSaleModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSale} className="space-y-4">
              {/* Select from Inventory (Optional) */}
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Pick from Catalog or Type Custom Item
                </label>
                <select
                  value={selectedProduct ? String(selectedProduct.id) : ''}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className="w-full bg-slate-50 border-0 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="">-- Custom Item / Walk-in Service --</option>
                  {inventoryProducts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stock: {p.stock_count || 0} | ₦{Number(p.price).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Item Name */}
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Item or Service Name *
                </label>
                <input
                  type="text"
                  required
                  value={saleItemName}
                  onChange={(e) => setSaleItemName(e.target.value)}
                  placeholder="e.g. Ankara Fabric 6 Yards or Haircut"
                  className="w-full bg-slate-50 border-0 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Quantity and Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={saleQuantity}
                    onChange={(e) => setSaleQuantity(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-slate-50 border-0 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                    Unit Price (₦) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={saleUnitPrice}
                    onChange={(e) => setSaleUnitPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-50 border-0 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Total Calculation Display */}
              <div className="bg-emerald-50 p-4 rounded-2xl flex justify-between items-center border border-emerald-100">
                <span className="text-xs font-bold text-emerald-800">Total Sale Amount:</span>
                <span className="text-base font-black text-emerald-700">
                  {formatNgn((parseFloat(saleUnitPrice) || 0) * (saleQuantity || 1))}
                </span>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                  Payment Method *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSalePaymentMethod('CASH')}
                    className={`py-3 rounded-2xl text-xs font-extrabold flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                      salePaymentMethod === 'CASH'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>💵</span> Cash in Till
                  </button>

                  <button
                    type="button"
                    onClick={() => setSalePaymentMethod('TRANSFER')}
                    className={`py-3 rounded-2xl text-xs font-extrabold flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                      salePaymentMethod === 'TRANSFER'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>🏦</span> Transfer / POS
                  </button>

                  <button
                    type="button"
                    onClick={() => setSalePaymentMethod('CREDIT')}
                    className={`py-3 rounded-2xl text-xs font-extrabold flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                      salePaymentMethod === 'CREDIT'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>📒</span> Debt (Owe Me)
                  </button>
                </div>
              </div>

              {/* If Credit, ask for Customer Info & Due Date */}
              {salePaymentMethod === 'CREDIT' && (
                <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200 space-y-3 animate-fade-in">
                  <p className="text-xs font-black text-rose-800 flex items-center gap-1">
                    <span>📒</span> Auto-Sync to Gbege Book (Debtors)
                  </p>
                  <div>
                    <input
                      type="text"
                      required
                      value={saleCustomerName}
                      onChange={(e) => setSaleCustomerName(e.target.value)}
                      placeholder="Customer Name (e.g. Alhaji Musa)"
                      className="w-full bg-white border border-rose-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="tel"
                      value={saleCustomerPhone}
                      onChange={(e) => setSaleCustomerPhone(e.target.value)}
                      placeholder="Phone / WhatsApp"
                      className="w-full bg-white border border-rose-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                    />
                    <input
                      type="date"
                      required
                      value={saleDueDate}
                      onChange={(e) => setSaleDueDate(e.target.value)}
                      className="w-full bg-white border border-rose-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>
              )}

              {/* Optional Customer Phone for standard sale */}
              {salePaymentMethod !== 'CREDIT' && (
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={saleCustomerName}
                    onChange={(e) => setSaleCustomerName(e.target.value)}
                    placeholder="Customer Name (Optional)"
                    className="w-full bg-slate-50 border-0 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800"
                  />
                  <input
                    type="tel"
                    value={saleCustomerPhone}
                    onChange={(e) => setSaleCustomerPhone(e.target.value)}
                    placeholder="WhatsApp Phone (for Receipt)"
                    className="w-full bg-slate-50 border-0 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs py-4 rounded-2xl shadow-lg transition-all cursor-pointer"
              >
                💾 Save Sale Record & Sync
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RECORD EXPENSE / PETTY CASH */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-[32px] max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-black text-slate-900">💸 Petty Cash & Daily Expense</h3>
                <p className="text-xs text-slate-400 mt-0.5">Track generator fuel, logistics, and shop bills</p>
              </div>
              <button 
                onClick={() => setShowExpenseModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-4">
              {/* Category */}
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Expense Category *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(EXPENSE_CATEGORY_LABELS).map(([catKey, meta]) => (
                    <button
                      key={catKey}
                      type="button"
                      onClick={() => setExpenseCategory(catKey as any)}
                      className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 border transition-all text-left cursor-pointer ${
                        expenseCategory === catKey
                          ? 'bg-amber-500 text-white border-amber-500 shadow-md'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-base">{meta.icon}</span>
                      <span className="truncate">{meta.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title / Description */}
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Expense Description *
                </label>
                <input
                  type="text"
                  required
                  value={expenseTitle}
                  onChange={(e) => setExpenseTitle(e.target.value)}
                  placeholder="e.g. 10L Fuel for Gen or Dispatch to Ikeja"
                  className="w-full bg-slate-50 border-0 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Amount Spent (₦) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-50 border-0 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Paid From */}
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Paid From *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setExpensePaymentMethod('CASH')}
                    className={`py-3 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      expensePaymentMethod === 'CASH'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>💵</span> Cash in Till
                  </button>

                  <button
                    type="button"
                    onClick={() => setExpensePaymentMethod('TRANSFER')}
                    className={`py-3 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      expensePaymentMethod === 'TRANSFER'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>🏦</span> Bank Transfer
                  </button>
                </div>
              </div>

              <div>
                <input
                  type="text"
                  value={expenseNotes}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                  placeholder="Optional note / receipt number"
                  className="w-full bg-slate-50 border-0 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-extrabold text-xs py-4 rounded-2xl shadow-lg transition-all cursor-pointer"
              >
                💾 Log Petty Cash Expense
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
