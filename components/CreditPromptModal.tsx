import React from 'react';
import { useNavigate } from 'react-router-dom';

interface CreditPromptModalProps {
  isOpen: boolean;
  featureLabel: string;
  creditCost: number;
  currentCredits: number;
  onConfirm: () => void;
  onClose: () => void;
}

const CreditPromptModal: React.FC<CreditPromptModalProps> = ({
  isOpen,
  featureLabel,
  creditCost,
  currentCredits,
  onConfirm,
  onClose,
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const hasEnoughCredits = currentCredits >= creditCost;

  // Auto-confirm if user has enough credits to avoid interrupting workflow with credit deduction prompt
  if (hasEnoughCredits) {
    onConfirm();
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative border border-gray-100 text-center animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors font-bold text-lg"
        >
          ✕
        </button>

        <div className="text-4xl mb-3">🪙</div>
        <h3 className="text-lg font-extrabold text-gray-900 mb-2">Insufficient Credits</h3>
        <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed mb-6">
          You need <strong>{creditCost} credits</strong> to run <strong>{featureLabel}</strong>, 
          but you only have <strong>{currentCredits} credits</strong> left in your wallet.
        </p>

        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mb-6">
          <div className="flex gap-2 text-left">
            <span className="text-base">💡</span>
            <div className="text-[11px] text-emerald-900 leading-normal">
              To continue, please top up your wallet. Credit packs start as cheap as <strong>₦300</strong> for 30 credits!
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onClose();
              navigate('/dashboard/settings');
            }}
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all active:scale-95 shadow-md shadow-emerald-600/15"
          >
            Top Up Wallet 💳
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreditPromptModal;
