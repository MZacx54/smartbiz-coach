import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '../types';

interface OnboardingWizardProps {
  user: User;
  onComplete: (updatedUser: User) => void;
}

const INDUSTRIES = [
  { value: 'Fashion & Textiles', icon: '👗' },
  { value: 'Food & Beverages', icon: '🍲' },
  { value: 'Technology & ICT', icon: '💻' },
  { value: 'Agriculture', icon: '🌾' },
  { value: 'Retail & Commerce', icon: '🛒' },
  { value: 'Beauty & Wellness', icon: '💅' },
  { value: 'Education', icon: '📚' },
  { value: 'Manufacturing', icon: '🏭' },
  { value: 'Creative Arts', icon: '🎨' },
  { value: 'Real Estate', icon: '🏠' },
  { value: 'Logistics & Transport', icon: '🚚' },
  { value: 'Other', icon: '🏢' },
];

const GOALS = [
  { value: 'Get funding / grants', icon: '💰' },
  { value: 'Build my brand online', icon: '✨' },
  { value: 'Create marketing content', icon: '📱' },
  { value: 'Track my debtors', icon: '📒' },
  { value: 'Write a business plan', icon: '📄' },
  { value: 'Register my business (CAC)', icon: '⚖️' },
  { value: 'Manage inventory', icon: '📦' },
  { value: 'Close more sales', icon: '🤝' },
];

