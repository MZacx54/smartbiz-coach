import React, { useState, useEffect } from 'react';
import { Invoice, InvoiceItem } from '../types';
import ShareActions from './ShareActions';
import { ArrowLeft, Plus, Trash2, Download, CheckCircle, FileText, DollarSign, Calendar, Eye, Send } from 'lucide-react';
import { toast } from 'react-hot-toast';

const mockInvoices: Invoice[] = [
  {
    id: "INV-2026-001",
    clientName: "Dangote Cement PLC",
    clientPhone: "08030000001",
    date: "2026-06-25",
    dueDate: "2026-07-25",
    discount: 5,
    taxRate: 7.5,
    currency: "₦",
    note: "Payment for logistics subcontracting services.",
    senderAddress: "Block 10, Yaba Industrial Estate, Lagos",
    senderEmail: "admin@smartbizcoach.com.ng",
    senderPhone: "08123456789",
    senderTin: "TIN-9284102-001",
    bankName: "Zenith Bank PLC",
    bankAccountName: "SmartBiz Coach Solutions Ltd",
    bankAccountNumber: "1012345678",
    paymentStatus: "PAID",
    paymentTerms: "NET_30",
    items: [
      { id: "1", description: "B2B Logistics Freight Dispatch (10 runs)", quantity: 10, price: 45000 }
    ]
  },
  {
    id: "INV-2026-002",
    clientName: "Paystack Payments Limited",
    clientPhone: "08030000002",
    date: "2026-06-20",
    dueDate: "2026-06-20",
    discount: 0,
    taxRate: 7.5,
    currency: "₦",
    note: "Corporate consultation package fee.",
    senderAddress: "Block 10, Yaba Industrial Estate, Lagos",
    senderEmail: "admin@smartbizcoach.com.ng",
    senderPhone: "08123456789",
    senderTin: "TIN-9284102-001",
    bankName: "Access Bank PLC",
    bankAccountName: "SmartBiz Coach Solutions Ltd",
    bankAccountNumber: "0098765432",
    paymentStatus: "PAID",
    paymentTerms: "DUE_ON_RECEIPT",
    items: [
      { id: "1", description: "AI SME Integration Training Session", quantity: 1, price: 350000 }
    ]
  },
  {
    id: "INV-2026-003",
    clientName: "Jumia Nigeria Office",
    clientPhone: "08030000003",
    date: "2026-06-15",
    dueDate: "2026-06-30",
    discount: 2,
    taxRate: 7.5,
    currency: "₦",
    note: "Premium Ankara Textile Wholesale Order.",
    senderAddress: "Block 10, Yaba Industrial Estate, Lagos",
    senderEmail: "admin@smartbizcoach.com.ng",
    senderPhone: "08123456789",
    senderTin: "TIN-9284102-001",
    bankName: "Zenith Bank PLC",
    bankAccountName: "SmartBiz Coach Solutions Ltd",
    bankAccountNumber: "1012345678",
    paymentStatus: "PAID",
    paymentTerms: "NET_15",
    items: [
      { id: "1", description: "Premium Ankara Fabric (Wholesale rolls)", quantity: 20, price: 12500 }
    ]
  },
  {
    id: "INV-2026-004",
    clientName: "GIG Logistics",
    clientPhone: "08030000004",
    date: "2026-07-01",
    dueDate: "2026-07-31",
    discount: 0,
    taxRate: 7.5,
    currency: "₦",
    note: "Consignment of corporate stationery supplies.",
    senderAddress: "Block 10, Yaba Industrial Estate, Lagos",
    senderEmail: "admin@smartbizcoach.com.ng",
    senderPhone: "08123456789",
    senderTin: "TIN-9284102-001",
    bankName: "Zenith Bank PLC",
    bankAccountName: "SmartBiz Coach Solutions Ltd",
    bankAccountNumber: "1012345678",
    paymentStatus: "SENT",
    paymentTerms: "NET_30",
    items: [
      { id: "1", description: "Standard Office Stationery Consignment", quantity: 1, price: 180000 }
    ]
  }
];

