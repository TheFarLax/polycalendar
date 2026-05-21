'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Calendar, 
  Clock, 
  TrendingUp, 
  Star, 
  ArrowLeft, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink,
  BookOpen,
  Info,
  TrendingDown,
  Activity,
  Layers,
  Search,
  Compass
} from 'lucide-react';
import { NormalizedEvent } from '../types/polymarket';
import { formatCountdown } from '../services/polymarket';
import Logo from './Logo';
import AddToCalendar from './AddToCalendar';
import CommandPalette from './CommandPalette';

interface EventDetailProps {
  event: NormalizedEvent;
  relatedEvents: NormalizedEvent[];
}

export default function EventDetail({ event, relatedEvents }: EventDetailProps) {
  const router = useRouter();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [watchlistSlugs, setWatchlistSlugs] = useState<string[]>([]);
  const [isTechnicalExpanded, setIsTechnicalExpanded] = useState(false);
  const [isCriteriaExpanded, setIsCriteriaExpanded] = useState(true);
  
  // Custom Live Countdown states
  const [timeRemaining, setTimeRemaining] = useState('');

  // Load Watchlist
  useEffect(() => {
    try {
      const stored = localStorage.getItem('polycalendar_watchlist');
      if (stored) {
        setWatchlistSlugs(JSON.parse(stored));
      }
    } catch (e) {}
  }, []);

  // Update Countdown Live
  useEffect(() => {
    const updateTime = () => {
      setTimeRemaining(formatCountdown(event.timelineDate));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [event.timelineDate]);

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

  const toggleWatchlist = () => {
    let updated = [...watchlistSlugs];
    if (watchlistSlugs.includes(event.slug)) {
      updated = updated.filter(s => s !== event.slug);
    } else {
      updated.push(event.slug);
    }
    setWatchlistSlugs(updated);
    localStorage.setItem('polycalendar_watchlist', JSON.stringify(updated));
  };

  const isWatched = watchlistSlugs.includes(event.slug);

  // Parse outcomes and prices for sub-markets
  const getMarketOutcomes = (market: any) => {
    let outcomes: string[] = ['Yes', 'No'];
    let prices: number[] = [0.5, 0.5];

    try {
      if (typeof market.outcomes === 'string') {
        outcomes = JSON.parse(market.outcomes);
      } else if (Array.isArray(market.outcomes)) {
        outcomes = market.outcomes;
      }
    } catch (e) {}

    try {
      if (typeof market.outcomePrices === 'string') {
        prices = JSON.parse(market.outcomePrices).map((p: string) => parseFloat(p));
      } else if (Array.isArray(market.outcomePrices)) {
        prices = market.outcomePrices.map((p: any) => parseFloat(p));
      }
    } catch (e) {}

    return { outcomes, prices };
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Navbar */}
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
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Detail Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 space-y-10 animate-fadeIn">
        {/* Back Link */}
        <div>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to previous page
          </button>
        </div>

        {/* Hero Section */}
        <section className="relative overflow-hidden bg-white border border-slate-150 rounded-2xl p-6 md:p-8 shadow-sm">
          {/* Subtle Accent Glow */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-blue-50/30 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

          <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
            {/* Left Block: Image & Basic Info */}
            <div className="flex items-start gap-4 flex-1">
              <img
                src={event.image}
                alt={event.title}
                className="w-16 h-16 md:w-24 md:h-24 rounded-xl object-cover bg-slate-50 border border-slate-100 shrink-0 shadow-sm"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=200&auto=format&fit=crop&q=60';
                }}
              />
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold text-blue-600 bg-blue-50/50 uppercase tracking-wider border border-blue-100/50">
                    {event.category}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Event ID: #{event.id}</span>
                </div>
                <h1 className="text-xl md:text-3xl font-extrabold text-slate-800 leading-tight">
                  {event.title}
                </h1>
                <p className="text-slate-400 text-xs flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Total Volume: ${event.volume.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </p>
              </div>
            </div>

            {/* Right Block: Star, Countdown and Giant Probability */}
            <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-4 w-full md:w-auto border-t md:border-t-0 border-slate-100 pt-4 md:pt-0 shrink-0">
              
              <div className="text-left md:text-right">
                <span className="text-4xl md:text-6xl font-black text-slate-800 tracking-tight block">
                  {event.probability <= 1 ? '<1%' : `${event.probability}%`}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 block">
                  Consensus Probability
                </span>
              </div>

              {/* Giant Countdown Clock */}
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg text-xs font-semibold font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  {timeRemaining}
                </div>

                {/* Add to Calendar */}
                <AddToCalendar
                  title={event.title}
                  timelineDate={event.timelineDate}
                  category={event.category}
                  probability={event.probability}
                  slug={event.slug}
                  description={event.description}
                  variant="premium"
                />

                {/* Watch Button */}
                <button
                  onClick={toggleWatchlist}
                  className={`p-2 border rounded-lg transition ${
                    isWatched
                      ? 'bg-amber-50 border-amber-200 text-amber-500 hover:bg-amber-100'
                      : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600'
                  }`}
                  title={isWatched ? 'Remove from Watchlist' : 'Add to Watchlist'}
                >
                  <Star className={`w-4 h-4 ${isWatched ? 'fill-current' : ''}`} />
                </button>
              </div>

            </div>
          </div>
        </section>

        {/* Two Column Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          
          {/* Main Column - Left (2/3) */}
          <div className="md:col-span-2 space-y-8">
            
            {/* Resolution Criteria Box */}
            {event.description && (
              <section className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm space-y-4">
                <button
                  onClick={() => setIsCriteriaExpanded(!isCriteriaExpanded)}
                  className="w-full flex items-center justify-between text-slate-800 font-bold text-sm uppercase tracking-wider"
                >
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-500" />
                    Resolution Criteria
                  </span>
                  {isCriteriaExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {isCriteriaExpanded && (
                  <div className="text-xs text-slate-600 leading-relaxed space-y-2 border-t border-slate-50 pt-4">
                    <div className="prose prose-sm max-w-none text-slate-600" dangerouslySetInnerHTML={{ __html: event.description }} />
                  </div>
                )}
              </section>
            )}

            {/* Markets / subcontracts list */}
            <section className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-500" />
                Active Market Outcomes ({event.markets?.length || 0})
              </h3>

              <div className="space-y-4">
                {event.markets?.map((market, idx) => {
                  const { outcomes, prices } = getMarketOutcomes(market);
                  const isYesNo = outcomes.length === 2 && outcomes[0] === 'Yes' && outcomes[1] === 'No';

                  return (
                    <div 
                      key={market.id} 
                      className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4 group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <span className="text-[9px] font-mono text-slate-400">Outcome Contract #{idx + 1} ({market.id})</span>
                          <h4 className="text-sm font-bold text-slate-800 leading-snug">
                            {market.question}
                          </h4>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0 font-mono bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">
                          Vol: ${Number(market.volume || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </span>
                      </div>

                      {/* Pricing outcomes bar */}
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        {outcomes.map((outcome, oIdx) => {
                          const price = prices[oIdx] !== undefined ? prices[oIdx] : 0.5;
                          const percent = Math.round(price * 100);

                          return (
                            <div 
                              key={outcome} 
                              className={`p-3 border rounded-xl flex items-center justify-between transition ${
                                isYesNo && oIdx === 0 && percent >= 70 ? 'bg-emerald-50/30 border-emerald-100/50' :
                                isYesNo && oIdx === 0 && percent <= 30 ? 'bg-rose-50/30 border-rose-100/50' :
                                'bg-slate-50/30 border-slate-100/50'
                              }`}
                            >
                              <div className="flex flex-col">
                                <span className="text-xs font-semibold text-slate-500">{outcome}</span>
                                <span className="text-[10px] text-slate-400 mt-0.5">price</span>
                              </div>
                              <span className={`text-base font-extrabold ${
                                isYesNo && oIdx === 0 && percent >= 70 ? 'text-emerald-600' :
                                isYesNo && oIdx === 0 && percent <= 30 ? 'text-rose-600' :
                                'text-slate-800'
                              }`}>
                                {percent <= 1 ? '<1%' : `${percent}%`}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Advanced tech details accordion */}
                      <div className="border-t border-slate-50 pt-3">
                        <button
                          onClick={() => setIsTechnicalExpanded(!isTechnicalExpanded)}
                          className="text-[10px] font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 transition"
                        >
                          <Info className="w-3 h-3" />
                          {isTechnicalExpanded ? 'Hide Advanced Data' : 'Show Advanced Developer Data'}
                        </button>

                        {isTechnicalExpanded && (
                          <div className="mt-3 bg-slate-50 rounded-lg p-3 text-[10px] font-mono text-slate-500 space-y-2 border border-slate-100 animate-slideDown overflow-x-auto">
                            <div><span className="text-slate-400">Condition ID:</span> {market.conditionId}</div>
                            {market.clobTokenIds && (
                              <div><span className="text-slate-400">CLOB Token IDs:</span> {market.clobTokenIds}</div>
                            )}
                            <div><span className="text-slate-400">End Date (ISO):</span> {market.endDate}</div>
                            <div><span className="text-slate-400">Liquidity Depth:</span> ${parseFloat(market.liquidity || '0').toLocaleString('en-US')}</div>
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            </section>

          </div>

          {/* Sidebar Column - Right (1/3) */}
          <div className="space-y-8">
            
            {/* Quick Analytics Card */}
            <section className="bg-slate-50/50 border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" />
                Market Stats
              </h3>
              
              <div className="space-y-3.5 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-150">
                  <span className="text-slate-500">Status</span>
                  <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[10px] border border-emerald-100">
                    Active
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-150">
                  <span className="text-slate-500">Total Volume</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    ${event.volume.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-150">
                  <span className="text-slate-500">Market End Date</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(event.timelineDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-500">Consensus Source</span>
                  <span className="font-semibold text-slate-800 truncate max-w-[130px]" title="Polymarket Oracle (UMA)">
                    Polymarket Oracle
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 italic mt-3.5 leading-relaxed">
                * Note: Final contract resolution and payout settlement may occur after market close.
              </p>
            </section>

            {/* Related/Trending Events list */}
            <section className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Compass className="w-4 h-4 text-blue-500" />
                Trending Discoveries
              </h3>

              <div className="space-y-3">
                {relatedEvents.slice(0, 3).map((rel) => (
                  <Link
                    href={`/event/${rel.slug}`}
                    key={rel.id}
                    className="block p-3 bg-white border border-slate-100 hover:border-slate-200 rounded-xl shadow-xs transition duration-150 group"
                  >
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">{rel.category}</span>
                    <h4 className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition leading-snug truncate mt-1">
                      {rel.title}
                    </h4>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 font-mono">
                      <span>{formatCountdown(rel.timelineDate)} left</span>
                      <span className="text-slate-700 font-bold">{rel.probability <= 1 ? '<1%' : `${rel.probability}%`}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

          </div>

        </div>

      </main>

      {/* Global Command Palette */}
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
