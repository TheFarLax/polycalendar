'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, CornerDownLeft, Sparkles, Calendar, TrendingUp, X } from 'lucide-react';
import { NormalizedEvent } from '../types/polymarket';
import { formatCountdown } from '../services/polymarket';
import Logo from './Logo';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NormalizedEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Focus input when palette opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Debounced search logic
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error('Search proxy request failed');
        const data = await res.json();
        setResults(data);
        setSelectedIndex(0);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  // Keyboard navigation inside command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex].slug);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (resultsContainerRef.current) {
      const container = resultsContainerRef.current;
      const selectedElement = container.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        const containerTop = container.scrollTop;
        const containerBottom = containerTop + container.clientHeight;
        const elemTop = selectedElement.offsetTop;
        const elemBottom = elemTop + selectedElement.clientHeight;

        if (elemTop < containerTop) {
          container.scrollTop = elemTop;
        } else if (elemBottom > containerBottom) {
          container.scrollTop = elemBottom - container.clientHeight;
        }
      }
    }
  }, [selectedIndex]);

  const handleSelect = (slug: string) => {
    onClose();
    setQuery('');
    setResults([]);
    router.push(`/event/${slug}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 md:px-0">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/20 backdrop-blur-md transition-opacity duration-300" 
        onClick={onClose} 
      />

      {/* Spotlight Window */}
      <div className="relative w-full max-w-2xl bg-white/90 border border-slate-200/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[60vh] transition-all duration-300">
        
        {/* Search Input Box */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="w-full text-slate-800 placeholder-slate-400 bg-transparent border-0 outline-none ring-0 text-base focus:ring-0 focus:outline-none"
            placeholder="Search prediction events, categories, markets..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
          ) : query ? (
            <button 
              onClick={() => setQuery('')} 
              className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-1.5 shrink-0 px-2 py-0.5 border border-slate-200 rounded text-[10px] font-mono text-slate-400 bg-slate-50 uppercase tracking-widest select-none">
              ESC
            </div>
          )}
        </div>

        {/* Search Results Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-[150px] p-2" ref={resultsContainerRef}>
          {query.trim() === '' ? (
            // Default Suggestions / Welcome state
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <div className="w-12 h-12 bg-blue-50 border border-blue-100/50 rounded-xl flex items-center justify-center mb-3">
                <Sparkles className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700">Search the Polymarket Universe</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Type anything to discover live prediction markets, resolve timelines, and track specific event outcomes.
              </p>
              <div className="mt-5 flex flex-wrap gap-2 justify-center max-w-md">
                {['US Elections', 'Bitcoin', 'AI', 'GTA VI', 'Pop Culture'].map((term) => (
                  <button
                    key={term}
                    onClick={() => setQuery(term)}
                    className="px-3 py-1.5 text-xs text-slate-600 border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 rounded-lg transition"
                  >
                    "{term}"
                  </button>
                ))}
              </div>
            </div>
          ) : results.length === 0 && !isLoading ? (
            // Empty State
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <p className="text-sm font-medium text-slate-500">No events found matching "{query}"</p>
              <p className="text-xs text-slate-400 mt-1">Try another search term or double check spelling.</p>
            </div>
          ) : (
            // Results list
            results.map((event, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={event.id}
                  onClick={() => handleSelect(event.slug)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-150 ${
                    isSelected 
                      ? 'bg-slate-50 border-l-4 border-blue-500 pl-2' 
                      : 'border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-4">
                    {/* Event Thumbnail */}
                    <img
                      src={event.image}
                      alt={event.title}
                      className="w-10 h-10 rounded-lg object-cover bg-slate-100 shrink-0 border border-slate-100"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=100&auto=format&fit=crop&q=60';
                      }}
                    />
                    <div className="min-w-0">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold text-slate-500 bg-slate-100 mb-1 border border-slate-200/50">
                        {event.category}
                      </span>
                      <h4 className="text-sm font-medium text-slate-800 truncate">{event.title}</h4>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatCountdown(event.timelineDate)}
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5" />
                          ${event.volume.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Probability Badge */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex flex-col items-end">
                      <span className={`text-sm font-bold ${
                        event.probability >= 70 ? 'text-emerald-600' :
                        event.probability <= 30 ? 'text-rose-600' :
                        'text-blue-600'
                      }`}>
                        {event.probability <= 1 ? '<1%' : `${event.probability}%`}
                      </span>
                      <span className="text-[10px] text-slate-400">probability</span>
                    </div>

                    {/* Action Helper (only shown on hover/selected) */}
                    <div className={`w-6 h-6 rounded flex items-center justify-center text-slate-400 bg-slate-100 transition-opacity ${
                      isSelected ? 'opacity-100' : 'opacity-0'
                    }`}>
                      <CornerDownLeft className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-sans">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 border border-slate-200 rounded bg-white shadow-sm font-mono text-[9px]">↑↓</span>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 border border-slate-200 rounded bg-white shadow-sm font-mono text-[9px]">ENTER</span>
              Open Event
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px]">Powered by</span>
            <Logo iconOnly size="sm" />
          </div>
        </div>
      </div>
    </div>
  );
}
