import React, { useState, useEffect } from 'react';
import { RoadmapStep, BrandIdentity } from '../types';
import { Sparkles, CheckCircle2, ChevronRight, Globe, MessageCircle, Instagram, Linkedin, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import toast from 'react-hot-toast';

const DigitalRoadmap: React.FC = () => {
  const [steps, setSteps] = useState<RoadmapStep[]>([]);
  const [brand, setBrand] = useState<BrandIdentity | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getInitialSteps = (niche: string = 'Retail') => {
    const defaultSteps: RoadmapStep[] = [
      { id: '1', title: 'Set up WhatsApp Business Profile', description: 'Download the WhatsApp Business App and create a profile with your logo, address, and hours.', platform: 'WhatsApp', isCompleted: false },
    ];

    if (niche.toLowerCase().includes('property') || niche.toLowerCase().includes('real estate')) {
      return [
        ...defaultSteps,
        { id: '2', title: 'Verify Google Business Location', description: 'Ensure your office/listings appear on Google Maps for local searches.', platform: 'Google', isCompleted: false },
        { id: '3', title: 'Create TikTok Property Tours', description: 'Film short, high-energy walk-throughs of your listings.', platform: 'TikTok', isCompleted: false },
        { id: '4', title: 'Join Real Estate WhatsApp Groups', description: 'Connect with other agents and developers for property co-listing.', platform: 'WhatsApp', isCompleted: false },
        { id: '5', title: 'Optimize Facebook Marketplace', description: 'List your properties specifically on FB Marketplace for Lagos/Nigeria.', platform: 'Facebook', isCompleted: false },
      ];
    } else if (niche.toLowerCase().includes('service') || niche.toLowerCase().includes('consulting')) {
      return [
        ...defaultSteps,
        { id: '2', title: 'Optimize LinkedIn Professional Profile', description: 'Update your headline and experience to reflect your expertise.', platform: 'LinkedIn', isCompleted: false },
        { id: '3', title: 'Share "How-To" Content on TikTok', description: 'Establish authority by sharing 60-second tips related to your service.', platform: 'TikTok', isCompleted: false },
        { id: '4', title: 'Gather 3 Client Testimonials', description: 'Request video or text reviews to build trust with new leads.', platform: 'General', isCompleted: false },
        { id: '5', title: 'Set up Google Business Profile', description: 'Allow clients to find your services and leave professional reviews.', platform: 'Google', isCompleted: false },
      ];
    } else if (niche.toLowerCase().includes('b2b') || niche.toLowerCase().includes('wholesale')) {
      return [
        ...defaultSteps,
        { id: '2', title: 'Join Industry B2B Facebook Groups', description: 'Find groups where retailers source products and introduce your wholesale price.', platform: 'Facebook', isCompleted: false },
        { id: '3', title: 'Create a Digital Product Catalog', description: 'Use SmartBiz to create a linkable catalog for easy wholesale ordering.', platform: 'WhatsApp', isCompleted: false },
        { id: '4', title: 'LinkedIn Outreach Strategy', description: 'Connect with at least 10 retail store owners per week.', platform: 'LinkedIn', isCompleted: false },
        { id: '5', title: 'TikTok Logistics Behind-the-Scenes', description: 'Show your warehouse or packaging process to build wholesale trust.', platform: 'TikTok', isCompleted: false },
      ];
    }

    // Default Retail/Physical Roadmap
    return [
      ...defaultSteps,
      { id: '2', title: 'Create WhatsApp Product Catalog', description: 'Add at least 5 products with prices and descriptions to your Catalog.', platform: 'WhatsApp', isCompleted: false },
      { id: '3', title: 'TikTok Unboxing & Trends', description: 'Film unboxing videos and use trending Nigerian sounds.', platform: 'TikTok', isCompleted: false },
      { id: '4', title: 'Instagram Professional Feed', description: 'Post 3 high-quality photos of your best-selling items.', platform: 'Instagram', isCompleted: false },
      { id: '5', title: 'Google Maps Business Listing', description: 'Register on Google Maps so locals can find your physical shop.', platform: 'Google', isCompleted: false },
    ];
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const brandRes = await api.get('/api/brand/current/');
        setBrand(brandRes.data);
        
        const saved = localStorage.getItem('sb_roadmap');
        if (saved) {
            setSteps(JSON.parse(saved));
        } else {
            setSteps(getInitialSteps(brandRes.data.niche));
        }
      } catch (err) {
        setSteps(getInitialSteps());
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    localStorage.setItem('sb_roadmap', JSON.stringify(steps));
  }, [steps]);

  const toggleStep = (id: string) => {
    setSteps(steps.map(step => 
      step.id === id ? { ...step, isCompleted: !step.isCompleted } : step
    ));
  };

  const progress = Math.round((steps.filter(s => s.isCompleted).length / steps.length) * 100);

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'WhatsApp': return <MessageCircle className="w-4 h-4 text-emerald-500" />;
      case 'Facebook': return <Globe className="w-4 h-4 text-blue-600" />;
      case 'Google': return <MapPin className="w-4 h-4 text-rose-500" />;
      case 'TikTok': return <Video className="w-4 h-4 text-slate-900" />;
      case 'LinkedIn': return <Linkedin className="w-4 h-4 text-blue-700" />;
      case 'Instagram': return <Instagram className="w-4 h-4 text-pink-500" />;
      default: return <Sparkles className="w-4 h-4 text-amber-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto p-12 text-center">
        <Sparkles className="w-12 h-12 text-indigo-600 animate-pulse mx-auto mb-4" />
        <p className="text-slate-500 font-medium">Personalizing your roadmap...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in pb-20">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Marketing Roadmap</h2>
          <p className="text-slate-500 text-sm mt-1">Growth steps tailored for your <span className="text-indigo-600 font-bold">{brand?.niche || 'Business'}</span>.</p>
        </div>
        <button 
          onClick={() => {
            if (confirm('Reset roadmap to default for your niche?')) {
              setSteps(getInitialSteps(brand?.niche));
              toast.success('Roadmap reset!');
            }
          }}
          className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
          title="Reset Roadmap"
        >
          <Sparkles className="w-5 h-5" />
        </button>
      </div>

      {/* Progress Card */}
      <div className="bg-slate-900 rounded-[32px] p-8 text-white mb-10 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-end mb-6">
            <div>
              <p className="text-indigo-300 font-bold text-[10px] uppercase tracking-widest mb-1">Current Progress</p>
              <h3 className="text-5xl font-black">{progress}%</h3>
            </div>
            <div className="text-5xl">🏆</div>
          </div>
          <div className="w-full bg-white/10 rounded-full h-3">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="bg-indigo-500 h-3 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]"
            ></motion.div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {steps.map((step, index) => (
          <motion.div 
            key={step.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => toggleStep(step.id)}
            className={`
              relative p-6 rounded-[28px] border-2 transition-all cursor-pointer group
              ${step.isCompleted 
                ? 'bg-emerald-50/50 border-emerald-100 shadow-none' 
                : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5'
              }
            `}
          >
            <div className="flex items-start gap-6">
              <div className={`
                w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black shrink-0 transition-all
                ${step.isCompleted ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600'}
              `}>
                {step.isCompleted ? <CheckCircle2 className="w-6 h-6" /> : index + 1}
              </div>
              
              <div className="flex-1 pt-1">
                <div className="flex justify-between items-center mb-1">
                  <h4 className={`text-lg font-bold ${step.isCompleted ? 'text-emerald-900 opacity-60' : 'text-slate-800'}`}>
                    {step.title}
                  </h4>
                  <div className="flex items-center gap-2 bg-white/50 px-3 py-1 rounded-full border border-slate-100 shadow-sm">
                    {getPlatformIcon(step.platform)}
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                       {step.platform}
                    </span>
                  </div>
                </div>
                <p className={`text-sm leading-relaxed ${step.isCompleted ? 'text-emerald-700 opacity-60' : 'text-slate-500 font-medium'}`}>
                  {step.description}
                </p>
              </div>
              <ChevronRight className={`w-5 h-5 self-center transition-transform ${step.isCompleted ? 'text-emerald-300' : 'text-slate-300 group-hover:translate-x-1 group-hover:text-indigo-500'}`} />
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {progress === 100 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-12 p-10 bg-indigo-600 rounded-[40px] text-center text-white shadow-2xl shadow-indigo-200"
          >
            <div className="text-6xl mb-6">👑</div>
            <h3 className="text-3xl font-black mb-2">Digital King/Queen!</h3>
            <p className="text-indigo-100 font-medium opacity-80">You've mastered the roadmap. Your business is now optimized for the Nigerian digital ecosystem.</p>
            <button 
                onClick={() => window.open('https://wa.me/SmartBizCoach', '_blank')}
                className="mt-8 bg-white text-indigo-600 px-8 py-4 rounded-2xl font-black text-sm hover:bg-indigo-50 transition-all shadow-xl"
            >
                Get Advanced Coaching
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DigitalRoadmap;
gitalRoadmap;