const steps = [
  { title: 'Welcome to SmartBiz Coach!', subtitle: 'Let\'s personalize your experience in just 3 quick steps.' },
  { title: 'Tell us about your business', subtitle: 'This helps us tailor AI suggestions and content to your industry.' },
  { title: 'What are your main goals?', subtitle: 'Select all that apply — we\'ll highlight the most useful tools for you.' },
  { title: 'You\'re all set! 🎉', subtitle: 'Your personalized dashboard is ready. Let\'s build something great.' },
];

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ user, onComplete }) => {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [formData, setFormData] = useState({
    location: '',
    phone: '',
    industry: '',
    businessName: user.businessName || '',
    goals: [] as string[],
  });

  const goNext = () => {
    setDirection(1);
    setStep(s => s + 1);
  };

  const goPrev = () => {
    setDirection(-1);
    setStep(s => s - 1);
  };

  const toggleGoal = (goal: string) => {
    setFormData(prev => ({
      ...prev,
      goals: prev.goals.includes(goal) ? prev.goals.filter(g => g !== goal) : [...prev.goals, goal],
    }));
  };

  const handleComplete = () => {
    onComplete({
      ...user,
      location: formData.location,
      phone: formData.phone,
      businessName: formData.businessName,
      hasOnboarded: true,
    });
  };

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="text-center space-y-6">
            <motion.div className="text-7xl" animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}>🚀</motion.div>
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 mb-2 font-heading">Welcome, {user.businessName || 'Entrepreneur'}!</h2>
              <p className="text-slate-500">We're excited to have you. In 3 quick steps, we'll personalize SmartBiz Coach for your business so you get the most value from day one.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-left pt-2">
              {[
                ['✨', 'AI-Powered Tools', 'Built for Nigeria'],
                ['💰', 'Find Grants', 'BOI, TEF & more'],
                ['📒', 'Gbege Book', 'Track your debtors'],
                ['📄', 'Business Plans', 'Bank-quality in minutes'],
              ].map(([icon, title, sub], i) => (
                <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <span className="text-2xl">{icon}</span>
                  <div>
                    <div className="font-bold text-slate-800 text-sm">{title}</div>
                    <div className="text-xs text-slate-400">{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Business Name</label>
              <input
                className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all bg-slate-50 font-medium text-slate-800"
                placeholder="e.g. Chidinma's Boutique"
                value={formData.businessName}
                onChange={e => setFormData({ ...formData, businessName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Your Location</label>
              <input
                className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all bg-slate-50 text-slate-800"
                placeholder="e.g. Ikeja, Lagos"
                value={formData.location}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">WhatsApp Business Number</label>
              <input
                className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all bg-slate-50 text-slate-800"
                placeholder="080..."
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2.5">Business Industry</label>
              <div className="grid grid-cols-3 gap-2">
                {INDUSTRIES.map(ind => (
                  <button
                    key={ind.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, industry: ind.value })}
                    className={`p-2.5 rounded-xl border-2 text-center transition-all text-xs font-medium ${
                      formData.industry === ind.value
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200'
                    }`}
                  >
                    <div className="text-xl mb-1">{ind.icon}</div>
                    <div className="leading-tight">{ind.value}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">Select all that match your business goals:</p>
            <div className="grid grid-cols-2 gap-3">
              {GOALS.map(g => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => toggleGoal(g.value)}
                  className={`p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${
                    formData.goals.includes(g.value)
                      ? 'border-green-500 bg-green-50'
                      : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                  }`}
                >
                  <span className="text-2xl flex-shrink-0">{g.icon}</span>
                  <span className={`text-xs font-semibold leading-tight ${formData.goals.includes(g.value) ? 'text-green-700' : 'text-slate-600'}`}>{g.value}</span>
                  {formData.goals.includes(g.value) && (
                    <span className="ml-auto text-green-500 text-xs flex-shrink-0">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="text-center space-y-6 py-4">
            <motion.div className="text-7xl" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}>🎉</motion.div>
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 font-heading mb-2">You're all set!</h2>
              <p className="text-slate-500">Your personalized SmartBiz dashboard is ready. Based on your goals, we've highlighted the best tools for you.</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-left space-y-2">
              <div className="text-xs font-bold text-green-700 uppercase tracking-wider mb-3">Your profile summary</div>
              {formData.businessName && <div className="flex items-center gap-2 text-sm text-slate-700"><span>🏢</span> {formData.businessName}</div>}
              {formData.location && <div className="flex items-center gap-2 text-sm text-slate-700"><span>📍</span> {formData.location}</div>}
              {formData.industry && <div className="flex items-center gap-2 text-sm text-slate-700"><span>💼</span> {formData.industry}</div>}
              {formData.goals.length > 0 && (
                <div className="flex items-start gap-2 text-sm text-slate-700">
                  <span>🎯</span>
                  <span>{formData.goals.slice(0, 3).join(', ')}{formData.goals.length > 3 ? ` +${formData.goals.length - 3} more` : ''}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 justify-center text-xs text-slate-400">
              <span>⚡</span> You get free daily usage on most AI tools. No credit card needed.
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const totalSteps = 4;
  const progress = ((step) / (totalSteps - 1)) * 100;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-4">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow">S</div>
              <span className="font-bold text-slate-800 text-sm">SmartBiz Coach</span>
            </div>
            <button
              onClick={() => onComplete({
                ...user,
                location: user.location || 'Lagos, Nigeria',
                phone: user.phone || '08123456789',
                businessName: user.businessName || 'SmartBiz Merchant Ltd',
                hasOnboarded: true
              })}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-bold transition-colors"
            >
              Express Onboarding (Skip) →
            </button>
          </div>

          {/* Progress bar */}
          <div className="mb-2">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-semibold text-slate-500">Step {step + 1} of {totalSteps}</span>
              <span className="text-xs font-bold text-green-600">{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 pb-4" style={{ minHeight: '340px', maxHeight: '55vh', overflowY: 'auto' }}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer buttons */}
        <div className="px-8 pb-8 pt-4 border-t border-slate-100">
          <div className="flex gap-3">
            {step > 0 && step < totalSteps - 1 && (
              <button
                onClick={goPrev}
                className="flex-1 py-3 border-2 border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-colors"
              >
                ← Back
              </button>
            )}
            {step < totalSteps - 1 ? (
              <button
                onClick={goNext}
                className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-green-600/20 hover:-translate-y-0.5"
              >
                {step === 0 ? 'Let\'s Go →' : 'Continue →'}
              </button>
            ) : (
              <button
                onClick={handleComplete}
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl transition-all shadow-lg hover:-translate-y-0.5"
              >
                🚀 Go to My Dashboard
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default OnboardingWizard;
