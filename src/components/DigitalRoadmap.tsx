import React, { useState, useEffect } from 'react';
import { RoadmapStep, BrandIdentity } from '../types';
import { Sparkles, CheckCircle2, ChevronRight, Globe, MessageCircle, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { toast } from 'react-hot-toast';

// Custom SVG components for missing lucide icons
const InstagramIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
  </svg>
);

const LinkedInIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.475-2.236-1.986-2.236-1.081 0-1.722.722-2.006 1.419-.103.249-.129.597-.129.946v5.44h-3.562s.043-8.811 0-9.728h3.562v1.381c-.009.015-.021.029-.031.042h.031v-.042c.425-.654 1.185-1.586 2.882-1.586 2.105 0 3.684 1.375 3.684 4.331v5.602zM5.337 8.855c-1.144 0-1.915-.758-1.915-1.704 0-.951.77-1.704 1.959-1.704 1.188 0 1.914.753 1.939 1.704 0 .946-.751 1.704-1.983 1.704zm1.581 11.597H3.635V9.724h3.283v10.728zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const MapPinIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);

type PlatformType = "Facebook" | "WhatsApp" | "Google" | "General" | "TikTok" | "LinkedIn" | "Instagram";

const DigitalRoadmap: React.FC = () => {
  const [steps, setSteps] = useState<RoadmapStep[]>([]);
  const [brand, setBrand] = useState<BrandIdentity | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getInitialSteps = (niche: string = 'Retail'): RoadmapStep[] => {
    const defaultSteps: RoadmapStep[] = [
      { id: '1', title: 'Set up WhatsApp Business Profile', description: 'Download the WhatsApp Business App and create a profile with your logo, address, and hours.', platform: 'WhatsApp' as PlatformType, isCompleted: false },
    ];

    if (niche.toLowerCase().includes('property') || niche.toLowerCase().includes('real estate')) {
      return [
        ...defaultSteps,
        { id: '2', title: 'Verify Google Business Location', description: 'Ensure your office/listings appear on Google Maps for local searches.', platform: 'Google' as PlatformType, isCompleted: false },
        { id: '3', title: 'Create TikTok Property Tours', description: 'Film short, high-energy walk-throughs of your listings.', platform: 'TikTok' as PlatformType, isCompleted: false },
        { id: '4', title: 'Join Real Estate WhatsApp Groups', description: 'Connect with other agents and developers for property co-listing.', platform: 'WhatsApp' as PlatformType, isCompleted: false },
        { id: '5', title: 'Optimize Facebook Marketplace', description: 'List your properties specifically on FB Marketplace for Lagos/Nigeria.', platform: 'Facebook' as PlatformType, isCompleted: false },
      ];
    } else if (niche.toLowerCase().includes('service') || niche.toLowerCase().includes('consulting')) {
      return [
        ...defaultSteps,
        { id: '2', title: 'Optimize LinkedIn Professional Profile', description: 'Update your headline and experience to reflect your expertise.', platform: 'LinkedIn' as PlatformType, isCompleted: false },
        { id: '3', title: 'Share "How-To" Content on TikTok', description: 'Establish authority by sharing 60-second tips related to your service.', platform: 'TikTok' as PlatformType, isCompleted: false },
        { id: '4', title: 'Gather 3 Client Testimonials', description: 'Request video or text reviews to build trust with new leads.', platform: 'General' as PlatformType, isCompleted: false },
        { id: '5', title: 'Set up Google Business Profile', description: 'Allow clients to find your services and leave professional reviews.', platform: 'Google' as PlatformType, isCompleted: false },
      ];
    } else if (niche.toLowerCase().includes('b2b') || niche.toLowerCase().includes('wholesale')) {
      return [
        ...defaultSteps,
        { id: '2', title: 'Join Industry B2B Facebook Groups', description: 'Find groups where retailers source products and introduce your wholesale price.', platform: 'Facebook' as PlatformType, isCompleted: false },
        { id: '3', title: 'Create a Digital Product Catalog', description: 'Use SmartBiz to create a linkable catalog for easy wholesale ordering.', platform: 'WhatsApp' as PlatformType, isCompleted: false },
        { id: '4', title: 'Post Product Samples on Instagram', description: 'Showcase your best sellers with high-quality photos and Reels.', platform: 'Instagram' as PlatformType, isCompleted: false },
        { id: '5', title: 'Set up Payment on WhatsApp', description: 'Enable one-click payment links for seamless wholesale orders.', platform: 'WhatsApp' as PlatformType, isCompleted: false },
      ];
    }
    return defaultSteps;
  };

  useEffect(() => {
    const fetchBrand = async () => {
      try {
        const response = await api.get('/api/brand/current/');
        setBrand(response.data);
        const initialSteps = getInitialSteps(response.data.niche);
        setSteps(initialSteps as RoadmapStep[]);
      } catch (err) {
        console.error('Error fetching brand:', err);
        const initialSteps = getInitialSteps();
        setSteps(initialSteps as RoadmapStep[]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBrand();
  }, []);

  const toggleStep = (id: string) => {
    setSteps(steps.map(step =>
      step.id === id ? { ...step, isCompleted: !step.isCompleted } : step
    ));
  };

  const getPlatformIcon = (platform: PlatformType) => {
    switch (platform) {
      case 'Facebook': return <Globe className="w-4 h-4 text-blue-600" />;
      case 'WhatsApp': return <MessageCircle className="w-4 h-4 text-green-600" />;
      case 'Google': return <Globe className="w-4 h-4 text-yellow-600" />;
      case 'TikTok': return <Video className="w-4 h-4 text-black" />;
      case 'LinkedIn': return <LinkedInIcon className="w-4 h-4 text-blue-700" />;
      case 'Instagram': return <InstagramIcon className="w-4 h-4 text-pink-600" />;
      default: return <Sparkles className="w-4 h-4 text-indigo-600" />;
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading roadmap...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 rounded-2xl text-white"
      >
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-8 h-8" />
          <h1 className="text-4xl font-black">Digital Marketing Roadmap</h1>
        </div>
        <p className="text-indigo-100 text-lg">
          {brand?.niche} business growth strategy tailored for {brand?.businessName}
        </p>
      </motion.div>

      {/* Progress */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-900">Progress</h3>
          <span className="text-sm font-semibold text-indigo-600">
            {steps.filter(s => s.isCompleted).length}/{steps.length} completed
          </span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(steps.filter(s => s.isCompleted).length / steps.length) * 100}%` }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full"
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        <AnimatePresence>
          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-6 rounded-xl border-2 transition-all cursor-pointer ${
                step.isCompleted
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-white border-slate-200 hover:border-indigo-300'
              }`}
              onClick={() => toggleStep(step.id)}
            >
              <div className="flex items-start gap-4">
                <button
                  className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    step.isCompleted
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'border-slate-300 hover:border-indigo-500'
                  }`}
                >
                  {step.isCompleted && <CheckCircle2 className="w-5 h-5 text-white" />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {getPlatformIcon(step.platform)}
                    <h3 className={`font-bold text-lg ${step.isCompleted ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-slate-600 text-sm mb-3">{step.description}</p>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-600">
                    <MapPinIcon className="w-3 h-3" />
                    {step.platform}
                  </div>
                </div>

                {step.isCompleted && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex-shrink-0"
                  >
                    <div className="bg-emerald-100 px-3 py-1 rounded-full text-xs font-bold text-emerald-700">
                      ✓ Done
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* CTA */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => toast.success('Roadmap saved to your profile!')}
        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-4 rounded-xl hover:shadow-lg transition-all"
      >
        <ChevronRight className="w-5 h-5 inline mr-2" />
        Save & Track Progress
      </motion.button>
    </div>
  );
};

export default DigitalRoadmap;
