import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { User } from '../types';
import api from '../services/api';
import { marketingService } from '../services/marketingService';
import { billingService } from '../services/billingService';
import CreditPromptModal from './CreditPromptModal';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface Contact {
  id: number;
  name: string;
  phone: string;
  email?: string;
  tags: string;
  is_opted_out: boolean;
  last_messaged_at: string | null;
}

interface Campaign {
  id: number;
  name: string;
  channel: 'WHATSAPP' | 'SMS' | 'EMAIL';
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  daily_limit: number;
  total_contacts: number;
  sent_count: number;
  failed_count: number;
  progress_percent: number;
  message_template: string;
  email_subject?: string;
  email_sender_name?: string;
  email_preview_text?: string;
  scheduled_at?: string | null;
  target_tags?: string;
}

interface WhatsAppBatchItem {
  id: number;
  name: string;
  phone: string;
  message: string;
  whatsapp_url: string;
}

interface MarketingStats {
  total_contacts: number;
  active_contacts: number;
  opted_out: number;
  total_campaigns: number;
  total_messages_sent: number;
  termii_configured: boolean;
  plan?: string;
  max_contacts?: number;
  max_batch_size?: number;
  max_campaigns?: number;
  can_send_sms?: boolean;
  sms_credit_cost?: number;
  bypass_limits?: boolean;
}

