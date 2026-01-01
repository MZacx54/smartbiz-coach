
import React, { useState } from 'react';
import { Course } from '../types';

const LearningHub: React.FC = () => {
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);

  const courses: Course[] = [
    {
      id: '1',
      title: 'Intro to Branding for MSMEs',
      description: 'Learn how to choose colors, fonts, and a voice that sells.',
      duration: '12 mins',
      thumbnailColor: '#4F46E5', // Indigo
      isLocked: false,
      progress: 0
    },
    {
      id: '2',
      title: 'WhatsApp Marketing Basics',
      description: 'Convert status viewers into paying customers.',
      duration: '18 mins',
      thumbnailColor: '#16A34A', // Green
      isLocked: false,
      progress: 0
    },
    {
      id: '3',
      title: 'CAC Registration Step-by-Step',
      description: 'Navigate the Corporate Affairs Commission portal without errors.',
      duration: '25 mins',
      thumbnailColor: '#EA580C', // Orange
      isLocked: false,
      progress: 0
    },
    {
      id: '4',
      title: 'Financial Literacy: Keeping Records',
      description: 'Separate business money from personal money.',
      duration: '15 mins',
      thumbnailColor: '#0891B2', // Cyan
      isLocked: true,
      progress: 0
    },
    {
      id: '5',
      title: 'Advanced Facebook Ads',
      description: 'Targeting the right audience in Nigeria.',
      duration: '30 mins',
      thumbnailColor: '#9333EA', // Purple
      isLocked: true,
      progress: 0
    }
  ];

  const renderPlayer = (course: Course) => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <button 
        onClick={() => setActiveCourse(null)}
        className="mb-4 text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1"
      >
        <span>←</span> Back to Courses
      </button>

      <div className="bg-black rounded-xl aspect-video w-full flex items-center justify-center relative overflow-hidden group">
         <div className="absolute inset-0 opacity-20" style={{ backgroundColor: course.thumbnailColor }}></div>
         <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-transform group-hover:bg-white/30">
            <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[18px] border-l-white border-b-[10px] border-b-transparent ml-1"></div>
         </div>
         <p className="absolute bottom-4 left-4 text-white font-medium">Preview Mode</p>
      </div>

      <div className="mt-6">
        <h2 className="text-2xl font-bold text-gray-900">{course.title}</h2>
        <p className="text-gray-600 mt-2">{course.description}</p>
        
        <div className="mt-6 border-t border-gray-100 pt-6">
          <h3 className="font-bold text-gray-800 mb-4">Key Takeaways</h3>
          <ul className="space-y-3">
            {[1, 2, 3].map((_, i) => (
              <li key={i} className="flex gap-3 text-gray-600 text-sm">
                <span className="text-green-500 font-bold">✓</span>
                <span>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Understanding the core concept.</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );

  if (activeCourse) {
    return renderPlayer(activeCourse);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Learning Hub 🎓</h2>
        <p className="text-gray-600 text-sm mt-2">Master the skills to grow your business.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map(course => (
          <div 
            key={course.id}
            onClick={() => !course.isLocked && setActiveCourse(course)}
            className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-all group ${course.isLocked ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="h-32 relative flex items-center justify-center" style={{ backgroundColor: course.thumbnailColor }}>
               <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  {course.isLocked ? (
                    <span className="text-xl">🔒</span>
                  ) : (
                    <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-1"></div>
                  )}
               </div>
               <span className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded font-medium">
                 {course.duration}
               </span>
            </div>
            
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-gray-900 leading-tight">{course.title}</h3>
              </div>
              <p className="text-xs text-gray-500 line-clamp-2 mb-4">{course.description}</p>
              
              {course.isLocked ? (
                 <div className="w-full py-2 bg-gray-100 text-gray-500 text-xs font-bold rounded text-center">
                   Upgrade to Unlock
                 </div>
              ) : (
                <div className="flex items-center gap-2 text-xs font-medium text-indigo-600 group-hover:underline">
                  Start Learning →
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 p-6 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-indigo-900">Want to master Digital Marketing?</h3>
          <p className="text-sm text-indigo-700">Get the full 20+ course library with Smart Access.</p>
        </div>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 whitespace-nowrap">
          View Plans
        </button>
      </div>
    </div>
  );
};

export default LearningHub;