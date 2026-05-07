import React, { useState, useEffect, useRef } from 'react';
import { Search, Package, MapPin, Briefcase, Building2, X, ArrowRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { UnifiedItem } from '../types';

interface GlobalSearchProps {
  onResultClick: (item: UnifiedItem) => void;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ onResultClick }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UnifiedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (query.trim().length > 1) {
        setIsLoading(true);
        try {
          const response = await api.get(`/api/marketplace/search/?search=${query}`);
          setResults(response.data);
          setIsOpen(true);
        } catch (err) {
          console.error('Search error:', err);
        } finally {
          setIsLoading(false);
        }
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'SERVICE': return <Briefcase className="w-4 h-4 text-emerald-500" />;
      case 'PROPERTY': return <Building2 className="w-4 h-4 text-blue-500" />;
      case 'B2B': return <ArrowRight className="w-4 h-4 text-amber-500" />;
      default: return <Package className="w-4 h-4 text-indigo-500" />;
    }
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      <div className="relative group">
        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${query ? 'text-indigo-600' : 'text-slate-400'}`} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length > 1 && setIsOpen(true)}
          placeholder="Search ecosystem (Items, Services, Homes...)"
          className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-10 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm group-hover:shadow-md"
        />
        {query && (
          <button 
            onClick={() => { setQuery(''); setResults([]); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 hover:bg-slate-100 p-1 rounded-full transition-colors"
          >
            <X className="w-3.5 h-3.5 text-slate-400" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            className="absolute top-full left-0 right-0 mt-3 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-50 max-h-[400px] flex flex-col"
          >
            <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ecosystem Results</span>
              {isLoading && <Loader2 className="w-3 h-3 text-indigo-600 animate-spin" />}
            </div>

            <div className="overflow-y-auto flex-1 hide-scrollbar">
              {results.length > 0 ? (
                results.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onResultClick(item);
                      setIsOpen(false);
                    }}
                    className="w-full p-4 flex items-center gap-4 hover:bg-indigo-50/50 transition-colors border-b border-slate-50 last:border-0 group"
                  >
                    <div className="w-12 h-12 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        getTypeIcon(item.product_type)
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">
                          {item.product_type}
                        </span>
                        <h4 className="font-bold text-sm text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                          {item.name}
                        </h4>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500">
                        <span className="font-bold text-slate-900">₦{parseFloat(item.price).toLocaleString()}</span>
                        {item.location && (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 text-slate-400" /> {item.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-all group-hover:translate-x-1" />
                  </button>
                ))
              ) : !isLoading ? (
                <div className="p-12 text-center">
                  <div className="text-4xl mb-4">🔍</div>
                  <p className="text-sm font-bold text-slate-800">No matches found</p>
                  <p className="text-xs text-slate-500 mt-1">Try a different keyword or category</p>
                </div>
              ) : null}
            </div>

            {results.length > 0 && (
              <div className="p-3 bg-slate-50 text-center border-t border-slate-100">
                <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">
                  View all results
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GlobalSearch;