interface Props {
  user: User | null;
  credits?: number;
  onUpdateCredits?: (credits: number) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// SAMPLE MESSAGE TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

const MESSAGE_TEMPLATES = [
  {
    label: '🚀 Launch Announcement',
    text: `Hi {{name}}! 👋\n\nExciting news! SmartBiz Coach is now LIVE — the AI business assistant built for Nigerian entrepreneurs like you.\n\n✅ Build your brand in seconds\n✅ Generate a business plan\n✅ Find grants you qualify for\n✅ Track debtors, invoices & more\n\nSign up FREE today 👉 https://smartbizcoach.com.ng\n\nFirst 3 uses are completely free. No credit card needed!\n\n– Meshach, Founder 🇳🇬`,
  },
  {
    label: '🎁 Free Credits Offer',
    text: `Hello {{name}}! 🌟\n\nQuick one — I just launched SmartBiz Coach, an AI tool helping Nigerian business owners grow faster.\n\nFor the next 48 hours, early signups get BONUS BizCredits.\n\n📌 What you get for FREE:\n• AI Brand Builder\n• Business Plan Generator\n• Grant Finder\n\nJoin here: https://smartbizcoach.com.ng\n\nDon't miss it! 🔥`,
  },
  {
    label: '💡 Value Education',
    text: `Hi {{name}},\n\nDid you know most Nigerian businesses fail because of poor branding and record-keeping?\n\nSmartBiz Coach fixes that with AI:\n📊 Professional invoices in 30 seconds\n📒 Debt tracker with WhatsApp reminders\n✍️ Social media content that converts\n\nTry it FREE → https://smartbizcoach.com.ng\n\nLet me know if you have any questions!`,
  },
  {
    label: '🤝 Personal Outreach',
    text: `Hey {{name}}! 👋\n\nI've been building something for entrepreneurs in Nigeria and thought of you.\n\nSmartBiz Coach helps you:\n• Create a full brand identity (name, colors, logo prompt, taglines)\n• Write business plans for banks/TEF\n• Find grants matching your business\n\nIt's free to start. Would love your honest feedback.\n\n→ https://smartbizcoach.com.ng`,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const MarketingAgent: React.FC<Props> = ({ user, credits = 0, onUpdateCredits }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'contacts' | 'whatsapp' | 'sms' | 'email' | 'campaigns'>('overview');
  const [stats, setStats] = useState<MarketingStats | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [contactsTotal, setContactsTotal] = useState(0);
  const [contactSearch, setContactSearch] = useState('');

  // Credit modal state
  const [showCreditPrompt, setShowCreditPrompt] = useState(false);

  // Campaign creation
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignChannel, setNewCampaignChannel] = useState<'WHATSAPP' | 'SMS' | 'EMAIL'>('WHATSAPP');
  const [newCampaignTemplate, setNewCampaignTemplate] = useState(MESSAGE_TEMPLATES[0].text);
  const [newCampaignEmailSubject, setNewCampaignEmailSubject] = useState('');
  const [newCampaignEmailSenderName, setNewCampaignEmailSenderName] = useState(user?.businessName || '');
  const [newCampaignEmailPreviewText, setNewCampaignEmailPreviewText] = useState('');
  const [newCampaignDailyLimit, setNewCampaignDailyLimit] = useState(100);
  const [newCampaignScheduledAt, setNewCampaignScheduledAt] = useState('');
  const [newCampaignTargetTags, setNewCampaignTargetTags] = useState('');
  const [creatingCampaign, setCreatingCampaign] = useState(false);

  // AI suggest states
  const [aiPromptObjective, setAiPromptObjective] = useState('');
  const [generatingSuggestion, setGeneratingSuggestion] = useState(false);
  const [showAiSuggestModal, setShowAiSuggestModal] = useState(false);

  // WhatsApp batch
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [waBatch, setWaBatch] = useState<WhatsAppBatchItem[]>([]);
  const [waBatchLoading, setWaBatchLoading] = useState(false);
  const [waBatchSize, setWaBatchSize] = useState(100);
  const [sentPhones, setSentPhones] = useState<Set<string>>(new Set());
  const [batchRemaining, setBatchRemaining] = useState(0);

  // SMS
  const [smsCampaign, setSmsCampaign] = useState<Campaign | null>(null);
  const [smsBatchSize, setSmsBatchSize] = useState(50);
  const [smsSending, setSmsSending] = useState(false);
  const [smsResult, setSmsResult] = useState<any>(null);

  // Email
  const [emailCampaign, setEmailCampaign] = useState<Campaign | null>(null);
  const [emailBatchSize, setEmailBatchSize] = useState(50);
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult] = useState<any>(null);
  const [emailPreviewDevice, setEmailPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  // CSV upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  // Single contact add
  const [addPhone, setAddPhone] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addName, setAddName] = useState('');
  const [addTags, setAddTags] = useState('');

  // ─── Data fetching ────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('marketing/stats/');
      setStats(res.data);
    } catch (e) {
      // silently fail if endpoint not yet deployed
    }
  }, []);

  const fetchContacts = useCallback(async (search = '') => {
    try {
      const res = await api.get(`marketing/contacts/?search=${search}&per_page=30`);
      setContacts(res.data.contacts || []);
      setContactsTotal(res.data.total || 0);
    } catch (e) {
      setContacts([]);
    }
  }, []);

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await api.get('marketing/campaigns/');
      setCampaigns(res.data || []);
    } catch (e) {
      setCampaigns([]);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchContacts();
    fetchCampaigns();
  }, [fetchStats, fetchContacts, fetchCampaigns]);

  useEffect(() => {
    const delay = setTimeout(() => fetchContacts(contactSearch), 400);
    return () => clearTimeout(delay);
  }, [contactSearch, fetchContacts]);

  // ─── Contact Actions ──────────────────────────────────────────────────────

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('marketing/contacts/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const d = res.data;
      toast.success(`✅ Imported ${d.imported} contacts! (${d.duplicates} duplicates skipped)`);
      if (d.errors?.length > 0) {
        toast.error(`⚠️ ${d.errors.length} rows had errors`);
      }
      fetchContacts();
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'CSV upload failed');
    } finally {
      setUploadLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addPhone && !addEmail) return toast.error('Phone number or Email is required');
    try {
      await api.post('marketing/contacts/', { phone: addPhone, email: addEmail, name: addName, tags: addTags });
      toast.success('Contact added!');
      setAddPhone(''); setAddEmail(''); setAddName(''); setAddTags('');
      fetchContacts();
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add contact');
    }
  };

  const handleDeleteContact = async (id: number) => {
    try {
      await api.delete(`marketing/contacts/${id}/`);
      toast.success('Contact removed');
      fetchContacts(contactSearch);
      fetchStats();
    } catch {
      toast.error('Failed to delete contact');
    }
  };

  const handleAISuggest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPromptObjective.trim()) {
      toast.error('Please enter a goal or topic for the campaign');
      return;
    }

    const aiCost = 2;
    if (credits < aiCost) {
      setShowCreditPrompt(true);
      return;
    }

    setGeneratingSuggestion(true);
    try {
      const response = await api.post('marketing/ai-suggest/', {
        topic: aiPromptObjective,
        channel: newCampaignChannel
      });
      if (response.data.suggestion) {
        const billingResponse = await billingService.deductCredits(aiCost, 'AI Broadcast Message Craft');
        if (onUpdateCredits) onUpdateCredits(billingResponse.credits);

        setNewCampaignTemplate(response.data.suggestion);
        if (response.data.subject) {
          setNewCampaignEmailSubject(response.data.subject);
        }
        if (response.data.preview_text) {
          setNewCampaignEmailPreviewText(response.data.preview_text);
        }
        toast.success(`AI Message suggestion generated! (${aiCost} credits debited)`);
        setShowAiSuggestModal(false);
        setAiPromptObjective('');
      } else if (response.data.error) {
        toast.error(response.data.error);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to generate message suggestion');
    } finally {
      setGeneratingSuggestion(false);
    }
  };

  // ─── Campaign Actions ─────────────────────────────────────────────────────

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignName || !newCampaignTemplate) return;
    setCreatingCampaign(true);
    try {
      const res = await api.post('marketing/campaigns/', {
        name: newCampaignName,
        message_template: newCampaignTemplate,
        channel: newCampaignChannel,
        daily_limit: newCampaignDailyLimit,
        email_subject: newCampaignEmailSubject,
        email_sender_name: newCampaignEmailSenderName,
        email_preview_text: newCampaignEmailPreviewText,
        scheduled_at: newCampaignScheduledAt || null,
        target_tags: newCampaignTargetTags,
      });
      toast.success(`Campaign "${res.data.name}" created!`);
      setNewCampaignName('');
      setNewCampaignEmailSubject('');
      setNewCampaignEmailPreviewText('');
      setNewCampaignScheduledAt('');
      setNewCampaignTargetTags('');
      fetchCampaigns();
      if (newCampaignChannel === 'EMAIL') {
        setActiveTab('email');
        setEmailCampaign(res.data);
      } else if (newCampaignChannel === 'SMS') {
        setActiveTab('sms');
        setSmsCampaign(res.data);
      } else {
        setActiveTab('whatsapp');
        setSelectedCampaign(res.data);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create campaign');
    } finally {
      setCreatingCampaign(false);
    }
  };

  // ─── Email Batch ──────────────────────────────────────────────────────────

  const handleSendEmailBatch = async () => {
    if (!emailCampaign) return toast.error('Select an Email campaign first');
    setEmailSending(true);
    setEmailResult(null);
    try {
      const res = await api.post('marketing/email/send/', {
        campaign_id: emailCampaign.id,
        batch_size: emailBatchSize,
      });
      setEmailResult(res.data);
      if (res.data.credits_deducted > 0 && onUpdateCredits) {
        onUpdateCredits(res.data.remaining_credits);
      }
      toast.success(`📧 Dispatched ${res.data.sent} emails successfully!`);
      fetchCampaigns();
      fetchStats();
    } catch (err: any) {
      const errData = err.response?.data;
      toast.error(errData?.error || 'Email send failed');
      setEmailResult(errData);
    } finally {
      setEmailSending(false);
    }
  };

  // ─── WhatsApp Batch ───────────────────────────────────────────────────────

  const handleGenerateWABatch = async () => {
    if (!selectedCampaign) return toast.error('Select a campaign first');
    setWaBatchLoading(true);
    try {
      const res = await api.post('marketing/whatsapp/batch/', {
        campaign_id: selectedCampaign.id,
        batch_size: waBatchSize,
      });
      setWaBatch(res.data.batch || []);
      setBatchRemaining(res.data.remaining || 0);
      setSentPhones(new Set());
      toast.success(`📋 ${res.data.batch_size} contacts ready to message!`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to generate batch');
    } finally {
      setWaBatchLoading(false);
    }
  };

  const handleMarkAllSent = async () => {
    if (!selectedCampaign || waBatch.length === 0) return;
    const phones = waBatch.map(c => c.phone);
    try {
      await api.post('marketing/whatsapp/mark-sent/', {
        campaign_id: selectedCampaign.id,
        phones,
      });
      setSentPhones(new Set(phones));
      toast.success(`✅ Marked ${phones.length} messages as sent!`);
      fetchCampaigns();
      fetchStats();
    } catch {
      toast.error('Failed to mark as sent');
    }
  };

  const toggleSent = (phone: string) => {
    setSentPhones(prev => {
      const next = new Set(prev);
      next.has(phone) ? next.delete(phone) : next.add(phone);
      return next;
    });
  };

  const [sendingCloudWA, setSendingCloudWA] = useState(false);

  const handleAutoSendCloudWA = async () => {
    if (!selectedCampaign || waBatch.length === 0) return toast.error('Generate a batch first');
    setSendingCloudWA(true);
    let sentCount = 0;
    let failCount = 0;

    for (const item of waBatch) {
      try {
        await marketingService.sendWhatsAppCloudMessage({
          phone: item.phone,
          message: item.message
        });
        sentCount++;
        toggleSent(item.phone);
      } catch (err: any) {
        failCount++;
      }
    }

    setSendingCloudWA(false);
    toast.success(`⚡ Dispatched ${sentCount} messages via WhatsApp Cloud API! ${failCount > 0 ? `(${failCount} failed)` : ''}`);
    if (sentCount > 0) {
      handleMarkAllSent();
    }
  };

  // ─── SMS Batch ────────────────────────────────────────────────────────────

  const handleSendSMSBatch = async () => {
    if (!smsCampaign) return toast.error('Select an SMS campaign first');
    setSmsSending(true);
    setSmsResult(null);
    try {
      const res = await api.post('marketing/sms/send/', {
        campaign_id: smsCampaign.id,
        batch_size: smsBatchSize,
        sender_id: 'SmartBiz',
      });
      setSmsResult(res.data);
      toast.success(`📩 Sent ${res.data.sent} SMS messages!`);
      fetchCampaigns();
      fetchStats();
    } catch (err: any) {
      const errData = err.response?.data;
      if (errData?.setup_guide) {
        toast.error(errData.error || 'Termii not configured');
        setSmsResult(errData);
      } else {
        toast.error(errData?.error || 'SMS send failed');
      }
    } finally {
      setSmsSending(false);
    }
  };

  // ─── UI Helpers ───────────────────────────────────────────────────────────

  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-slate-100 text-slate-600',
      ACTIVE: 'bg-green-100 text-green-700',
      PAUSED: 'bg-yellow-100 text-yellow-700',
      COMPLETED: 'bg-blue-100 text-blue-700',
      SENT: 'bg-green-100 text-green-700',
      PENDING: 'bg-yellow-100 text-yellow-700',
      FAILED: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
        {status}
      </span>
    );
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'contacts', label: `Contacts (${contactsTotal.toLocaleString()})`, icon: '👥' },
    { id: 'campaigns', label: 'Campaigns', icon: '📋' },
    { id: 'whatsapp', label: 'WhatsApp', icon: '💬' },
    { id: 'sms', label: 'SMS', icon: '📩' },
    { id: 'email', label: 'Email Broadcasts', icon: '📧' },
  ] as const;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-pink-600 via-rose-600 to-purple-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full -ml-10 -mb-10" />
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📣</span>
              <div>
                <h1 className="text-2xl font-extrabold">Broadcast HQ</h1>
                <p className="text-pink-200 text-sm">WhatsApp + SMS Marketing Agent</p>
              </div>
            </div>
            {stats?.plan && (
              <span className="bg-white/20 backdrop-blur-md text-white font-bold text-xs px-3.5 py-1.5 rounded-full border border-white/25 shadow-sm uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                {stats.plan.includes('Admin') ? '👑' : '⚡'} {stats.plan}
              </span>
            )}
          </div>
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {[
                { label: 'Total Contacts', value: stats.total_contacts.toLocaleString() },
                { label: 'Active', value: stats.active_contacts.toLocaleString() },
                { label: 'Campaigns', value: stats.total_campaigns },
                { label: 'Messages Sent', value: stats.total_messages_sent.toLocaleString() },
              ].map(s => (
                <div key={s.label} className="bg-white/15 rounded-2xl p-3 text-center backdrop-blur-sm">
                  <div className="text-xl font-black">{s.value}</div>
                  <div className="text-[10px] text-pink-200 font-bold uppercase tracking-wide">{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex overflow-x-auto gap-2 pb-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
              activeTab === t.id
                ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30'
                : 'bg-white text-slate-600 hover:bg-pink-50 border border-slate-200'
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {/* ══════════════════════════════════════════════════════ OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="grid gap-6">
              {/* Premium upgrade promo if Free */}
              {stats?.plan === 'Free Plan' && (
                <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-950 border border-purple-800/40 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="absolute right-0 top-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl" />
                  <div className="space-y-1 relative z-10">
                    <h3 className="text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-200">🚀 Upgrade to Pro Plan</h3>
                    <p className="text-slate-300 text-sm max-w-xl">
                      Unlock unlimited contacts import, send automated SMS messages to your audience, and get larger daily WhatsApp batch queues (200 contacts/day instead of 20).
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/dashboard/settings')}
                    className="bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-350 hover:to-amber-400 text-slate-950 font-black text-xs px-6 py-3 rounded-2xl shadow-lg transition-transform hover:scale-105 flex-shrink-0"
                  >
                    ⚡ Buy Credits / Go Pro
                  </button>
                </div>
              )}
              {/* Termii Setup Guide */}
              {stats && !stats.termii_configured && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <h3 className="font-bold text-amber-800 mb-1">SMS Not Configured Yet</h3>
                      <p className="text-amber-700 text-sm mb-3">
                        To send SMS messages, you need a free Termii API key. WhatsApp broadcasting works without any setup.
                      </p>
                      <div className="bg-white border border-amber-200 rounded-xl p-4 font-mono text-sm">
                        <p className="text-slate-700 font-semibold mb-2">Setup Steps:</p>
                        <ol className="list-decimal pl-4 space-y-1 text-slate-600 text-xs">
                          <li>Go to <a href="https://termii.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">termii.com</a> and create a free account</li>
                          <li>Copy your API key from the dashboard</li>
                          <li>Add to your backend <code className="bg-slate-100 px-1 rounded">.env</code> file: <code className="bg-slate-100 px-1 rounded">TERMII_API_KEY=your_key_here</code></li>
                          <li>Re-deploy your backend on Render</li>
                        </ol>
                        <p className="text-xs text-amber-600 mt-2">💡 New accounts get ₦200 free SMS credits. Nigerian SMS ~₦2–4 per message.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { icon: '📂', title: 'Import Contacts', desc: 'Upload your 30,000 contacts via CSV', action: () => setActiveTab('contacts'), color: 'from-blue-500 to-indigo-600' },
                  { icon: '💬', title: 'WhatsApp Batch', desc: 'Generate daily broadcast links (100–200/day)', action: () => setActiveTab('whatsapp'), color: 'from-green-500 to-emerald-600' },
                  { icon: '📩', title: 'Send SMS', desc: 'Automated SMS via Termii to your list', action: () => setActiveTab('sms'), color: 'from-pink-500 to-rose-600' },
                ].map(qa => (
                  <button
                    key={qa.title}
                    onClick={qa.action}
                    className={`bg-gradient-to-br ${qa.color} text-white rounded-2xl p-5 text-left hover:scale-105 transition-transform shadow-lg`}
                  >
                    <div className="text-3xl mb-3">{qa.icon}</div>
                    <div className="font-bold text-lg mb-1">{qa.title}</div>
                    <div className="text-white/80 text-sm">{qa.desc}</div>
                  </button>
                ))}
              </div>

              {/* How WhatsApp Broadcasting Works */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <h3 className="font-bold text-slate-800 text-lg mb-4">📖 How WhatsApp Broadcasting Works</h3>
                <div className="space-y-3">
                  {[
                    { step: '1', title: 'Import your contacts', desc: 'Upload a CSV file with columns: phone, name (optional)' },
                    { step: '2', title: 'Create a campaign', desc: 'Write your message template with {{name}} for personalization' },
                    { step: '3', title: 'Generate today\'s batch', desc: 'The system prepares 100–200 contacts with pre-filled WhatsApp links' },
                    { step: '4', title: 'Send personally', desc: 'Click each link → WhatsApp opens with your message pre-typed → Tap Send' },
                    { step: '5', title: 'Mark as sent', desc: 'Mark the batch complete so they won\'t appear in the next batch' },
                  ].map(s => (
                    <div key={s.step} className="flex gap-4 items-start">
                      <div className="w-8 h-8 bg-pink-100 text-pink-700 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0">{s.step}</div>
                      <div>
                        <div className="font-bold text-slate-700 text-sm">{s.title}</div>
                        <div className="text-slate-500 text-xs">{s.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 mt-4 text-xs text-green-700">
                  <strong>✅ Why this approach?</strong> WhatsApp's official API requires users to opt-in first. 
                  This method lets you send personal messages from your own phone without violating policies — 
                  just like you would normally message people, but with a smart assistant to prepare the list.
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════ CONTACTS */}
          {activeTab === 'contacts' && (
            <div className="space-y-5">
              {/* Upload CSV / TXT / WhatsApp Export */}
              <div className="bg-white border-2 border-dashed border-pink-300 rounded-2xl p-6 text-center hover:border-pink-500 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt,.tsv,.vcf"
                  className="hidden"
                  onChange={handleCSVUpload}
                />
                <div className="text-4xl mb-3">📂</div>
                <h3 className="font-bold text-slate-700 text-lg mb-1">Upload Contacts (CSV, TXT, or WhatsApp Export)</h3>
                <p className="text-slate-500 text-sm mb-4">
                  Supports standard CSVs (<code className="bg-slate-100 px-1 rounded">phone, name, tags</code>), WhatsApp Group Exporters (<code className="bg-slate-100 px-1 rounded">Phone Number, Saved Name, Group Name</code>), or plain phone lists.
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadLoading}
                  className="bg-pink-600 hover:bg-pink-500 text-white font-bold px-6 py-2.5 rounded-xl transition-all disabled:opacity-50 shadow-md"
                >
                  {uploadLoading ? '⏳ Importing...' : '📁 Choose File (.csv / .txt)'}
                </button>
                <p className="text-xs text-slate-400 mt-3">
                  ✅ Supports 30,000+ contacts | Duplicates auto-skipped | Nigerian & international numbers auto-formatted (+234, +233, +260, +254...)
                </p>
              </div>

              {/* Sample format tabs */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">📋 Supported File Formats</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-[11px] font-bold text-slate-600 mb-1">1. Standard CSV</div>
                    <pre className="text-xs font-mono text-slate-700 bg-white border border-slate-200 rounded-lg p-2.5 overflow-x-auto">
{`phone,name,tags
08012345678,Chidinma Obi,customer
+2348098765432,Emeka Nwosu,lead
+260975766351,Kabwe Phiri,wholesale`}
                    </pre>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-600 mb-1">2. WhatsApp Group Export / Phone List</div>
                    <pre className="text-xs font-mono text-slate-700 bg-white border border-slate-200 rounded-lg p-2.5 overflow-x-auto">
{`Country Code,Phone Number,Public Display Name,Group Name
234,+2349064556107,Meshach,Smartbiz Coach
234,+2348154004068,Zechariah,Smartbiz Coach
+233 24 953 0086
+260 975766351`}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Add Single Contact */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <h3 className="font-bold text-slate-700 mb-4">➕ Add Single Contact</h3>
                <form onSubmit={handleAddContact} className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  <input
                    type="tel"
                    placeholder="Phone (+2348012345678)"
                    value={addPhone}
                    onChange={e => setAddPhone(e.target.value)}
                    className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-pink-400 outline-none"
                  />
                  <input
                    type="email"
                    placeholder="Email (optional)"
                    value={addEmail}
                    onChange={e => setAddEmail(e.target.value)}
                    className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-pink-400 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Name (optional)"
                    value={addName}
                    onChange={e => setAddName(e.target.value)}
                    className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-pink-400 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Tags (optional)"
                    value={addTags}
                    onChange={e => setAddTags(e.target.value)}
                    className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-pink-400 outline-none"
                  />
                  <button
                    type="submit"
                    className="bg-pink-600 hover:bg-pink-500 text-white font-bold px-4 py-2 rounded-xl transition-all text-sm cursor-pointer"
                  >
                    Add Contact
                  </button>
                </form>
              </div>

              {/* Contact List */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div>
                    <h3 className="font-bold text-slate-700">
                      Contacts ({contactsTotal.toLocaleString()} total)
                    </h3>
                    {stats && stats.max_contacts && stats.max_contacts < 999999 && (
                      <div className="mt-1 flex items-center gap-2">
                        <div className="w-32 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-pink-500 h-full rounded-full" 
                            style={{ width: `${Math.min(100, (contactsTotal / stats.max_contacts) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">
                          {contactsTotal} / {stats.max_contacts.toLocaleString()} limit
                        </span>
                        {contactsTotal >= stats.max_contacts && (
                          <button 
                            onClick={() => navigate('/dashboard/settings')} 
                            className="text-[10px] font-extrabold text-pink-600 hover:text-pink-700 underline"
                          >
                            Upgrade
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Search phone, name, email..."
                    value={contactSearch}
                    onChange={e => setContactSearch(e.target.value)}
                    className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm w-56 focus:ring-2 focus:ring-pink-400 outline-none"
                  />
                </div>
                {contacts.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <div className="text-4xl mb-3">👥</div>
                    <p className="font-semibold">No contacts yet</p>
                    <p className="text-sm">Upload a CSV or add manually above</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {contacts.map(c => (
                      <div key={c.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-gradient-to-br from-pink-500 to-rose-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {c.name ? c.name[0].toUpperCase() : (c.email ? c.email[0].toUpperCase() : (c.phone[3] || '#'))}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-700 text-sm">{c.name || 'Unknown'}</div>
                            <div className="text-xs text-slate-400 flex items-center gap-2">
                              <span>{c.phone}</span>
                              {c.email && <span className="text-indigo-600 font-medium">✉️ {c.email}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {c.tags && (
                            <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full">{c.tags}</span>
                          )}
                          {c.last_messaged_at && (
                            <span className="text-[10px] text-green-600">✅ Messaged</span>
                          )}
                          <button
                            onClick={() => handleDeleteContact(c.id)}
                            className="text-slate-300 hover:text-red-500 transition-colors text-sm ml-1 cursor-pointer"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {contactsTotal > 30 && (
                  <div className="p-3 text-center text-xs text-slate-400 border-t border-slate-100">
                    Showing 30 of {contactsTotal.toLocaleString()} contacts. Use search to find specific contacts.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════ CAMPAIGNS */}
          {activeTab === 'campaigns' && (
            <div className="space-y-5">
              {/* Create Campaign */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <h3 className="font-bold text-slate-800 text-lg mb-5">➕ Create New Campaign</h3>
                <form onSubmit={handleCreateCampaign} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">Campaign Name</label>
                      <input
                        type="text"
                        placeholder="e.g. July Launch Announcement"
                        value={newCampaignName}
                        onChange={e => setNewCampaignName(e.target.value)}
                        required
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-pink-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">Channel</label>
                      <div className="flex gap-2">
                        {(['WHATSAPP', 'SMS', 'EMAIL'] as const).map(ch => (
                          <button
                            key={ch}
                            type="button"
                            onClick={() => setNewCampaignChannel(ch)}
                            className={`flex-1 py-2 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                              newCampaignChannel === ch
                                ? ch === 'WHATSAPP'
                                  ? 'bg-green-600 text-white border-green-600'
                                  : ch === 'SMS'
                                  ? 'bg-pink-600 text-white border-pink-600'
                                  : 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {ch === 'WHATSAPP' ? '💬 WhatsApp' : ch === 'SMS' ? '📩 SMS' : '📧 Email'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {newCampaignChannel === 'EMAIL' && (
                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 space-y-3">
                      <h4 className="text-xs font-extrabold text-indigo-900 uppercase tracking-wider">📧 Email Campaign Settings</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-slate-600 mb-1 block">Email Subject Line</label>
                          <input
                            type="text"
                            placeholder="e.g. 🔥 Special 20% Off Weekend Sale for {{name}}!"
                            value={newCampaignEmailSubject}
                            onChange={e => setNewCampaignEmailSubject(e.target.value)}
                            required={newCampaignChannel === 'EMAIL'}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-600 mb-1 block">Sender Name (Shown in Inbox)</label>
                          <input
                            type="text"
                            placeholder="e.g. Amaka Fashion Store"
                            value={newCampaignEmailSenderName}
                            onChange={e => setNewCampaignEmailSenderName(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none bg-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 mb-1 block">Preview Snippet (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. Open now to claim your exclusive discount code before it expires."
                          value={newCampaignEmailPreviewText}
                          onChange={e => setNewCampaignEmailPreviewText(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none bg-white"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">
                      Daily Limit ({newCampaignDailyLimit} contacts/day)
                    </label>
                    <input
                      type="range"
                      min={50} max={200} step={10}
                      value={newCampaignDailyLimit}
                      onChange={e => setNewCampaignDailyLimit(Number(e.target.value))}
                      className="w-full accent-pink-600"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>50/day</span><span>200/day</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">📅 Schedule Date & Time (Optional)</label>
                      <input
                        type="datetime-local"
                        value={newCampaignScheduledAt}
                        onChange={e => setNewCampaignScheduledAt(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-pink-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">🏷️ Target Tags (Optional, comma-separated)</label>
                      <input
                        type="text"
                        placeholder="e.g. VIP, Customer, Lead"
                        value={newCampaignTargetTags}
                        onChange={e => setNewCampaignTargetTags(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-pink-400 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">
                      Quick Templates
                    </label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {MESSAGE_TEMPLATES.map(t => (
                        <button
                          key={t.label}
                          type="button"
                          onClick={() => setNewCampaignTemplate(t.text)}
                          className="bg-slate-100 hover:bg-pink-100 text-slate-700 hover:text-pink-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-pink-200"
                        >
                          {t.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setShowAiSuggestModal(true)}
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black px-3.5 py-1.5 rounded-lg transition-all shadow-md shadow-purple-600/15 flex items-center gap-1 hover:scale-105"
                      >
                        🤖 AI Suggest (Gemini)
                      </button>
                    </div>
                    <textarea
                      rows={8}
                      value={newCampaignTemplate}
                      onChange={e => setNewCampaignTemplate(e.target.value)}
                      placeholder="Write your message here. Use {{name}} for personalization."
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-pink-400 outline-none font-mono resize-none"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      💡 Use <code className="bg-slate-100 px-1 rounded">{'{{name}}'}</code> and it will be replaced with each contact's name automatically.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={creatingCampaign}
                    className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-pink-600/30 disabled:opacity-50"
                  >
                    {creatingCampaign ? '⏳ Creating...' : '🚀 Create Campaign'}
                  </button>
                </form>
              </div>

              {/* Existing Campaigns */}
              <div className="space-y-3">
                <h3 className="font-bold text-slate-700">Your Campaigns ({campaigns.length})</h3>
                {campaigns.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400">
                    <div className="text-4xl mb-3">📋</div>
                    <p>No campaigns yet. Create one above!</p>
                  </div>
                ) : (
                  campaigns.map(c => (
                    <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-5">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-slate-800">{c.name}</span>
                            <StatusBadge status={c.status} />
                          </div>
                          <div className="text-xs text-slate-400 flex flex-wrap gap-1.5 items-center mt-1">
                            <span>{c.channel === 'WHATSAPP' ? '💬 WhatsApp' : '📩 SMS'}</span>
                            <span>·</span>
                            <span>{c.daily_limit}/day limit</span>
                            {c.scheduled_at && (
                              <>
                                <span>·</span>
                                <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-bold">📅 {new Date(c.scheduled_at).toLocaleString()}</span>
                              </>
                            )}
                            {c.target_tags && (
                              <>
                                <span>·</span>
                                <span className="bg-pink-50 text-pink-700 px-1.5 py-0.5 rounded text-[10px] font-bold">🏷️ {c.target_tags}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <div className="font-bold text-slate-700">{c.sent_count.toLocaleString()}/{c.total_contacts.toLocaleString()}</div>
                          <div className="text-xs text-slate-400">sent</div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-slate-100 rounded-full h-2 mb-2">
                        <div
                          className="bg-gradient-to-r from-pink-500 to-rose-500 h-2 rounded-full transition-all"
                          style={{ width: `${c.progress_percent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>{c.progress_percent}% complete</span>
                        <span>{(c.total_contacts - c.sent_count).toLocaleString()} remaining</span>
                      </div>

                      <div className="flex gap-2 mt-3">
                        {c.channel === 'WHATSAPP' && (
                          <button
                            onClick={() => { setSelectedCampaign(c); setActiveTab('whatsapp'); }}
                            className="flex-1 bg-green-100 hover:bg-green-200 text-green-700 font-bold text-xs py-2 rounded-lg transition-colors"
                          >
                            💬 Generate WA Batch
                          </button>
                        )}
                        {c.channel === 'SMS' && (
                          <button
                            onClick={() => { setSmsCampaign(c); setActiveTab('sms'); }}
                            className="flex-1 bg-pink-100 hover:bg-pink-200 text-pink-700 font-bold text-xs py-2 rounded-lg transition-colors"
                          >
                            📩 Send SMS Batch
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════ WHATSAPP */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-5">
              {/* Campaign Selector */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <h3 className="font-bold text-slate-800 mb-4">💬 WhatsApp Batch Generator</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">Select Campaign</label>
                    <select
                      value={selectedCampaign?.id || ''}
                      onChange={e => {
                        const c = campaigns.find(c => c.id === Number(e.target.value));
                        setSelectedCampaign(c || null);
                        setWaBatch([]);
                      }}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-400 outline-none"
                    >
                      <option value="">— Choose a WhatsApp campaign —</option>
                      {campaigns.filter(c => c.channel === 'WHATSAPP').map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.sent_count}/{c.total_contacts} sent)</option>
                      ))}
                    </select>
                    {campaigns.filter(c => c.channel === 'WHATSAPP').length === 0 && (
                      <p className="text-xs text-slate-400 mt-1">No WhatsApp campaigns yet. <button onClick={() => setActiveTab('campaigns')} className="text-pink-600 underline">Create one →</button></p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">
                      Today's Batch Size ({waBatchSize} contacts) {stats?.max_batch_size && stats.max_batch_size < 200 && (
                        <span className="text-pink-600">({stats.plan} Limit: {stats.max_batch_size}/day)</span>
                      )}
                    </label>
                    <input
                      type="range"
                      min={10} max={stats?.max_batch_size || 200} step={10}
                      value={waBatchSize > (stats?.max_batch_size || 200) ? (stats?.max_batch_size || 200) : waBatchSize}
                      onChange={e => setWaBatchSize(Number(e.target.value))}
                      className="w-full accent-green-600 mt-2"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>10</span>
                      {stats?.plan === 'Free Plan' && (
                        <button onClick={() => navigate('/dashboard/settings')} className="text-pink-600 underline font-bold">Upgrade for 200/day</button>
                      )}
                      <span>{stats?.max_batch_size || 200}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleGenerateWABatch}
                  disabled={!selectedCampaign || waBatchLoading}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-green-600/20"
                >
                  {waBatchLoading ? '⏳ Preparing batch...' : `📋 Generate Today's Batch of ${waBatchSize}`}
                </button>
              </div>

              {/* Batch Results */}
              {waBatch.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                    <div>
                      <h3 className="font-bold text-slate-800">Today's Batch ({waBatch.length} contacts)</h3>
                      <p className="text-xs text-slate-400">
                        {sentPhones.size} sent · {waBatch.length - sentPhones.size} remaining · {batchRemaining} more after this
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={handleAutoSendCloudWA}
                        disabled={sendingCloudWA}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-lg transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        {sendingCloudWA ? 'Sending...' : '⚡ Auto-Send via WhatsApp API'}
                      </button>
                      <button
                        onClick={handleMarkAllSent}
                        className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer"
                      >
                        ✅ Mark All Sent
                      </button>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="px-4 py-2 bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${(sentPhones.size / waBatch.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-500">{Math.round((sentPhones.size / waBatch.length) * 100)}%</span>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-50 max-h-[500px] overflow-y-auto">
                    {waBatch.map((item, idx) => {
                      const isSent = sentPhones.has(item.phone);
                      return (
                        <div key={item.phone} className={`flex items-center gap-3 px-4 py-3 transition-colors ${isSent ? 'bg-green-50' : 'hover:bg-slate-50'}`}>
                          <div className="text-slate-400 text-xs w-6 flex-shrink-0">{idx + 1}</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-slate-700 text-sm truncate">{item.name}</div>
                            <div className="text-xs text-slate-400">{item.phone}</div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <a
                              href={item.whatsapp_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => !isSent && toggleSent(item.phone)}
                              className="bg-green-500 hover:bg-green-400 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                            >
                              <span>💬</span> Open
                            </a>
                            <button
                              onClick={() => toggleSent(item.phone)}
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                isSent ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300'
                              }`}
                            >
                              {isSent && '✓'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-4 border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-400">
                      💡 Tip: Click "Open" to open WhatsApp with the pre-typed message, then tap Send. Come back and click the checkbox to mark as sent.
                    </p>
                  </div>
                </div>
              )}

              {waBatch.length === 0 && !waBatchLoading && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-slate-400">
                  <div className="text-4xl mb-3">💬</div>
                  <p className="font-semibold">Select a campaign and click Generate to see today's batch</p>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════ SMS */}
          {activeTab === 'sms' && (
            <div className="space-y-5">
              {stats?.plan === 'Free Plan' ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center max-w-lg mx-auto shadow-sm my-6">
                  <div className="text-5xl mb-4">🔒</div>
                  <h3 className="font-extrabold text-slate-800 text-lg mb-2">Automated SMS is a Pro Feature</h3>
                  <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                    Automated SMS sending requires a Pro Plan or active AI credits. With Pro, you can send broadcast messages directly to your contacts for only <strong>2 credits per SMS</strong>.
                  </p>
                  <button
                    onClick={() => navigate('/dashboard/settings')}
                    className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-pink-600/25"
                  >
                    ⚡ Buy Credits / Go Pro
                  </button>
                </div>
              ) : (
                <>
                  {/* Termii Notice */}
                  <div className="bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-200 rounded-2xl p-5">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">📩</span>
                      <div>
                        <h3 className="font-bold text-pink-800 mb-1">SMS via Termii (Recommended for Nigeria)</h3>
                        <p className="text-pink-700 text-sm">
                          Termii is Nigeria's most affordable SMS provider (~₦2–4 per SMS). 
                          New accounts get free ₦200 credits (~50–100 free messages to test).
                        </p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <a
                            href="https://termii.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-pink-600 text-white font-bold text-xs px-4 py-2 rounded-lg hover:bg-pink-500 transition-colors"
                          >
                            🔗 Sign up at Termii.com
                          </a>
                          {stats && !stats.termii_configured && (
                            <span className="bg-amber-100 text-amber-700 font-bold text-xs px-4 py-2 rounded-lg">
                              ⚠️ API key not yet configured
                            </span>
                          )}
                          {stats?.termii_configured && (
                            <span className="bg-green-100 text-green-700 font-bold text-xs px-4 py-2 rounded-lg">
                              ✅ Termii configured & ready
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SMS Batch Sender */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6">
                    <h3 className="font-bold text-slate-800 mb-4">Send SMS Batch</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">Select SMS Campaign</label>
                        <select
                          value={smsCampaign?.id || ''}
                          onChange={e => {
                            const c = campaigns.find(c => c.id === Number(e.target.value));
                            setSmsCampaign(c || null);
                            setSmsResult(null);
                          }}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-pink-400 outline-none"
                        >
                          <option value="">— Choose an SMS campaign —</option>
                          {campaigns.filter(c => c.channel === 'SMS').map(c => (
                            <option key={c.id} value={c.id}>{c.name} ({c.sent_count}/{c.total_contacts} sent)</option>
                          ))}
                        </select>
                        {campaigns.filter(c => c.channel === 'SMS').length === 0 && (
                          <p className="text-xs text-slate-400 mt-1">
                            No SMS campaigns. <button onClick={() => setActiveTab('campaigns')} className="text-pink-600 underline">Create one →</button>
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">
                          Batch Size ({smsBatchSize} SMS)
                        </label>
                        <input
                          type="range"
                          min={10} max={100} step={10}
                          value={smsBatchSize}
                          onChange={e => setSmsBatchSize(Number(e.target.value))}
                          className="w-full accent-pink-600 mt-2"
                        />
                        <div className="flex justify-between text-xs text-slate-400 mt-1">
                          <span>10</span>
                          <span>Est. Cost: {smsBatchSize * (stats?.sms_credit_cost || 2)} AI Credits</span>
                          <span>100</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleSendSMSBatch}
                      disabled={!smsCampaign || smsSending}
                      className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-pink-600/20"
                    >
                      {smsSending ? '📡 Sending SMS messages...' : `📩 Send ${smsBatchSize} SMS Now`}
                    </button>

                    {/* SMS Result */}
                    {smsResult && (
                      <div className={`mt-4 p-4 rounded-xl ${smsResult.sent > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                        {smsResult.sent !== undefined ? (
                          <>
                            <p className="font-bold text-green-700 mb-1">✅ SMS Batch Complete!</p>
                            <div className="grid grid-cols-3 gap-3 text-center mt-2">
                              <div className="bg-white rounded-lg p-2">
                                <div className="text-lg font-black text-green-600">{smsResult.sent}</div>
                                <div className="text-xs text-slate-500">Sent</div>
                              </div>
                              <div className="bg-white rounded-lg p-2">
                                <div className="text-lg font-black text-red-500">{smsResult.failed}</div>
                                <div className="text-xs text-slate-500">Failed</div>
                              </div>
                              <div className="bg-white rounded-lg p-2">
                                <div className="text-lg font-black text-blue-600">{smsResult.total_sent_in_campaign}</div>
                                <div className="text-xs text-slate-500">Total in Campaign</div>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="font-bold text-red-700 mb-1">⚠️ Configuration Required</p>
                            <p className="text-red-600 text-sm">{smsResult.error}</p>
                            {smsResult.setup_guide && (
                              <p className="text-sm text-slate-600 mt-2">{smsResult.setup_guide}</p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Cost Calculator */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                    <h3 className="font-bold text-slate-700 mb-3">💰 SMS Credit Cost Estimator</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left border-b border-slate-200">
                            <th className="pb-2 font-bold text-slate-500 text-xs">Contacts</th>
                            <th className="pb-2 font-bold text-slate-500 text-xs">SMS Count</th>
                            <th className="pb-2 font-bold text-slate-500 text-xs">Credit Cost ({stats?.sms_credit_cost || 2} Credits/SMS)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {[[100, 100, 100 * (stats?.sms_credit_cost || 2)], [1000, 1000, 1000 * (stats?.sms_credit_cost || 2)], [5000, 5000, 5000 * (stats?.sms_credit_cost || 2)]].map(([contacts, sms, credits]) => (
                            <tr key={contacts}>
                              <td className="py-2 font-semibold text-slate-700">{contacts.toLocaleString()}</td>
                              <td className="py-2 text-slate-500">{sms.toLocaleString()} messages</td>
                              <td className="py-2 font-bold text-pink-600">{credits.toLocaleString()} Credits</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-slate-400 mt-3">
                      💡 Automated SMS is premium. You can broadcast to your WhatsApp contacts for FREE using the WhatsApp batch generator tab.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════ EMAIL */}
          {activeTab === 'email' && (
            <div className="space-y-5">
              {/* Email Broadcast Header Banner */}
              <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full filter blur-2xl" />
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-2xl border border-white/20 shadow-inner">
                      📧
                    </div>
                    <div>
                      <h3 className="font-extrabold text-lg text-white tracking-tight">
                        Branded HTML Email Marketing
                      </h3>
                      <p className="text-indigo-200 text-xs mt-1 max-w-xl leading-relaxed">
                        Send beautiful, high-converting HTML promotional emails, product launch announcements, and discount codes directly to your customers' inboxes. 
                        <strong> Cost: 1 BizCredit per email.</strong>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setNewCampaignChannel('EMAIL');
                        setActiveTab('campaigns');
                      }}
                      className="bg-white hover:bg-indigo-50 text-indigo-950 text-xs font-black px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      + Create Email Campaign
                    </button>
                  </div>
                </div>
              </div>

              {/* Email Campaign Selector & Dispatcher */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Configuration & Controls */}
                <div className="lg:col-span-6 space-y-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h4 className="font-extrabold text-slate-800 text-base mb-4 flex items-center gap-2">
                      <span>⚙️</span> Campaign & Batch Settings
                    </h4>

                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">
                          Select Email Campaign
                        </label>
                        <select
                          value={emailCampaign?.id || ''}
                          onChange={e => {
                            const c = campaigns.find(c => c.id === Number(e.target.value));
                            setEmailCampaign(c || null);
                            setEmailResult(null);
                          }}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-indigo-400 outline-none font-medium text-slate-800"
                        >
                          <option value="">— Choose an Email campaign —</option>
                          {campaigns.filter(c => c.channel === 'EMAIL').map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.sent_count}/{c.total_contacts} sent)
                            </option>
                          ))}
                        </select>
                        {campaigns.filter(c => c.channel === 'EMAIL').length === 0 && (
                          <p className="text-xs text-slate-400 mt-1.5">
                            No Email campaigns found. Click <button onClick={() => { setNewCampaignChannel('EMAIL'); setActiveTab('campaigns'); }} className="text-indigo-600 font-bold underline">Create one</button> to get started.
                          </p>
                        )}
                      </div>

                      {emailCampaign && (
                        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-bold">Subject:</span>
                            <span className="text-slate-800 font-semibold truncate max-w-[200px]">{emailCampaign.email_subject || 'No subject set'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-bold">Sender Name:</span>
                            <span className="text-slate-800 font-semibold">{emailCampaign.email_sender_name || user?.businessName || 'SmartBiz Merchant'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-bold">Target Contacts:</span>
                            <span className="text-indigo-600 font-bold">{emailCampaign.total_contacts} valid email contacts</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-bold">Status:</span>
                            <StatusBadge status={emailCampaign.status} />
                          </div>
                        </div>
                      )}

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                            Batch Dispatch Size
                          </label>
                          <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                            {emailBatchSize} Emails
                          </span>
                        </div>
                        <input
                          type="range"
                          min={5}
                          max={200}
                          step={5}
                          value={emailBatchSize}
                          onChange={e => setEmailBatchSize(Number(e.target.value))}
                          className="w-full accent-indigo-600"
                        />
                        <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-medium">
                          <span>5</span>
                          <span>Cost: <strong>{emailBatchSize} BizCredits</strong> (1 credit/email)</span>
                          <span>200</span>
                        </div>
                      </div>

                      <button
                        onClick={handleSendEmailBatch}
                        disabled={!emailCampaign || emailSending}
                        className="w-full bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 hover:from-indigo-500 hover:to-purple-600 text-white font-extrabold py-3.5 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                      >
                        {emailSending ? (
                          <>
                            <span className="animate-spin text-lg">⏳</span>
                            <span>Dispatching Email Broadcast...</span>
                          </>
                        ) : (
                          <>
                            <span>🚀</span>
                            <span>Send {emailBatchSize} Emails Now</span>
                          </>
                        )}
                      </button>

                      {/* Result Box */}
                      {emailResult && (
                        <div className={`p-4 rounded-xl text-xs ${emailResult.sent > 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}>
                          {emailResult.sent !== undefined ? (
                            <div className="space-y-2">
                              <p className="font-extrabold text-emerald-800 text-sm flex items-center gap-1.5">
                                <span>✅</span> Email Broadcast Complete!
                              </p>
                              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                                <div className="bg-white rounded-lg p-2 border border-emerald-100">
                                  <div className="text-lg font-black text-emerald-600">{emailResult.sent}</div>
                                  <div className="text-[10px] text-slate-500 font-bold">Delivered</div>
                                </div>
                                <div className="bg-white rounded-lg p-2 border border-emerald-100">
                                  <div className="text-lg font-black text-rose-500">{emailResult.failed}</div>
                                  <div className="text-[10px] text-slate-500 font-bold">Failed</div>
                                </div>
                                <div className="bg-white rounded-lg p-2 border border-emerald-100">
                                  <div className="text-lg font-black text-indigo-600">{emailResult.credits_deducted || 0}</div>
                                  <div className="text-[10px] text-slate-500 font-bold">Credits Used</div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p className="font-bold text-rose-800">⚠️ Send Failed</p>
                              <p className="text-rose-600 mt-0.5">{emailResult.error || 'Please check your configuration.'}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Personalization Tag Chips */}
                  <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4">
                    <p className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2">💡 Dynamic Smart Tags</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="bg-white px-2.5 py-1 rounded-lg border border-indigo-200 text-indigo-700 font-mono font-bold">
                        {'{{name}}'} <span className="text-slate-400 font-normal font-sans">➔ Customer Name</span>
                      </span>
                      <span className="bg-white px-2.5 py-1 rounded-lg border border-indigo-200 text-indigo-700 font-mono font-bold">
                        {'{{business_name}}'} <span className="text-slate-400 font-normal font-sans">➔ Your Brand</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Live Responsive Email Preview Mockup */}
                <div className="lg:col-span-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                      <span>👁️</span> Live Email Preview
                    </h4>
                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                      <button
                        onClick={() => setEmailPreviewDevice('desktop')}
                        className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                          emailPreviewDevice === 'desktop' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'
                        }`}
                      >
                        💻 Desktop
                      </button>
                      <button
                        onClick={() => setEmailPreviewDevice('mobile')}
                        className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                          emailPreviewDevice === 'mobile' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'
                        }`}
                      >
                        📱 Mobile
                      </button>
                    </div>
                  </div>

                  {/* Email Mockup Shell */}
                  <div
                    className={`mx-auto bg-slate-100 border border-slate-300 rounded-2xl overflow-hidden shadow-md transition-all ${
                      emailPreviewDevice === 'mobile' ? 'max-w-sm' : 'w-full'
                    }`}
                  >
                    {/* Mock Browser/Mail Header */}
                    <div className="bg-slate-800 text-white px-4 py-2.5 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                        <span className="text-slate-300 font-mono ml-2 text-[11px] truncate">
                          {emailCampaign?.email_subject || 'Special Update from ' + (user?.businessName || 'SmartBiz')}
                        </span>
                      </div>
                    </div>

                    {/* Email Inbox Metadata Header */}
                    <div className="bg-white p-3.5 border-b border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-800">
                          {emailCampaign?.email_sender_name || user?.businessName || 'SmartBiz Merchant'}
                        </span>
                        <span className="text-slate-400 text-[10px]">Just now</span>
                      </div>
                      <div className="text-slate-500 truncate text-[11px]">
                        <strong>To:</strong> Customer &lt;chidinma@example.com&gt;
                      </div>
                      {emailCampaign?.email_preview_text && (
                        <div className="text-slate-400 italic truncate text-[11px]">
                          {emailCampaign.email_preview_text}
                        </div>
                      )}
                    </div>

                    {/* Email Body Content */}
                    <div className="p-5 bg-white space-y-4">
                      {/* Business Header */}
                      <div className="bg-slate-900 text-white p-4 rounded-xl text-center shadow-sm">
                        <h2 className="text-base font-black tracking-tight">
                          {user?.businessName || 'SmartBiz Merchant'}
                        </h2>
                      </div>

                      {/* Rendered Body Copy */}
                      <div className="text-xs text-slate-700 leading-relaxed space-y-2 whitespace-pre-line font-sans">
                        {emailCampaign?.message_template
                          ? emailCampaign.message_template
                              .replace(/{{name}}/g, 'Chidinma')
                              .replace(/{{business_name}}/g, user?.businessName || 'Our Business')
                          : `Hello Chidinma,\n\nWe have exciting updates and exclusive promotional offers for you today!\n\nTap below to explore our products or place your order now.\n\nBest regards,\n${user?.businessName || 'Our Team'}`}
                      </div>

                      {/* Call to Action Button */}
                      <div className="text-center pt-2">
                        <span className="inline-block bg-indigo-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md">
                          Shop Products / Claim Offer ➔
                        </span>
                      </div>

                      {/* Footer */}
                      <div className="pt-4 border-t border-slate-100 text-center text-[10px] text-slate-400">
                        <p>Sent by {user?.businessName || 'SmartBiz Merchant'} via SmartBiz Operating System.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      {/* ── AI Suggest Message Modal ── */}
      {showAiSuggestModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowAiSuggestModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              ✕
            </button>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🤖</span>
              <h3 className="font-extrabold text-slate-800 text-lg">AI Message suggestion (Gemini)</h3>
            </div>
            <p className="text-slate-500 text-xs mb-4 leading-relaxed">
              Gemini will write a customized marketing message tailored specifically for your target audience, niche, and brand voice (using the details from your Brand Identity profile).
            </p>
            <form onSubmit={handleAISuggest} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">
                  Campaign Goal / Promotion Details
                </label>
                <textarea
                  rows={4}
                  value={aiPromptObjective}
                  onChange={e => setAiPromptObjective(e.target.value)}
                  placeholder="e.g. We are offering a 20% discount on all salon services this weekend only! Or: Inviting everyone to our new boutique launch at 12 Herbert Macaulay Way."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-pink-400 outline-none resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={generatingSuggestion}
                className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-pink-600/30 disabled:opacity-50"
              >
                {generatingSuggestion ? '⏳ Gemini is writing...' : '✍️ Generate Message Suggestion'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showCreditPrompt && (
        <CreditPromptModal
          isOpen={showCreditPrompt}
          onClose={() => setShowCreditPrompt(false)}
          onConfirm={() => {
            setShowCreditPrompt(false);
            navigate('/dashboard/settings');
          }}
          creditCost={2}
          featureLabel="AI Broadcast Message Craft"
          currentCredits={credits}
        />
      )}
    </div>
  );
};

export default MarketingAgent;