const InvoiceGenerator: React.FC = () => {
  const isTractionMode = localStorage.getItem('sb_idice_traction_mode') === 'true';

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [step, setStep] = useState<'LIST' | 'EDIT' | 'PREVIEW'>('LIST');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Form State
  const [formInvoice, setFormInvoice] = useState<Invoice>({
    id: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
    clientName: '',
    clientPhone: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    items: [{ id: '1', description: '', quantity: 1, price: 0 }],
    discount: 0,
    taxRate: 0,
    currency: '₦',
    note: 'Thank you for your patronage!',
    senderAddress: '',
    senderEmail: '',
    senderPhone: '',
    senderTin: '',
    bankName: '',
    bankAccountName: '',
    bankAccountNumber: '',
    paymentStatus: 'DRAFT',
    paymentTerms: 'NET_15'
  });

  const loadInvoices = () => {
    const saved = localStorage.getItem('sb_invoices_detailed');
    let parsed: Invoice[] = saved ? JSON.parse(saved) : [];

    if (isTractionMode && parsed.length === 0) {
      localStorage.setItem('sb_invoices_detailed', JSON.stringify(mockInvoices));
      // For general business stats compatibility:
      const summaryStats = mockInvoices.map(inv => ({
        id: inv.id,
        clientName: inv.clientName,
        total: inv.items.reduce((acc, i) => acc + (i.quantity * i.price), 0),
        date: inv.date
      }));
      localStorage.setItem('sb_invoices', JSON.stringify(summaryStats));
      parsed = mockInvoices;
    }
    setInvoices(parsed);
  };

  useEffect(() => {
    loadInvoices();
  }, [isTractionMode]);

  const saveInvoicesToStore = (newInvoices: Invoice[]) => {
    localStorage.setItem('sb_invoices_detailed', JSON.stringify(newInvoices));
    
    // Maintain compat with main dashboard health score widget:
    const summaryStats = newInvoices.map(inv => {
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
    setInvoices(newInvoices);
  };

  const addItem = () => {
    setFormInvoice({
      ...formInvoice,
      items: [...formInvoice.items, { id: Date.now().toString(), description: '', quantity: 1, price: 0 }]
    });
  };

  const removeItem = (id: string) => {
    setFormInvoice({
      ...formInvoice,
      items: formInvoice.items.filter(i => i.id !== id)
    });
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setFormInvoice({
      ...formInvoice,
      items: formInvoice.items.map(i => i.id === id ? { ...i, [field]: value } : i)
    });
  };

  const calculateSubtotal = (inv: Invoice) => inv.items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
  
  const calculateTotal = (inv: Invoice) => {
    const sub = calculateSubtotal(inv);
    const discountAmt = sub * (inv.discount / 100);
    const taxAmt = (sub - discountAmt) * (inv.taxRate / 100);
    return sub - discountAmt + taxAmt;
  };

  const handleCreateNew = () => {
    const savedUser = JSON.parse(localStorage.getItem('sb_user') || '{}');
    const savedBrand = JSON.parse(localStorage.getItem('sb_brand') || 'null');
    
    setFormInvoice({
      id: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      clientName: '',
      clientPhone: '',
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      items: [{ id: '1', description: '', quantity: 1, price: 0 }],
      discount: 0,
      taxRate: 7.5, // Standard Nigerian VAT
      currency: '₦',
      note: 'Please remit payment to the bank account listed above. Thank you for your business!',
      senderAddress: savedBrand?.location || 'Yaba, Lagos',
      senderEmail: savedUser?.email || '',
      senderPhone: savedUser?.phone || '',
      senderTin: savedBrand?.tin || 'TIN-184902-001',
      bankName: 'Zenith Bank PLC',
      bankAccountName: savedUser?.businessName || 'My Business Entity Ltd',
      bankAccountNumber: '1012948190',
      paymentStatus: 'DRAFT',
      paymentTerms: 'NET_15'
    });
    setStep('EDIT');
  };

  const handleSaveInvoice = () => {
    if (!formInvoice.clientName) {
      toast.error('Client name is required');
      return;
    }
    if (formInvoice.items.some(i => !i.description || i.price <= 0)) {
      toast.error('All items must have a description and valid price');
      return;
    }

    const exists = invoices.some(inv => inv.id === formInvoice.id);
    let updatedList: Invoice[] = [];
    if (exists) {
      updatedList = invoices.map(inv => inv.id === formInvoice.id ? formInvoice : inv);
    } else {
      updatedList = [formInvoice, ...invoices];
    }

    saveInvoicesToStore(updatedList);
    toast.success('Invoice saved successfully');
    setSelectedInvoice(formInvoice);
    setStep('PREVIEW');
  };

  const handleDeleteInvoice = (id: string) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    const filtered = invoices.filter(inv => inv.id !== id);
    saveInvoicesToStore(filtered);
    toast.success('Invoice deleted');
  };

  const exportInvoicesToCSV = () => {
    if (invoices.length === 0) {
      toast.error('No invoices to export');
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Invoice ID,Client Name,Client Phone,Date,Due Date,Subtotal,Discount %,Tax %,Total (NGN),Status,Payment Terms\n";

    invoices.forEach(inv => {
      const sub = calculateSubtotal(inv);
      const tot = calculateTotal(inv);
      csvContent += `"${inv.id}","${inv.clientName}","${inv.clientPhone || ''}","${inv.date}","${inv.dueDate || ''}",${sub},${inv.discount},${inv.taxRate},${tot},"${inv.paymentStatus}","${inv.paymentTerms}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SmartBiz_Invoices_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV report exported!');
  };

  // Stat computations
  const totalVolume = invoices.reduce((acc, curr) => acc + calculateTotal(curr), 0);
  const totalPaid = invoices.filter(inv => inv.paymentStatus === 'PAID').reduce((acc, curr) => acc + calculateTotal(curr), 0);
  const totalOutstanding = invoices.filter(inv => inv.paymentStatus !== 'PAID').reduce((acc, curr) => acc + calculateTotal(curr), 0);

  if (step === 'PREVIEW' && selectedInvoice) {
    const total = calculateTotal(selectedInvoice);
    const subtotal = calculateSubtotal(selectedInvoice);
    const shareText = `Hello ${selectedInvoice.clientName}, please find your official invoice (${selectedInvoice.id}) for ₦${total.toLocaleString()} from ${selectedInvoice.bankAccountName}. Due date: ${selectedInvoice.dueDate}.`;

    return (
      <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 pb-12">
        <div className="flex justify-between items-center mb-6 no-print">
          <button 
            onClick={() => setStep('LIST')} 
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 font-bold"
          >
            <ArrowLeft className="w-4 h-4" /> Back to List
          </button>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                setFormInvoice(selectedInvoice);
                setStep('EDIT');
              }} 
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-bold text-xs"
            >
              Edit Invoice
            </button>
            <button 
              onClick={() => window.print()} 
              className="px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 font-bold text-xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Print / Save PDF
            </button>
          </div>
        </div>

        {/* Professional Auditable Invoice Template */}
        <div id="invoice-preview" className="bg-white border border-slate-200 shadow-xl rounded-2xl p-8 md:p-12 mb-6 print:border-none print:shadow-none print:p-0 relative overflow-hidden">
          {/* Audit Watermark badge */}
          <div className="absolute top-8 right-8 flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-sm">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Audited & Verified</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-slate-100 pb-8 mb-8">
            <div className="space-y-2">
              <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider ${
                selectedInvoice.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                selectedInvoice.paymentStatus === 'SENT' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
              }`}>
                Invoice: {selectedInvoice.paymentStatus}
              </span>
              <h1 className="text-3xl font-black text-slate-900 font-heading mt-2">INVOICE</h1>
              <p className="text-sm font-bold text-slate-400">Reference: #{selectedInvoice.id}</p>
              <p className="text-xs text-slate-500">Terms: {selectedInvoice.paymentTerms?.replace('_', ' ')}</p>
            </div>
            
            <div className="md:text-right space-y-1">
              <h2 className="text-lg font-bold text-slate-850 font-heading">{selectedInvoice.bankAccountName || 'Business Entity Name'}</h2>
              <p className="text-xs text-slate-500">{selectedInvoice.senderAddress}</p>
              <p className="text-xs text-slate-500">{selectedInvoice.senderPhone}</p>
              <p className="text-xs text-slate-500">{selectedInvoice.senderEmail}</p>
              {selectedInvoice.senderTin && (
                <p className="text-[10px] font-bold text-indigo-600 uppercase mt-1">TIN: {selectedInvoice.senderTin}</p>
              )}
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Invoice Date</p>
              <p className="text-xs font-bold text-slate-700">{selectedInvoice.date}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Due Date</p>
              <p className="text-xs font-bold text-slate-700">{selectedInvoice.dueDate || 'Upon Receipt'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Billed To</p>
              <p className="text-xs font-bold text-slate-800">{selectedInvoice.clientName}</p>
              <p className="text-[11px] text-slate-500 leading-none mt-0.5">{selectedInvoice.clientPhone}</p>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full mb-8">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="pb-3 text-left">Description</th>
                  <th className="pb-3 text-center w-16">Qty</th>
                  <th className="pb-3 text-right w-24">Unit Price</th>
                  <th className="pb-3 text-right w-28">Amount</th>
                </tr>
              </thead>
              <tbody className="text-xs text-slate-700 divide-y divide-slate-50">
                {selectedInvoice.items.map((item, idx) => (
                  <tr key={item.id} className="py-4">
                    <td className="py-3.5 font-semibold text-slate-800">{item.description}</td>
                    <td className="py-3.5 text-center font-bold text-slate-600">{item.quantity}</td>
                    <td className="py-3.5 text-right font-medium text-slate-650">₦{item.price.toLocaleString()}</td>
                    <td className="py-3.5 text-right font-bold text-slate-900">₦{(item.quantity * item.price).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Totals */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-t border-slate-100 pt-6">
            <div className="w-full md:w-1/2 p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Payment Instructions</h4>
              <p className="text-xs text-slate-700"><span className="font-bold text-slate-500">Bank:</span> {selectedInvoice.bankName || 'Access Bank'}</p>
              <p className="text-xs text-slate-700"><span className="font-bold text-slate-500">Account Name:</span> {selectedInvoice.bankAccountName}</p>
              <p className="text-xs text-slate-700"><span className="font-bold text-slate-500">Account Number:</span> {selectedInvoice.bankAccountNumber}</p>
            </div>
            
            <div className="w-full md:w-1/3 space-y-2">
              <div className="flex justify-between text-xs text-slate-500 font-medium">
                <span>Subtotal</span>
                <span>₦{subtotal.toLocaleString()}</span>
              </div>
              {selectedInvoice.discount > 0 && (
                <div className="flex justify-between text-xs text-emerald-600 font-semibold">
                  <span>Discount ({selectedInvoice.discount}%)</span>
                  <span>- ₦{(subtotal * (selectedInvoice.discount / 100)).toLocaleString()}</span>
                </div>
              )}
              {selectedInvoice.taxRate > 0 && (
                <div className="flex justify-between text-xs text-slate-500 font-medium">
                  <span>VAT / Tax ({selectedInvoice.taxRate}%)</span>
                  <span>+ ₦{((subtotal - (subtotal * (selectedInvoice.discount / 100))) * (selectedInvoice.taxRate / 100)).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-slate-900 border-t border-slate-150 pt-2.5 mt-1.5">
                <span>Total Due</span>
                <span>₦{total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-slate-100 text-center text-[10px] text-slate-400 italic">
            {selectedInvoice.note}
          </div>
        </div>

        <div className="bg-slate-100 p-4 rounded-2xl no-print">
          <ShareActions text={shareText} title={`Invoice #${selectedInvoice.id}`} />
        </div>
      </div>
    );
  }

  if (step === 'EDIT') {
    return (
      <div className="max-w-3xl mx-auto pb-12 animate-in fade-in">
        <div className="flex justify-between items-center mb-6">
          <button 
            onClick={() => setStep('LIST')} 
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-955 font-bold"
          >
            <ArrowLeft className="w-4 h-4" /> Cancel
          </button>
          <button 
            onClick={handleSaveInvoice}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-98"
          >
            Save & Preview
          </button>
        </div>

        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200 space-y-6">
          <h3 className="font-extrabold text-slate-800 text-base font-heading border-b border-slate-100 pb-3">Create Invoice Receipt</h3>

          {/* Sender & TIN Profile */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Your Registered Address</label>
              <input 
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-indigo-500"
                placeholder="e.g. Block 10, Yaba Industrial Estate, Lagos"
                value={formInvoice.senderAddress}
                onChange={(e) => setFormInvoice({...formInvoice, senderAddress: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Company TIN (Tax ID)</label>
              <input 
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-indigo-500"
                placeholder="e.g. TIN-184902-001"
                value={formInvoice.senderTin}
                onChange={(e) => setFormInvoice({...formInvoice, senderTin: e.target.value})}
              />
            </div>
          </div>

          {/* Client Details */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Client Name / Business</label>
              <input 
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-indigo-500"
                placeholder="e.g. Dangote Cement PLC"
                value={formInvoice.clientName}
                onChange={(e) => setFormInvoice({...formInvoice, clientName: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Client Phone</label>
              <input 
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-indigo-500"
                placeholder="e.g. 08012345678"
                value={formInvoice.clientPhone}
                onChange={(e) => setFormInvoice({...formInvoice, clientPhone: e.target.value})}
              />
            </div>
          </div>

          {/* Dates & Terms */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Invoice Date</label>
              <input 
                type="date"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-indigo-500"
                value={formInvoice.date}
                onChange={(e) => setFormInvoice({...formInvoice, date: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Due Date</label>
              <input 
                type="date"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-indigo-500"
                value={formInvoice.dueDate}
                onChange={(e) => setFormInvoice({...formInvoice, dueDate: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Payment Terms</label>
              <select 
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-indigo-500 bg-white"
                value={formInvoice.paymentTerms}
                onChange={(e) => setFormInvoice({...formInvoice, paymentTerms: e.target.value as any})}
              >
                <option value="DUE_ON_RECEIPT">Due on Receipt</option>
                <option value="NET_15">Net 15 Days</option>
                <option value="NET_30">Net 30 Days</option>
                <option value="NET_60">Net 60 Days</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Payment Status</label>
              <select 
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-indigo-500 bg-white"
                value={formInvoice.paymentStatus}
                onChange={(e) => setFormInvoice({...formInvoice, paymentStatus: e.target.value as any})}
              >
                <option value="DRAFT">Draft</option>
                <option value="SENT">Sent</option>
                <option value="PAID">Paid</option>
                <option value="OVERDUE">Overdue</option>
              </select>
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Invoiced Services / Products</label>
            <div className="space-y-3">
              {formInvoice.items.map((item, idx) => (
                <div key={item.id} className="flex gap-2 items-center">
                  <span className="text-[10px] font-bold text-slate-300 font-mono">{idx + 1}.</span>
                  <input 
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-indigo-500"
                    placeholder="e.g. Ankara Fabric Wholesale Rolls"
                    value={item.description}
                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                  />
                  <input 
                    type="number"
                    className="w-16 border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-indigo-500 text-center"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                  />
                  <input 
                    type="number"
                    className="w-28 border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-indigo-500 text-right"
                    placeholder="Price (₦)"
                    value={item.price || ''}
                    onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                  />
                  <button 
                    onClick={() => removeItem(item.id)}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button 
              onClick={addItem}
              className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              <Plus className="w-3.5 h-3.5" /> Add New Item Line
            </button>
          </div>

          {/* Payment & Bank Routing */}
          <div className="grid md:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Bank Name</label>
              <input 
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-indigo-500"
                placeholder="e.g. Zenith Bank PLC"
                value={formInvoice.bankName}
                onChange={(e) => setFormInvoice({...formInvoice, bankName: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Account Name</label>
              <input 
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-indigo-500"
                placeholder="e.g. SmartBiz Coach Ltd"
                value={formInvoice.bankAccountName}
                onChange={(e) => setFormInvoice({...formInvoice, bankAccountName: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Account Number</label>
              <input 
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-indigo-500"
                placeholder="e.g. 1012345678"
                value={formInvoice.bankAccountNumber}
                onChange={(e) => setFormInvoice({...formInvoice, bankAccountNumber: e.target.value})}
              />
            </div>
          </div>

          {/* Taxes & Extras */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Discount (%)</label>
              <input 
                type="number"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-indigo-500"
                value={formInvoice.discount || ''}
                onChange={(e) => setFormInvoice({...formInvoice, discount: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Tax / VAT (%)</label>
              <input 
                type="number"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-indigo-500"
                value={formInvoice.taxRate || ''}
                onChange={(e) => setFormInvoice({...formInvoice, taxRate: parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Terms and Notes</label>
            <textarea 
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-indigo-500 resize-none"
              rows={2}
              value={formInvoice.note}
              onChange={(e) => setFormInvoice({...formInvoice, note: e.target.value})}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-in fade-in">
      {/* Dashboard Metrics */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 font-heading">Invoice Cash Flow Manager 🧾</h2>
          <p className="text-xs text-slate-500 mt-1">Track payments, log business revenue, and verify your traction audit.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={exportInvoicesToCSV}
            className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-bold text-xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Export Logs
          </button>
          <button 
            onClick={handleCreateNew}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-150"
          >
            <Plus className="w-4 h-4" /> Create Invoice
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold text-lg">₦</div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoiced Volume</p>
            <h4 className="text-xl font-black text-slate-800 font-heading">₦{totalVolume.toLocaleString()}</h4>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold text-lg">✓</div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Receipts Paid</p>
            <h4 className="text-xl font-black text-slate-800 font-heading">₦{totalPaid.toLocaleString()}</h4>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center font-bold text-lg">⏳</div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Outstanding Receivables</p>
            <h4 className="text-xl font-black text-slate-800 font-heading">₦{totalOutstanding.toLocaleString()}</h4>
          </div>
        </div>
      </div>

      {/* Invoice Table list */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-600">Financial Log Book</h3>
          <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{invoices.length} Invoices</span>
        </div>

        {invoices.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <span className="text-3xl">📭</span>
            <p className="font-bold text-slate-800 text-sm">No Invoices recorded</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">Create your first invoice to build audited cash flow history for lender/bank applications.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/20">
                  <th className="p-4">Reference</th>
                  <th className="p-4">Client Name</th>
                  <th className="p-4">Invoice Date</th>
                  <th className="p-4 text-right">Total Amount</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {invoices.map(inv => {
                  const total = calculateTotal(inv);
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/55 transition-colors">
                      <td className="p-4 font-bold text-slate-700">{inv.id}</td>
                      <td className="p-4 font-semibold text-slate-800">{inv.clientName}</td>
                      <td className="p-4 text-slate-500">{inv.date}</td>
                      <td className="p-4 text-right font-black text-slate-900">₦{total.toLocaleString()}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          inv.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          inv.paymentStatus === 'SENT' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                          inv.paymentStatus === 'OVERDUE' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                          'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {inv.paymentStatus}
                        </span>
                      </td>
                      <td className="p-4 text-center flex items-center justify-center gap-1">
                        <button 
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setStep('PREVIEW');
                          }}
                          className="p-1.5 text-slate-500 hover:text-indigo-650 hover:bg-indigo-50 rounded-lg transition-all"
                          title="View Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteInvoice(inv.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          title="Delete Invoice"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceGenerator;