
import React from 'react';

interface ShareActionsProps {
  text: string;
  url?: string;
  title?: string;
}

const ShareActions: React.FC<ShareActionsProps> = ({ text, url = window.location.href, title = "Check this out!" }) => {
  const encodedText = encodeURIComponent(text);
  const encodedUrl = encodeURIComponent(url);

  const platforms = [
    {
      name: 'WhatsApp',
      icon: '💬',
      color: 'bg-green-500 hover:bg-green-600',
      href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`
    },
    {
      name: 'Facebook',
      icon: '👍',
      color: 'bg-blue-600 hover:bg-blue-700',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`
    },
    {
      name: 'Twitter / X',
      icon: '🐦',
      color: 'bg-black hover:bg-gray-800',
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`
    },
    {
      name: 'LinkedIn',
      icon: '💼',
      color: 'bg-blue-700 hover:bg-blue-800',
      href: `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodeURIComponent(title)}&summary=${encodedText}`
    }
  ];

  return (
    <div className="flex flex-col gap-2 mt-4">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Share to Platform</p>
      <div className="flex flex-wrap gap-2">
        {platforms.map((p) => (
          <a
            key={p.name}
            href={p.href}
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