
import React from 'react';
import { billingService } from '../services/billingService';
import { toast } from 'react-hot-toast';

interface ShareActionsProps {
  text: string;
  url?: string;
  title?: string;
}

const ShareActions: React.FC<ShareActionsProps> = ({ text, url, title = "Check this out!" }) => {
  const encodedText = encodeURIComponent(text);
  const encodedUrl = url ? encodeURIComponent(url) : '';

  const handleShareClick = async () => {
    try {
      const reward = await billingService.rewardShare(url || 'general', title);
      if (reward.earned > 0) {
        toast.success(`🎉 +${reward.earned} SmartBiz Credits earned for sharing! (Balance: ${reward.credits})`, { icon: '⚡' });
        window.dispatchEvent(new CustomEvent('smartbiz_credits_updated', { detail: reward.credits }));
      }
    } catch (e) {
      console.warn("Share reward notice:", e);
    }
  };

  const platforms = [
    {
      name: 'WhatsApp',
      icon: '💬',
      color: 'bg-green-500 hover:bg-green-600',
      href: encodedUrl ? `https://wa.me/?text=${encodedText}%20${encodedUrl}` : `https://wa.me/?text=${encodedText}`
    },
    {
      name: 'Facebook',
      icon: '👍',
      color: 'bg-blue-600 hover:bg-blue-700',
      href: encodedUrl ? `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}` : `https://www.facebook.com/sharer/sharer.php?quote=${encodedText}`
    },
    {
      name: 'Twitter / X',
      icon: '🐦',
      color: 'bg-black hover:bg-gray-800',
      href: encodedUrl ? `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}` : `https://twitter.com/intent/tweet?text=${encodedText}`
    },
    {
      name: 'LinkedIn',
      icon: '💼',
      color: 'bg-blue-700 hover:bg-blue-800',
      href: encodedUrl ? `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodeURIComponent(title)}&summary=${encodedText}` : `https://www.linkedin.com/sharing/share-offsite/?text=${encodedText}`
    }
  ];

  return (
    <div className="flex flex-col gap-2 mt-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Share to Platform</p>
        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded-full">+5 Credits Reward ⚡</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {platforms.map((p) => (
          <a
            key={p.name}
            href={p.href}
            onClick={handleShareClick}
            target="_blank"
            rel="noopener noreferrer"
            className={`${p.color} text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2`}
          >
            <span>{p.icon}</span>
            <span className="hidden sm:inline">{p.name}</span>
          </a>
        ))}
      </div>
    </div>
  );
};

export default ShareActions;