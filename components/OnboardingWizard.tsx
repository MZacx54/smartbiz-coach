
import React, { useState } from 'react';
import { User } from '../types';

interface OnboardingWizardProps {
  user: User;
  onComplete: (updatedUser: User) => void;
}

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ user, onComplete }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    location: '',
    phone: '',
    currency: 'NGN',
    logo: ''
  });

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else {
      onComplete({
        ...user,
        location: formData.location,
        phone: formData.phone,
        currency: formData.currency,
        logo: formData.logo,
        hasOnboarded: true
      });
    }
  };

  const renderStep = () => {
    switch(step) {
      case 1:
        return (
          <div className="space-y-4 animate-in fade-in">
             <h3 className="text-xl font-bold text-gray-900">Let's set up your Business Profile</h3>
             <p className="text-gray-500 text-sm">Where are you located?</p>
             <input 
               className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-green-500"
               placeholder="e.g. Ikeja, Lagos"
               value={formData.location}
               onChange={e => setFormData({...formData, location: e.target.value})}
             />
             <p className="text-gray-500 text-sm">Business Phone Number</p>
             <input 
               className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-green-500"
               placeholder="080..."
               value={formData.phone}
               onChange={e => setFormData({...formData, phone: e.target.value})}
             />
          </div>
        );
      case 2:
        return (
          <div className="space-y-4 animate-in fade-in">
             <h3 className="text-xl font-bold text-gray-900">Currency & Preferences</h3>
             <p className="text-gray-500 text-sm">Preferred Currency</p>
             <div className="flex gap-4">
               <button 
                 onClick={() => setFormData({...formData, currency: 'NGN'})}
                 className={`flex-1 p-4 border rounded-lg font-bold ${formData.currency === 'NGN' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white'}`}
               >
                 ₦ Naira (NGN)
               </button>
               <button 
                 onClick={() => setFormData({...formData, currency: 'USD'})}
                 className={`flex-1 p-4 border rounded-lg font-bold ${formData.currency === 'USD' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white'}`}
               >
                 $ Dollar (USD)
               </button>
             </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4 animate-in fade-in text-center">
             <div className="text-6xl mb-4">🚀</div>
             <h3 className="text-xl font-bold text-gray-900">You're All Set!</h3>
             <p className="text-gray-600">Your profile is ready. Let's grow your business.</p>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="flex justify-between items-center mb-8">
           <div className="flex gap-2">
             {[1, 2, 3].map(i => (
               <div key={i} className={`w-3 h-3 rounded-full ${i <= step ? 'bg-green-600' : 'bg-gray-200'}`}></div>
             ))}
           </div>
           <button onClick={() => onComplete({...user, hasOnboarded: true})} className="text-xs text-gray-400 font-bold">SKIP</button>
        </div>

        {renderStep()}

        <button 
          onClick={handleNext}
          className="w-full mt-8 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition-colors shadow-lg"
        >
          {step === 3 ? 'Go to Dashboard' : 'Next Step →'}
        </button>
      </div>
    </div>
  );
};

export default OnboardingWizard;
