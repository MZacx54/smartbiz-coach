import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, Clock, CheckCircle2, AlertCircle, MessageCircle, MoreVertical, Filter, Search, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import toast from 'react-hot-toast';

interface Lead {
    id: number;
    customer_name: string;
    customer_contact: string;
    message: string;
    product_name: string;
    product_type: string;
    status: 'NEW' | 'FOLLOW_UP' | 'NEGOTIATING' | 'WON' | 'LOST';
    lead_type: 'ORDER' | 'INQUIRY' | 'B2B';
    created_at: string;
}

const LeadManager: React.FC = () => {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'ALL' | 'NEW' | 'WON'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/api/marketplace/leads/');
            setLeads(response.data);
        } catch (err) {
            toast.error('Failed to load leads');
        } finally {
            setIsLoading(false);
        }
    };

    const updateLeadStatus = async (id: number, status: Lead['status']) => {
        try {
            await api.patch(`/api/marketplace/leads/${id}/`, { status });
            setLeads(leads.map(l => l.id === id ? { ...l, status } : l));
            toast.success('Status updated');
        } catch (err) {
            toast.error('Update failed');
        }
    };

    const deleteLead = async (id: number) => {
        if (!confirm('Are you sure?')) return;
        try {
            await api.delete(`/api/marketplace/leads/${id}/`);
            setLeads(leads.filter(l => l.id !== id));
            toast.success('Lead removed');
        } catch (err) {
            toast.error('Delete failed');
        }
    };

    const filteredLeads = leads.filter(l => {
        const matchesFilter = filter === 'ALL' || l.status === filter;
        const matchesSearch = l.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              l.product_name?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const getStatusColor = (status: Lead['status']) => {
        switch (status) {
            case 'NEW': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'WON': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'LOST': return 'bg-rose-100 text-rose-700 border-rose-200';
            default: return 'bg-amber-100 text-amber-700 border-amber-200';
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800">Lead & Order Manager</h1>
                    <p className="text-slate-500 text-sm">Track inquiries across your entire ecosystem.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchLeads} className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-colors shadow-sm">
                        <Clock className="w-5 h-5 text-slate-400" />
                    </button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search customer or item..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
                    />
                </div>
                <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
                    {(['ALL', 'NEW', 'WON'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${filter === f ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-[40px]"></div>)}
                </div>
            ) : filteredLeads.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <AnimatePresence>
                        {filteredLeads.map((lead) => (
                            <motion.div
                                key={lead.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl transition-all p-8 flex flex-col group relative overflow-hidden"
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-xl">
                                            {lead.customer_name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-slate-800">{lead.customer_name}</h3>
                                            <p className="text-xs font-medium text-slate-400 flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {new Date(lead.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${getStatusColor(lead.status)}`}>
                                        {lead.status}
                                    </div>
                                </div>

                                <div className="bg-slate-50/50 rounded-3xl p-6 mb-6 border border-slate-100">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">
                                            {lead.product_type}
                                        </span>
                                        <h4 className="font-bold text-slate-800 text-sm truncate">{lead.product_name}</h4>
                                    </div>
                                    <p className="text-xs text-slate-500 leading-relaxed italic line-clamp-2">"{lead.message || 'No message provided.'}"</p>
                                </div>

                                <div className="flex flex-wrap gap-2 mb-8">
                                    <a href={`tel:${lead.customer_contact}`} className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:border-indigo-500 hover:text-indigo-600 transition-all">
                                        <Phone className="w-3.5 h-3.5" /> Call
                                    </a>
                                    <a href={`https://wa.me/${lead.customer_contact}`} target="_blank" className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl text-xs font-bold text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all">
                                        <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                                    </a>
                                </div>

                                 <div className="mt-auto flex justify-between items-center pt-6 border-t border-slate-50">
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => updateLeadStatus(lead.id, 'NEGOTIATING')} 
                                            title="Mark as Negotiating"
                                            className={`p-2.5 rounded-xl transition-all shadow-sm ${lead.status === 'NEGOTIATING' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white'}`}
                                        >
                                            <Filter className="w-5 h-5" />
                                        </button>
                                        <button 
                                            onClick={() => updateLeadStatus(lead.id, 'WON')} 
                                            title="Mark as Won"
                                            className={`p-2.5 rounded-xl transition-all shadow-sm ${lead.status === 'WON' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'}`}
                                        >
                                            <CheckCircle2 className="w-5 h-5" />
                                        </button>
                                        <button 
                                            onClick={() => updateLeadStatus(lead.id, 'LOST')} 
                                            title="Mark as Lost"
                                            className={`p-2.5 rounded-xl transition-all shadow-sm ${lead.status === 'LOST' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white'}`}
                                        >
                                            <AlertCircle className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <button onClick={() => deleteLead(lead.id)} className="p-2.5 text-slate-300 hover:text-rose-500 transition-colors">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            ) : (
                <div className="bg-white rounded-[50px] p-20 text-center space-y-6 border-2 border-dashed border-slate-200">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-4xl">📬</div>
                    <div className="space-y-2">
                        <p className="text-xl font-black text-slate-800">Inbox is Quiet</p>
                        <p className="text-sm font-medium text-slate-400">Promote your listings to the Market Square to get more inquiries!</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeadManager;
