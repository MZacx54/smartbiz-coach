import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'SUCCESS' | 'ERROR' | 'INFO';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getStyles = () => {
    switch (type) {
      case 'SUCCESS': return 'bg-gray-900 text-white border-l-4 border-green-500';
      case 'ERROR': return 'bg-white text-red-600 border-l-4 border-red-500 shadow-xl';
      case 'INFO': return 'bg-white text-gray-800 border-l-4 border-indigo-500 shadow-xl';
      default: return 'bg-gray-900 text-white';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'SUCCESS': return '✨';
      case 'ERROR': return '⚠️';
      case 'INFO': return 'ℹ️';
      default: return '';
    }
  };

  return (
    <div className={`fixed bottom-6 right-6 md:top-6 md:bottom-auto md:right-6 max-w-sm w-full p-4 rounded-lg shadow-2xl flex items-center gap-3 transform transition-all duration-300 animate-in slide-in-from-right z-50 ${getStyles()}`}>
      <div className="text-xl">{getIcon()}</div>
      <div className="flex-1 font-medium text-sm">{message}</div>
      <button onClick={onClose} className="opacity-70 hover:opacity-100 font-bold ml-2">✕</button>
    </div>
  );
};

export default Toast;