'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  TrendingUp, 
  ArrowLeft, 
  Search, 
  Filter, 
  ChevronRight,
  Layers
} from 'lucide-react';
import { NormalizedEvent } from '../../types/polymarket';
import { formatCountdown } from '../../services/polymarket';
import Logo from '../../components/Logo';
import AddToCalendar from '../../components/AddToCalendar';
import CommandPalette from '../../components/CommandPalette';

interface CalendarClientProps {
  initialEvents: NormalizedEvent[];
}

export default function CalendarClient({ initialEvents }: CalendarClientProps) {
  const [events, setEvents] = useState<NormalizedEvent[]>(initialEvents);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Keyboard shortcut listener for '/'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !isSearchOpen && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen]);

  // Extract unique categories
  const categories = ['All', ...Array.from(new Set(initialEvents.map(e => e.category)))];

  // Filter events by category
  const filteredEvents = selectedCategory === 'All' 
    ? events 
    : events.filter(e => e.category === selectedCategory);

  // Group events by month & year of resolution
  const groupEventsByMonth = (items: NormalizedEvent[]) => {
    const groups: { [key: string]: NormalizedEvent[] } = {};
    
    items.forEach(e => {
      const date = new Date(e.timelineDate);
      const key = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(e);
    });

    return groups;
  };

  const grouped = groupEventsByMonth(filteredEvents);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/30">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/75 backdrop-blur-md border-b border-slate-100/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <Logo size="md" />
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-400 bg-slate-50 hover:bg-slate-100 border border-slate-200/50 rounded-lg transition"
            >
              <Search className="w-4 h-4 text-slate-400" />
              <span>Search markets...</span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 border border-slate-200 rounded font-mono text-[9px] bg-white text-slate-400">
                /
              </kbd>
            </button>
            <Link 
              href="/" 
              className="text-xs font-semibold px-3 py-1.5 text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200/30 rounded-lg transition"
            >
              Back to Curated Timeline
            </Link>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 space-y-8 animate-fadeIn">
        
        {/* Title Heading */}
        <div className="border-b border-slate-100 pb-5 space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-blue-500" />
            Market Closing Calendar
          </h1>
          <p className="text-slate-400 text-xs">
            Follow upcoming prediction market closing times mapped chronologically by month.
          </p>
        </div>

        {/* Category Filters Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-xs text-slate-400 font-medium shrink-0 mr-1.5">Filter:</span>
          </div>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition shrink-0 ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-500 hover:text-slate-800 border-slate-200/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Timeline Resolution Board */}
        {Object.keys(grouped).length === 0 ? (
          <div className="py-20 text-center border border-dashed border-slate-200 rounded-2xl bg-white">
            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-3">
              <Layers className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-600">No predictions found</h3>
            <p className="text-xs text-slate-400 mt-1">Try selecting a different category filter.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {Object.entries(grouped).map(([monthYear, items]) => (
              <div key={monthYear} className="space-y-4">
                
                {/* Month Group Header */}
                <div className="sticky top-16 z-10 bg-slate-50/90 py-2 border-b border-slate-150 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    {monthYear}
                  </h2>
                  <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                    {items.length} prediction{items.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Group Items */}
                <div className="grid gap-3.5">
                  {items.map(event => (
                    <Link
                      href={`/event/${event.slug}`}
                      key={event.id}
                      className="flex items-center justify-between p-4 bg-white border border-slate-100 hover:border-slate-200 rounded-xl shadow-xs hover:shadow-sm transition group"
                    >
                      <div className="min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold text-slate-500 bg-slate-100/80 uppercase tracking-wider border border-slate-200/50">
                            {event.category}
                          </span>
                          <span className="text-[9px] font-mono text-slate-300">ID: #{event.id}</span>
                        </div>
                        <h3 className="text-sm font-semibold text-slate-800 leading-snug truncate group-hover:text-blue-600 transition">
                          {event.title}
                        </h3>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 font-mono">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {formatCountdown(event.timelineDate)}
                          </span>
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                            ${event.volume.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className={`text-base font-extrabold block ${
                            event.probability >= 70 ? 'text-emerald-600' :
                            event.probability <= 30 ? 'text-rose-600' :
                            'text-blue-600'
                          }`}>
                            {event.probability <= 1 ? '<1%' : `${event.probability}%`}
                          </span>
                          <span className="text-[9px] text-slate-400 uppercase tracking-widest mt-0.5 block">
                            chance
                          </span>
                        </div>

                        {/* Add to Calendar */}
                        <AddToCalendar
                          title={event.title}
                          timelineDate={event.timelineDate}
                          category={event.category}
                          probability={event.probability}
                          slug={event.slug}
                          description={event.description}
                          variant="compact"
                        />

                        <div className="w-6 h-6 rounded bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

              </div>
            ))}
          </div>
        )}

      </main>

      {/* Raycast Search Palette */}
      <CommandPalette 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
      />

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-100 py-10 mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <Logo size="md" />
          <p className="text-[11px] text-slate-400 text-center md:text-right max-w-md font-sans">
            PolyCalendar is an independent project built using public, read-only Polymarket APIs. Prediction markets contain high volatility and information changes rapidly. All timestamps and consensus estimations are dynamic.
          </p>
        </div>
      </footer>
    </div>
  );
}
