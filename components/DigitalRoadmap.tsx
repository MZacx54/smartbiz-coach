
import React, { useState, useEffect } from 'react';
import { RoadmapStep } from '../types';

const DigitalRoadmap: React.FC = () => {
  const [steps, setSteps] = useState<RoadmapStep[]>(() => {
    const saved = localStorage.getItem('sb_roadmap');
    if (saved) return JSON.parse(saved);
    
    // Default Nigerian Marketing Roadmap
    return [
      {
        id: '1',
        title: 'Set up WhatsApp Business Profile',
        description: 'Download the WhatsApp Business App and create a profile with your logo, address, and hours.',
        platform: 'WhatsApp',
        isCompleted: false
      },
      {
        id: '2',
        title: 'Create WhatsApp Product Catalog',
        description: 'Add at least 5 products with prices and descriptions to your Catalog.',
        platform: 'WhatsApp',
        isCompleted: false
      },
      {
        id: '3',
        title: 'Create Facebook Business Page',
        description: 'Set up a page linked to your personal account. Use the Brand Kit cover image.',
        platform: 'Facebook',
        isCompleted: false
      },
      {
        id: '4',
        title: 'Claim Google Business Profile',
        description: 'Register on Google Maps so locals can find you. Verify your phone number.',
        platform: 'Google',
        isCompleted: false
      },
      {
        id: '5',
        title: 'Join 3 Relevant Facebook Groups',
        description: 'Find "Lagos Market" or niche groups and introduce your business.',
        platform: 'Facebook',
        isCompleted: false
      },
      {
        id: '6',
        title: 'Run your first N1,000 Instagram Ad',
        description: 'Boost a high-quality post for 24 hours to test engagement.',
        platform: 'General',
        isCompleted: false
      }
    ];
  });

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
    switch(platform) {
      case 'WhatsApp': return '💬';
      case 'Facebook': return '👍';
      case 'Google': return '📍';
      default: return '🚀';
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Digital Marketing Roadmap 🗺️</h2>
        <p className="text-gray-600 text-sm mt-2">Step-by-step guide to dominating the Nigerian online market.</p>
      </div>

      {/* Progress Card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white mb-8 shadow-lg">
        <div className="flex justify-between items-end mb-4">
          <div>
            <p className="text-blue-100 font-medium text-sm">Your Progress</p>
            <h3 className="text-3xl font-bold">{progress}% <span className="text-lg font-normal">Completed</span></h3>
          </div>
          <div className="text-4xl opacity-20">🏆</div>
        </div>
        <div className="w-full bg-black/20 rounded-full h-2">
          <div 
            className="bg-white h-2 rounded-full transition-all duration-500 ease-out" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => (
          <div 
            key={step.id}
            onClick={() => toggleStep(step.id)}
            className={`
              relative p-4 rounded-xl border transition-all cursor-pointer group
              ${step.isCompleted 
                ? 'bg-green-50 border-green-200' 
                : 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-md'
              }
            `}
          >
            {/* Connector Line */}
            {index !== steps.length - 1 && (
              <div className="absolute left-8 bottom-0 top-16 w-0.5 bg-gray-100 -z-10 group-hover:bg-gray-200 transition-colors"></div>
            )}

            <div className="flex items-start gap-4">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors
                ${step.isCompleted ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500'}
              `}>
                {step.isCompleted ? '✓' : index + 1}
              </div>
              
              <div className="flex-1 pt-1">
                <div className="flex justify-between items-start">
                  <h4 className={`font-bold ${step.isCompleted ? 'text-green-900 line-through decoration-green-500' : 'text-gray-900'}`}>
                    {step.title}
                  </h4>
                  <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded text-gray-600">
                    {getPlatformIcon(step.platform)} {step.platform}
                  </span>
                </div>
                <p className={`text-sm mt-1 ${step.isCompleted ? 'text-green-700' : 'text-gray-600'}`}>
                  {step.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {progress === 100 && (
        <div className="mt-8 p-6 bg-yellow-50 border border-yellow-200 rounded-xl text-center animate-bounce">
          <div className="text-4xl mb-2">🎉</div>
          <h3 className="text-xl font-bold text-yellow-800">You are a Digital Pro!</h3>
          <p className="text-yellow-700 text-sm">You've completed the roadmap. Time to focus on content creation.</p>
        </div>
      )}
    </div>
  );
};

export default DigitalRoadmap;