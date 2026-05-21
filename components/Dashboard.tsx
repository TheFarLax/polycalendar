'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Calendar, 
  TrendingUp, 
  Flame, 
  Star, 
  Search, 
  ArrowRight, 
  Clock, 
  Award,
  ChevronRight,
  Sparkles,
  Layers,
  Compass,
  Filter,
  SlidersHorizontal,
  FolderSync,
  Volume2,
  CalendarCheck
} from 'lucide-react';
import { NormalizedEvent } from '../types/polymarket';
import { formatCountdown } from '../services/polymarket';
import Logo from './Logo';
import CommandPalette from './CommandPalette';
import AddToCalendar from './AddToCalendar';

interface DashboardProps {
  initialTimelineEvents: NormalizedEvent[];
  initialHotEvents: NormalizedEvent[];
}

type SortOption = 'ending-soonest' | 'highest-volume' | 'most-active' | 'recently-added' | 'long-term';
type DateFilterOption = 'all' | 'today-tomorrow' | 'this-month' | 'long-term';

export default function Dashboard({ initialTimelineEvents, initialHotEvents }: DashboardProps) {
  // Datasets
  const [timelineEvents, setTimelineEvents] = useState<NormalizedEvent[]>(initialTimelineEvents);
  const [hotEvents, setHotEvents] = useState<NormalizedEvent[]>(initialHotEvents);
  const [watchlistSlugs, setWatchlistSlugs] = useState<string[]>([]);
  
  // Navigation / Tab state
  const [activeTab, setActiveTab] = useState<'curated' | 'explore' | 'watchlist'>('curated');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Advanced Explore Tab States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NormalizedEvent[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<SortOption>('ending-soonest');
  
  // Quick Switch Filters
  const [filterHighVolume, setFilterHighVolume] = useState(false);
  const [filterTrending, setFilterTrending] = useState(false);
  const [filterEndingSoon, setFilterEndingSoon] = useState(false);
  const [dateRange, setDateRange] = useState<DateFilterOption>('all');

  // Temporary pipeline validation debug log
  useEffect(() => {
    console.log(
      '--- PIPELINE VALIDATION DEBUG LOG ---',
      timelineEvents.slice(0, 20).map(e => ({
        title: e.title,
        timelineDate: e.timelineDate,
        rawEndDate: (e as any).endDate,
        resolutionDate: (e as any).resolutionDate
      }))
    );
  }, [timelineEvents]);

  // Load Watchlist from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('polycalendar_watchlist');
      if (stored) {
        setWatchlistSlugs(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Error loading watchlist', e);
    }
  }, []);

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

  // Debounced search logic for deep explore search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        if (!res.ok) throw new Error('CORS Search proxy failed');
        const data = await res.json();
        setSearchResults(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const toggleWatchlist = (e: React.MouseEvent, slug: string) => {
    e.preventDefault();
    e.stopPropagation();
    let updated = [...watchlistSlugs];
    if (watchlistSlugs.includes(slug)) {
      updated = updated.filter(s => s !== slug);
    } else {
      updated.push(slug);
    }
    setWatchlistSlugs(updated);
    localStorage.setItem('polycalendar_watchlist', JSON.stringify(updated));
  };

  // Find Next Major Resolution (Centerpiece spotlight)
  // Imminent, high-volume event resolving soon
  const nextMajor = useMemo(() => {
    if (timelineEvents.length === 0) return null;
    const now = Date.now();
    
    // Prioritize high volume events resolving in next 10 days with a 1h past tolerance
    const candidate = timelineEvents.find(e => {
      const eventTime = new Date(e.timelineDate).getTime();
      return eventTime > now - 60 * 60 * 1000 && eventTime < now + 10 * 24 * 60 * 60 * 1000 && e.volume > 100000;
    });

    return candidate || timelineEvents[0];
  }, [timelineEvents]);

  // 1. Resolving Soon / Resolving in Hours (ending within 24 hours of now)
  const resolvingSoon = useMemo(() => {
    const now = Date.now();
    return timelineEvents
      .filter(e => e.id !== nextMajor?.id)
      .filter(e => {
        const t = new Date(e.timelineDate).getTime();
        return t > now - 60 * 60 * 1000 && t <= now + 24 * 60 * 60 * 1000;
      })
      .sort((a, b) => new Date(a.timelineDate).getTime() - new Date(b.timelineDate).getTime())
      .slice(0, 8);
  }, [timelineEvents, nextMajor]);

  // 2. Today's Markets (resolving before midnight local time today)
  const todayMarkets = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
    
    return timelineEvents
      .filter(e => e.id !== nextMajor?.id)
      .filter(e => {
        const t = new Date(e.timelineDate).getTime();
        return t > startOfToday && t <= endOfToday;
      })
      .sort((a, b) => new Date(a.timelineDate).getTime() - new Date(b.timelineDate).getTime())
      .slice(0, 8);
  }, [timelineEvents, nextMajor]);

  // 3. This Weekend (Upcoming Friday morning to Sunday midnight)
  const weekendMarkets = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay();
    
    let daysToFriday = (5 - currentDay);
    if (daysToFriday < 0) daysToFriday += 7;
    
    let weekendStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (currentDay >= 5 || currentDay === 0 ? 0 : daysToFriday)).getTime();
    if (currentDay >= 5 || currentDay === 0) {
      weekendStart = now.getTime() - 60 * 60 * 1000;
    }
    
    let daysToSunday = (0 - currentDay);
    if (daysToSunday < 0) daysToSunday += 7;
    const weekendEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysToSunday, 23, 59, 59, 999).getTime();

    return timelineEvents
      .filter(e => e.id !== nextMajor?.id)
      .filter(e => {
        const t = new Date(e.timelineDate).getTime();
        return t >= weekendStart && t <= weekendEnd;
      })
      .sort((a, b) => new Date(a.timelineDate).getTime() - new Date(b.timelineDate).getTime())
      .slice(0, 8);
  }, [timelineEvents, nextMajor]);

  // 4. Trending Right Now (mix of high volume + shorter timeline + active engagement)
  const trendingRightNow = useMemo(() => {
    const now = Date.now();
    return timelineEvents
      .filter(e => e.id !== nextMajor?.id)
      .filter(e => {
        const t = new Date(e.timelineDate).getTime();
        // Ending within next 10 days, high volume
        return t > now - 60 * 60 * 1000 && t <= now + 10 * 24 * 60 * 60 * 1000 && e.volume > 15000;
      })
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 8);
  }, [timelineEvents, nextMajor]);

  // Curated Timeline List (ending soonest chronologically, showing same-day resolutions)
  const curatedEndingSoon = useMemo(() => {
    return timelineEvents
      .filter(e => e.id !== nextMajor?.id)
      .slice(0, 10);
  }, [timelineEvents, nextMajor]);

  // Curated Weekly highlights
  const curatedThisWeek = useMemo(() => {
    const now = Date.now();
    return timelineEvents
      .filter(e => e.id !== nextMajor?.id)
      .filter(e => {
        const eventTime = new Date(e.timelineDate).getTime();
        return eventTime > now - 60 * 60 * 1000 && eventTime <= now + 7 * 24 * 60 * 60 * 1000;
      })
      .slice(0, 8);
  }, [timelineEvents, nextMajor]);

  // Curated Future Highlights (> 30 days)
  const curatedFutureHighlights = useMemo(() => {
    const now = Date.now();
    return timelineEvents
      .filter(e => e.id !== nextMajor?.id)
      .filter(e => {
        const eventTime = new Date(e.timelineDate).getTime();
        return eventTime > now + 30 * 24 * 60 * 60 * 1000 && (e.volume > 30000 || e.category.toLowerCase().includes('politics') || e.category.toLowerCase().includes('election'));
      })
      .slice(0, 9);
  }, [timelineEvents, nextMajor]);

  // Detect sandbox demo mode
  const isDemoActive = useMemo(() => {
    return timelineEvents.some(e => e.isDemo) || hotEvents.some(e => e.isDemo);
  }, [timelineEvents, hotEvents]);

  // Watchlist Items Map
  const watchlistEvents = useMemo(() => {
    const all = [...timelineEvents, ...hotEvents, ...searchResults];
    const uniqueMap = new Map<string, NormalizedEvent>();
    all.forEach(e => {
      if (e) uniqueMap.set(e.slug, e);
    });
    
    return watchlistSlugs
      .map(slug => uniqueMap.get(slug))
      .filter((e): e is NormalizedEvent => !!e);
  }, [watchlistSlugs, timelineEvents, hotEvents, searchResults]);

  // Unified Discover Dataset (combines hot & timeline events for 150+ comprehensive dataset)
  const baseExploreEvents = useMemo(() => {
    if (searchQuery.trim()) {
      return searchResults;
    }
    
    const merged = [...timelineEvents, ...hotEvents];
    const uniqueMap = new Map<string, NormalizedEvent>();
    merged.forEach(e => {
      if (e && e.id) uniqueMap.set(e.id, e);
    });
    return Array.from(uniqueMap.values());
  }, [timelineEvents, hotEvents, searchResults, searchQuery]);

  // Intelligent Category Mapping logic
  const matchCategory = (eventCategory: string, filterCategory: string): boolean => {
    if (filterCategory === 'All') return true;
    
    const cat = eventCategory.toLowerCase();
    const tag = filterCategory.toLowerCase();
    
    if (tag === 'politics') {
      return cat.includes('politics') || cat.includes('election') || cat.includes('senate') || cat.includes('president') || cat.includes('trump') || cat.includes('biden') || cat.includes('white house') || cat.includes('democrat') || cat.includes('republican');
    }
    if (tag === 'sports') {
      return cat.includes('sports') || cat.includes('nba') || cat.includes('nfl') || cat.includes('nhl') || cat.includes('mlb') || cat.includes('champions') || cat.includes('cup') || cat.includes('soccer') || cat.includes('football') || cat.includes('basketball');
    }
    if (tag === 'crypto') {
      return cat.includes('crypto') || cat.includes('bitcoin') || cat.includes('btc') || cat.includes('ethereum') || cat.includes('eth') || cat.includes('solana') || cat.includes('coinbase') || cat.includes('blockchain');
    }
    if (tag === 'ai') {
      return cat.includes('ai') || cat.includes('artificial intelligence') || cat.includes('chatgpt') || cat.includes('openai') || cat.includes('gemini') || cat.includes('nvidia') || cat.includes('anthropic');
    }
    if (tag === 'economy') {
      return cat.includes('economy') || cat.includes('fed') || cat.includes('interest rate') || cat.includes('inflation') || cat.includes('gdp') || cat.includes('stock') || cat.includes('finance') || cat.includes('markets');
    }
    if (tag === 'entertainment') {
      return cat.includes('entertainment') || cat.includes('pop culture') || cat.includes('movie') || cat.includes('oscars') || cat.includes('music') || cat.includes('box office') || cat.includes('taylor swift');
    }
    
    return cat === tag;
  };

  // Filtered & Sorted Explore Tab Results
  const filteredAndSortedExploreEvents = useMemo(() => {
    let result = [...baseExploreEvents];

    // 1. Category Filter
    if (selectedCategory !== 'All') {
      result = result.filter(e => matchCategory(e.category, selectedCategory));
    }

    // 2. High Volume Filter (> $100k)
    if (filterHighVolume) {
      result = result.filter(e => e.volume > 100000);
    }

    // 3. Trending Filter
    if (filterTrending) {
      // Hot events or high-signal volume
      result = result.filter(e => e.volume > 50000 || hotEvents.some(h => h.id === e.id));
    }

    // 4. Ending Soon Filter (resolving within 48 hours)
    if (filterEndingSoon) {
      const now = Date.now();
      result = result.filter(e => {
        const diffMs = new Date(e.timelineDate).getTime() - now;
        return diffMs > -60 * 60 * 1000 && diffMs <= 48 * 60 * 60 * 1000;
      });
    }

    // 5. Date Range Filters
    if (dateRange !== 'all') {
      const now = Date.now();
      result = result.filter(e => {
        const eventTime = new Date(e.timelineDate).getTime();
        const diffMs = eventTime - now;
        
        if (dateRange === 'today-tomorrow') {
          return diffMs > -60 * 60 * 1000 && diffMs <= 48 * 60 * 60 * 1000;
        }
        if (dateRange === 'this-month') {
          return diffMs > -60 * 60 * 1000 && diffMs <= 30 * 24 * 60 * 60 * 1000;
        }
        if (dateRange === 'long-term') {
          return diffMs > 30 * 24 * 60 * 60 * 1000;
        }
        return true;
      });
    }

    // 6. Sorting Rules (Always local, strict resolution matches)
    if (sortBy === 'ending-soonest') {
      result.sort((a, b) => new Date(a.timelineDate).getTime() - new Date(b.timelineDate).getTime());
    } else if (sortBy === 'highest-volume') {
      result.sort((a, b) => b.volume - a.volume);
    } else if (sortBy === 'most-active') {
      // Prioritize events appearing in "Hot Events" pipeline, then sort by volume descending
      result.sort((a, b) => {
        const aHot = hotEvents.some(h => h.id === a.id) ? 1 : 0;
        const bHot = hotEvents.some(h => h.id === b.id) ? 1 : 0;
        if (aHot !== bHot) return bHot - aHot;
        return b.volume - a.volume;
      });
    } else if (sortBy === 'recently-added') {
      // Sequential IDs sort descending
      result.sort((a, b) => Number(b.id) - Number(a.id));
    } else if (sortBy === 'long-term') {
      result.sort((a, b) => new Date(b.timelineDate).getTime() - new Date(a.timelineDate).getTime());
    }

    return result;
  }, [baseExploreEvents, selectedCategory, sortBy, filterHighVolume, filterTrending, filterEndingSoon, dateRange, hotEvents]);

  return (
    <div className="flex-1 flex flex-col">
      {/* Sticky Header Nav */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          
          {/* Logo */}
          <Link href="/" onClick={() => setActiveTab('curated')}>
            <Logo size="md" />
          </Link>

          {/* Core Tabs Navigation */}
          <nav className="flex items-center gap-1.5 p-1 bg-slate-50 border border-slate-200/50 rounded-xl">
            <button
              onClick={() => setActiveTab('curated')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'curated'
                  ? 'bg-white text-slate-800 shadow-sm border border-slate-200/30'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Curated Timeline
            </button>
            
            <button
              onClick={() => setActiveTab('explore')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'explore'
                  ? 'bg-white text-slate-800 shadow-sm border border-slate-200/30'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              Explore & Search
            </button>

            <button
              onClick={() => setActiveTab('watchlist')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'watchlist'
                  ? 'bg-white text-slate-800 shadow-sm border border-slate-200/30'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              Watchlist
              {watchlistSlugs.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[9px] font-black bg-amber-100 text-amber-800 rounded-full">
                  {watchlistSlugs.length}
                </span>
              )}
            </button>
          </nav>

          {/* Spotlight Palette Shortcut Trigger */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-400 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-lg transition"
            >
              <Search className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">Search...</span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 border border-slate-200 rounded font-mono text-[9px] bg-white text-slate-400">
                /
              </kbd>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-10">
        
        {/* ================= CURATED HOMEPAGE TAB ================= */}
        {activeTab === 'curated' && (
          <div className="space-y-16 animate-fadeIn">
            
            {/* Minimal Editorial Hero */}
            <section className="text-center py-6 md:py-10 max-w-2xl mx-auto space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100/50">
                <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse" /> Curated Prediction Market Timeline
              </span>
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
                Prediction markets,<br />organized by time.
              </h1>
              <p className="text-slate-400 text-sm md:text-base">
                Follow high-signal resolutions scheduled globally. Keep up with critical same-day results and major long-term consensus outcomes.
              </p>
            </section>

            {/* Demo Banner */}
            {isDemoActive && (
              <div className="bg-amber-50/60 backdrop-blur-xs border border-amber-200/50 rounded-2xl p-4 flex items-start gap-3.5 max-w-2xl mx-auto shadow-xs text-slate-700 animate-fadeIn">
                <span className="p-2 rounded-xl bg-amber-100/70 text-amber-700 shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4 text-amber-600 animate-pulse" />
                </span>
                <div className="text-left space-y-0.5">
                  <h4 className="text-xs font-bold text-amber-900">Sandbox Demo Mode Active</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    The official Polymarket API cluster is currently unreachable from your network connection. We have gracefully loaded dynamic, relative, high-fidelity mock markets so you can fully explore PolyCalendar's timeline segments.
                  </p>
                </div>
              </div>
            )}

            {/* Next Major Resolution Spotlights */}
            {nextMajor && (
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    Next Major Resolution
                  </h2>
                  <span className="text-xs text-slate-400 font-medium">Resolving Soon</span>
                </div>

                <div className="relative overflow-hidden bg-white border border-slate-150 rounded-2xl p-6 md:p-8 hover:border-slate-350 hover:shadow-lg shadow-sm transition duration-300 group">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-blue-50/40 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 group-hover:bg-blue-50/60 transition duration-300" />
                  
                  <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <Link href={`/event/${nextMajor.slug}`} className="flex items-start md:items-center gap-4 min-w-0 flex-1">
                      <img
                        src={nextMajor.image}
                        alt={nextMajor.title}
                        className="w-16 h-16 md:w-20 md:h-20 rounded-xl object-cover bg-slate-50 shrink-0 border border-slate-100 shadow-inner group-hover:scale-[1.01] transition"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=100&auto=format&fit=crop&q=60';
                        }}
                      />
                      <div className="min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold text-blue-600 bg-blue-50/50 uppercase tracking-wider border border-blue-100/30">
                            {nextMajor.category}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">ID: #{nextMajor.id}</span>
                        </div>
                        <h3 className="text-lg md:text-xl font-bold text-slate-800 leading-snug group-hover:text-blue-600 transition truncate-2-lines pr-4">
                          {nextMajor.title}
                        </h3>
                        <div className="flex items-center gap-4 text-xs text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5" />
                            Volume: ${nextMajor.volume.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      </div>
                    </Link>

                    {/* Right Block: Actions, Probability, Calendar */}
                    <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 border-slate-100 pt-4 md:pt-0 shrink-0 gap-3 md:gap-2 md:pl-6">
                      <div className="text-left md:text-right">
                        <span className="text-3xl md:text-5xl font-black text-slate-800 tracking-tight block">
                          {nextMajor.probability <= 1 ? '<1%' : `${nextMajor.probability}%`}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 block">
                          Consensus
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Imminent countdown ticker */}
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg text-xs font-bold font-mono">
                          <Clock className="w-3.5 h-3.5 animate-pulse text-rose-500" />
                          <span>{formatCountdown(nextMajor.timelineDate)} left</span>
                        </div>

                        {/* Dropdown Calendar add */}
                        <AddToCalendar
                          title={nextMajor.title}
                          timelineDate={nextMajor.timelineDate}
                          category={nextMajor.category}
                          probability={nextMajor.probability}
                          slug={nextMajor.slug}
                          description={nextMajor.description}
                          variant="compact"
                        />

                        {/* Watchlist Star */}
                        <button
                          onClick={(e) => toggleWatchlist(e, nextMajor.slug)}
                          className={`p-1.5 border rounded-lg transition-all ${
                            watchlistSlugs.includes(nextMajor.slug)
                              ? 'bg-amber-50 border-amber-200 text-amber-500 hover:bg-amber-100'
                              : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          <Star className={`w-4 h-4 ${watchlistSlugs.includes(nextMajor.slug) ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* 1. RESOLVING SOON (Next 24 Hours) */}
            <section className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-450 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                  ⚡ Resolving Soon (Next 24 Hours)
                </h2>
                <button 
                  onClick={() => { setActiveTab('explore'); setSortBy('ending-soonest'); }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  View All <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {resolvingSoon.length === 0 ? (
                <div className="py-10 text-center border border-dashed border-slate-150 rounded-2xl bg-slate-50/30">
                  <p className="text-xs text-slate-400 font-medium">All quiet in the next 24 hours. Check Today's and Weekend schedules below!</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {resolvingSoon.map((event) => {
                    const isWatched = watchlistSlugs.includes(event.slug);
                    const hoursLeft = Math.max(0, (new Date(event.timelineDate).getTime() - Date.now()) / (1000 * 60 * 60));
                    const isClosingInHours = hoursLeft < 12;

                    return (
                      <div 
                        key={event.id}
                        className="flex flex-col justify-between p-4 bg-white border border-slate-150 hover:border-slate-350 rounded-xl shadow-xs hover:shadow-md transition duration-205 group relative overflow-hidden"
                      >
                        {isClosingInHours && (
                          <div className="absolute top-0 left-0 w-full h-[2.5px] bg-gradient-to-r from-rose-500 to-amber-500" />
                        )}
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold text-rose-600 bg-rose-50 uppercase tracking-wider border border-rose-100/30">
                              {event.category}
                            </span>
                            <span className="text-[9px] font-mono text-slate-350">#{event.id}</span>
                          </div>

                          <Link href={`/event/${event.slug}`} className="block">
                            <h4 className="text-xs font-bold text-slate-800 leading-snug group-hover:text-blue-600 transition truncate-2-lines mb-3 pr-2">
                              {event.title}
                            </h4>
                          </Link>
                        </div>

                        <div className="space-y-3 pt-3 border-t border-slate-50">
                          {/* Live hours Ticker with pulse */}
                          <div className="flex items-center justify-between">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                              isClosingInHours ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-500'
                            }`}>
                              <Clock className={`w-3 h-3 ${isClosingInHours ? 'animate-pulse text-rose-500' : 'text-slate-400'}`} />
                              {hoursLeft < 1 ? 'Ending in minutes' : `${Math.floor(hoursLeft)}h left`}
                            </span>
                            <span className="text-xs font-black text-slate-800">
                              {event.probability <= 1 ? '<1%' : `${event.probability}%`}
                            </span>
                          </div>

                          {/* Probability Mini-bar */}
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                isClosingInHours ? 'bg-rose-500' : 'bg-blue-600'
                              }`} 
                              style={{ width: `${event.probability}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[9px] font-mono text-slate-355">
                              ${event.volume.toLocaleString('en-US', { maximumFractionDigits: 0 })} vol
                            </span>
                            <div className="flex items-center gap-1.5">
                              <AddToCalendar
                                title={event.title}
                                timelineDate={event.timelineDate}
                                category={event.category}
                                probability={event.probability}
                                slug={event.slug}
                                description={event.description}
                                variant="compact"
                              />
                              <button
                                onClick={(e) => toggleWatchlist(e, event.slug)}
                                className={`p-1 border rounded-md transition ${
                                  isWatched
                                    ? 'bg-amber-50 border-amber-200 text-amber-500'
                                    : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600'
                                }`}
                              >
                                <Star className={`w-3 h-3 ${isWatched ? 'fill-current' : ''}`} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 2. TODAY & WEEKEND GRID */}
            <div className="grid md:grid-cols-2 gap-8">
              
              {/* Left Column: Today's Resolutions */}
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4 text-emerald-500 animate-pulse" />
                    📅 Today's Live Resolutions
                  </h2>
                  <span className="text-[10px] text-slate-400 font-mono uppercase">midnight local</span>
                </div>

                {todayMarkets.length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-slate-150 rounded-2xl bg-slate-50/20">
                    <p className="text-xs text-slate-400 font-medium">All resolved for today! Check resolving soonest above.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {todayMarkets.map((event) => (
                      <div 
                        key={event.id}
                        className="flex items-center justify-between p-3.5 bg-white border border-slate-150 hover:border-slate-350 rounded-xl shadow-xs hover:shadow transition duration-150 group"
                      >
                        <Link href={`/event/${event.slug}`} className="min-w-0 pr-2 flex-1">
                          <h4 className="text-xs font-bold text-slate-800 truncate group-hover:text-blue-600 transition leading-snug">
                            {event.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center gap-1 text-[9px] text-slate-400 font-mono">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {formatCountdown(event.timelineDate)}
                            </span>
                            <span className="text-[9px] font-semibold text-rose-500 uppercase tracking-wider">closing today</span>
                          </div>
                        </Link>
                        
                        <div className="flex items-center gap-3.5 shrink-0">
                          <span className="text-xs font-extrabold text-slate-700 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">
                            {event.probability <= 1 ? '<1%' : `${event.probability}%`}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <AddToCalendar
                              title={event.title}
                              timelineDate={event.timelineDate}
                              category={event.category}
                              probability={event.probability}
                              slug={event.slug}
                              description={event.description}
                              variant="compact"
                            />
                            <button
                              onClick={(e) => toggleWatchlist(e, event.slug)}
                              className={`p-1 border border-slate-150 rounded-md transition ${
                                watchlistSlugs.includes(event.slug)
                                  ? 'bg-amber-50 border-amber-200 text-amber-500'
                                  : 'bg-slate-50 text-slate-400 hover:text-slate-600'
                              }`}
                            >
                              <Star className={`w-3 h-3 ${watchlistSlugs.includes(event.slug) ? 'fill-current' : ''}`} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: This Weekend (Upcoming Weekend) */}
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-500 fill-amber-500" />
                    🎉 Weekend Momentum (Sports & Culture)
                  </h2>
                  <span className="text-[10px] text-slate-400 font-mono uppercase">weekend focus</span>
                </div>

                {weekendMarkets.length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-slate-150 rounded-2xl bg-slate-50/20">
                    <p className="text-xs text-slate-400 font-medium">No matches scheduled this weekend. Explore soonest above!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {weekendMarkets.map((event) => (
                      <div 
                        key={event.id}
                        className="flex items-center justify-between p-3.5 bg-white border border-slate-150 hover:border-slate-355 rounded-xl shadow-xs hover:shadow transition duration-150 group"
                      >
                        <Link href={`/event/${event.slug}`} className="min-w-0 pr-2 flex-1">
                          <h4 className="text-xs font-bold text-slate-800 truncate group-hover:text-blue-600 transition leading-snug">
                            {event.title}
                          </h4>
                          <span className="inline-flex items-center gap-1 text-[9px] text-slate-400 mt-1 font-mono">
                            <Clock className="w-3 h-3 text-slate-400" />
                            Resolves Weekend ({new Date(event.timelineDate).toLocaleDateString('en-US', { weekday: 'short' })})
                          </span>
                        </Link>
                        
                        <div className="flex items-center gap-3.5 shrink-0">
                          <span className="text-xs font-extrabold text-slate-700 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">
                            {event.probability <= 1 ? '<1%' : `${event.probability}%`}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <AddToCalendar
                              title={event.title}
                              timelineDate={event.timelineDate}
                              category={event.category}
                              probability={event.probability}
                              slug={event.slug}
                              description={event.description}
                              variant="compact"
                            />
                            <button
                              onClick={(e) => toggleWatchlist(e, event.slug)}
                              className={`p-1 border border-slate-150 rounded-md transition ${
                                watchlistSlugs.includes(event.slug)
                                  ? 'bg-amber-50 border-amber-200 text-amber-500'
                                  : 'bg-slate-50 text-slate-400 hover:text-slate-600'
                              }`}
                            >
                              <Star className={`w-3 h-3 ${watchlistSlugs.includes(event.slug) ? 'fill-current' : ''}`} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* 3. TRENDING RIGHT NOW (Mix of high volume, short timeline) */}
            <section className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500 fill-orange-500 animate-pulse" />
                  🔥 Trending Right Now
                </h2>
                <span className="text-xs text-slate-400 font-medium">high-velocity activity</span>
              </div>

              <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                {trendingRightNow.map((event) => {
                  const isWatched = watchlistSlugs.includes(event.slug);
                  return (
                    <div 
                      key={event.id}
                      className="flex flex-col justify-between p-4 bg-white border border-slate-150 hover:border-slate-350 rounded-xl shadow-xs hover:shadow transition duration-200 group relative"
                    >
                      <Link href={`/event/${event.slug}`} className="block">
                        <div className="flex items-center gap-2 mb-2">
                          <img
                            src={event.image}
                            alt={event.title}
                            className="w-5 h-5 rounded-md object-cover bg-slate-50 border border-slate-100"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=100&auto=format&fit=crop&q=60';
                            }}
                          />
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate">
                            {event.category}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-800 leading-snug group-hover:text-blue-600 transition truncate-2-lines mb-3 pr-1">
                          {event.title}
                        </h4>
                      </Link>

                      <div className="space-y-2 pt-2.5 border-t border-slate-50">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-mono text-slate-400 flex items-center gap-1 font-bold">
                            <TrendingUp className="w-3 h-3 text-slate-400" />
                            ${event.volume.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                          </span>
                          <span className="text-xs font-black text-slate-800">
                            {event.probability <= 1 ? '<1%' : `${event.probability}%`}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {formatCountdown(event.timelineDate)}
                          </span>
                          <div className="flex items-center gap-1">
                            <AddToCalendar
                              title={event.title}
                              timelineDate={event.timelineDate}
                              category={event.category}
                              probability={event.probability}
                              slug={event.slug}
                              description={event.description}
                              variant="compact"
                            />
                            <button
                              onClick={(e) => toggleWatchlist(e, event.slug)}
                              className={`p-1 border border-slate-150 rounded-md transition ${
                                isWatched
                                  ? 'bg-amber-50 border-amber-200 text-amber-500'
                                  : 'bg-slate-50 text-slate-400 hover:text-slate-600'
                              }`}
                            >
                              <Star className={`w-3 h-3 ${isWatched ? 'fill-current' : ''}`} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 4. Curated Future Highlights */}
            <section className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Award className="w-4 h-4 text-purple-500" />
                  Curated Future Highlights
                </h2>
                <span className="text-xs text-slate-400 font-medium">Long-Term curated</span>
              </div>

              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                {curatedFutureHighlights.map((event) => {
                  const isWatched = watchlistSlugs.includes(event.slug);
                  return (
                    <div 
                      key={event.id}
                      className="flex flex-col justify-between p-4 bg-white border border-slate-150 hover:border-slate-350 rounded-xl shadow-xs hover:shadow transition duration-200 group"
                    >
                      <Link href={`/event/${event.slug}`} className="space-y-2 block">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold text-purple-600 bg-purple-50 uppercase tracking-wider border border-purple-100/50">
                          {event.category}
                        </span>
                        <h4 className="text-sm font-bold text-slate-800 leading-snug group-hover:text-blue-600 transition truncate-2-lines">
                          {event.title}
                        </h4>
                      </Link>

                      <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-50">
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>{formatCountdown(event.timelineDate)}</span>
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-800 mr-1">
                            {event.probability <= 1 ? '<1%' : `${event.probability}%`}
                          </span>
                          <AddToCalendar
                            title={event.title}
                            timelineDate={event.timelineDate}
                            category={event.category}
                            probability={event.probability}
                            slug={event.slug}
                            description={event.description}
                            variant="compact"
                          />
                          <button
                            onClick={(e) => toggleWatchlist(e, event.slug)}
                            className={`p-1 border border-slate-150 rounded-md transition ${
                              isWatched
                                ? 'bg-amber-50 border-amber-200 text-amber-500'
                                : 'bg-slate-50 text-slate-400 hover:text-slate-600'
                            }`}
                          >
                            <Star className={`w-3 h-3 ${isWatched ? 'fill-current' : ''}`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

          </div>
        )}

        {/* ================= EXPLORE & ADVANCED SEARCH TAB ================= */}
        {activeTab === 'explore' && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* Header info */}
            <div className="border-b border-slate-100 pb-5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                <Compass className="w-6 h-6 text-blue-500" />
                Discovery Engine
              </h1>
              <p className="text-slate-400 text-xs mt-1">
                Explore the complete, paginated prediction market universe. Search, filter, and sort all active outcomes.
              </p>
            </div>

            {/* 1. Deep Search Input Spotlight Bar */}
            <div className="relative">
              <div className="flex items-center gap-3 px-4 py-3.5 bg-white border border-slate-200 rounded-xl shadow-xs focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all duration-200">
                <Search className="w-5 h-5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Query the full market universe (e.g., Trump, Bitcoin, inflation, NHL)..."
                  className="w-full text-sm text-slate-800 bg-transparent border-0 outline-none ring-0 placeholder-slate-400 focus:ring-0 focus:outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {isSearching && (
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
                )}
                {searchQuery && !isSearching && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* 2. Advanced Filters Control panel */}
            <div className="bg-white border border-slate-150 rounded-2xl p-5 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-widest">
                  <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                  Advanced Filter Options
                </div>
                {(selectedCategory !== 'All' || sortBy !== 'ending-soonest' || filterHighVolume || filterTrending || filterEndingSoon || dateRange !== 'all' || searchQuery !== '') && (
                  <button
                    onClick={() => {
                      setSelectedCategory('All');
                      setSortBy('ending-soonest');
                      setFilterHighVolume(false);
                      setFilterTrending(false);
                      setFilterEndingSoon(false);
                      setDateRange('all');
                      setSearchQuery('');
                    }}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider"
                  >
                    Reset Filters
                  </button>
                )}
              </div>

              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 text-xs">
                {/* Category selectors */}
                <div className="space-y-2">
                  <span className="font-bold text-slate-500 block">Category Focus</span>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:border-slate-300"
                  >
                    {['All', 'Politics', 'Sports', 'Crypto', 'AI', 'Economy', 'Entertainment'].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Sort selector */}
                <div className="space-y-2">
                  <span className="font-bold text-slate-500 block">Sort Orders</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:border-slate-300"
                  >
                    <option value="ending-soonest">Ending Soonest (Timeline)</option>
                    <option value="highest-volume">Highest Volume (Trading Size)</option>
                    <option value="most-active">Most Active (Trending/Hot)</option>
                    <option value="recently-added">Recently Added (Newest)</option>
                    <option value="long-term">Long-Term resolutions first</option>
                  </select>
                </div>

                {/* Date range filters */}
                <div className="space-y-2">
                  <span className="font-bold text-slate-500 block">Market Close Target</span>
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value as DateFilterOption)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:border-slate-300"
                  >
                    <option value="all">All dates (Complete universe)</option>
                    <option value="today-tomorrow">Ending in 48 hours (Imminent)</option>
                    <option value="this-month">Ending this month (Near-term)</option>
                    <option value="long-term">Ending in &gt; 30 days (Future)</option>
                  </select>
                </div>
              </div>

              {/* Quick checks filter switches */}
              <div className="flex flex-wrap gap-2.5 pt-3 border-t border-slate-50">
                <button
                  onClick={() => setFilterHighVolume(!filterHighVolume)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                    filterHighVolume
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-slate-50 text-slate-500 hover:text-slate-800 border-slate-200/50'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5 inline mr-1.5" />
                  High Volume (&gt; $100k)
                </button>

                <button
                  onClick={() => setFilterTrending(!filterTrending)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                    filterTrending
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-slate-50 text-slate-500 hover:text-slate-800 border-slate-200/50'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 inline mr-1.5" />
                  Trending Hot
                </button>

                <button
                  onClick={() => setFilterEndingSoon(!filterEndingSoon)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                    filterEndingSoon
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-slate-50 text-slate-500 hover:text-slate-800 border-slate-200/50'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 inline mr-1.5" />
                  Ending within 48 Hours
                </button>
              </div>
            </div>

            {/* 3. Render Grid Output */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Showing {filteredAndSortedExploreEvents.length} Active Market Resolutions
                </h2>
              </div>

              {filteredAndSortedExploreEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-slate-200 rounded-2xl bg-white">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-3">
                    <Layers className="w-6 h-6 text-slate-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-600">No predictions matching filters</h3>
                  <p className="text-xs text-slate-400 mt-1">Try relaxing some filters or changing your search terms.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {filteredAndSortedExploreEvents.map((event) => {
                    const isWatched = watchlistSlugs.includes(event.slug);
                    return (
                      <div 
                        key={event.id}
                        className="flex flex-col justify-between p-4 bg-white border border-slate-100 hover:border-slate-200 rounded-xl shadow-xs hover:shadow transition duration-200 group"
                      >
                        <Link href={`/event/${event.slug}`} className="block space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold text-slate-500 bg-slate-100 uppercase tracking-wider border border-slate-200/50">
                              {event.category}
                            </span>
                            <span className="text-[9px] font-mono text-slate-300">#{event.id}</span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-800 leading-snug group-hover:text-blue-600 transition truncate-2-lines">
                            {event.title}
                          </h4>
                        </Link>

                        <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-50">
                          <div className="flex flex-col text-[10px] text-slate-400 font-mono gap-0.5">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {formatCountdown(event.timelineDate)}
                            </span>
                            <span className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3 text-slate-400" />
                              ${event.volume.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-xs font-bold text-slate-800 mr-0.5">
                              {event.probability <= 1 ? '<1%' : `${event.probability}%`}
                            </span>
                            <AddToCalendar
                              title={event.title}
                              timelineDate={event.timelineDate}
                              category={event.category}
                              probability={event.probability}
                              slug={event.slug}
                              description={event.description}
                              variant="compact"
                            />
                            <button
                              onClick={(e) => toggleWatchlist(e, event.slug)}
                              className={`p-1 border rounded-md transition ${
                                isWatched
                                  ? 'bg-amber-50 border-amber-200 text-amber-500'
                                  : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600'
                              }`}
                            >
                              <Star className={`w-3 h-3 ${isWatched ? 'fill-current' : ''}`} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= WATCHLIST TAB ================= */}
        {activeTab === 'watchlist' && (
          <div className="py-6 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-5 mb-8">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                  <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
                  Your Watchlist
                </h1>
                <p className="text-slate-400 text-xs mt-1">
                  Local-only watchlist. No account, no keys, 100% private tracking.
                </p>
              </div>
              <button 
                onClick={() => setActiveTab('curated')} 
                className="mt-3 md:mt-0 text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                Back to Curated Timeline <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {watchlistEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center mb-3">
                  <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
                </div>
                <h3 className="text-sm font-semibold text-slate-700">Your Watchlist is Empty</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Start tracking predictions by clicking the star icons on the homepage timeline or detail pages.
                </p>
                <button
                  onClick={() => setActiveTab('curated')}
                  className="mt-5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
                >
                  Browse Curated Timeline
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {watchlistEvents.map((event) => (
                  <div 
                    key={event.id}
                    className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:border-slate-200 shadow-sm hover:shadow transition group"
                  >
                    <Link href={`/event/${event.slug}`} className="flex items-center gap-3 min-w-0 pr-4 flex-1">
                      <img
                        src={event.image}
                        alt={event.title}
                        className="w-12 h-12 rounded-lg object-cover bg-slate-50 shrink-0 border border-slate-100"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=100&auto=format&fit=crop&q=60';
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{event.category}</span>
                        <h3 className="text-sm font-bold text-slate-800 truncate group-hover:text-blue-600 transition leading-snug">
                          {event.title}
                        </h3>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 font-mono">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatCountdown(event.timelineDate)}
                          </span>
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5" />
                            ${event.volume.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      </div>
                    </Link>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right mr-1">
                        <div className="text-base font-extrabold text-slate-800">
                          {event.probability <= 1 ? '<1%' : `${event.probability}%`}
                        </div>
                        <div className="text-[9px] text-slate-400 uppercase tracking-widest">chance</div>
                      </div>
                      
                      <AddToCalendar
                        title={event.title}
                        timelineDate={event.timelineDate}
                        category={event.category}
                        probability={event.probability}
                        slug={event.slug}
                        description={event.description}
                        variant="compact"
                      />

                      <button
                        onClick={(e) => toggleWatchlist(e, event.slug)}
                        className="p-1.5 bg-slate-50 hover:bg-rose-50 text-amber-400 hover:text-rose-600 rounded-lg border border-slate-100 transition"
                        title="Remove from Watchlist"
                      >
                        <Star className="w-4 h-4 fill-current" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Spotlight command palette modal search overlay */}
      <CommandPalette 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
      />

      {/* Premium Footer */}
      <footer className="bg-slate-50 border-t border-slate-100 py-10 mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <Logo size="md" iconOnly={false} />
          
          <p className="text-[11px] text-slate-400 text-center md:text-right max-w-md font-sans">
            PolyCalendar is an independent project built using public, read-only Polymarket APIs. Prediction markets contain high volatility and information changes rapidly. All timestamps and consensus estimations are dynamic.
          </p>
        </div>
      </footer>
    </div>
  );
}
