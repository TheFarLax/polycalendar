import { PolymarketEvent, NormalizedEvent, PolymarketMarket } from '../types/polymarket';

const GAMMA_API_URL = 'https://gamma-api.polymarket.com';

/**
 * Normalizes a Polymarket Event to the clean NormalizedEvent structure required by the UI.
 */
export function normalizeEvent(event: PolymarketEvent): NormalizedEvent {
  // Extract category from first tag
  const category = event.tags?.[0]?.label || 'General';

  // Discard nested contract objects, unused metadata, and extract the probability
  let probability = 50; // Default fallback
  
  if (event.markets && event.markets.length > 0) {
    // Look at the first/primary market
    const market = event.markets[0] as any;
    
    let prices: number[] = [];
    try {
      if (typeof market.outcomePrices === 'string') {
        prices = JSON.parse(market.outcomePrices).map((p: string) => parseFloat(p));
      } else if (Array.isArray(market.outcomePrices)) {
        prices = market.outcomePrices.map((p: any) => parseFloat(p));
      }
    } catch (e) {}

    let outcomesArr: string[] = [];
    try {
      if (typeof market.outcomes === 'string') {
        outcomesArr = JSON.parse(market.outcomes);
      } else if (Array.isArray(market.outcomes)) {
        outcomesArr = market.outcomes;
      }
    } catch (e) {}

    // Find the price of the 'Yes' outcome, if it exists
    const yesIndex = outcomesArr.findIndex(o => o?.toLowerCase() === 'yes');
    if (yesIndex !== -1 && prices[yesIndex] !== undefined) {
      probability = Math.round(prices[yesIndex] * 100);
    } else if (prices[0] !== undefined) {
      probability = Math.round(prices[0] * 100);
    } else if (market.lastTradePrice !== undefined) {
      probability = Math.round(market.lastTradePrice * 100);
    }
  }

  // Gracefully clamp/format probability values
  if (probability > 99) probability = 99;
  if (probability < 1) probability = 1;

  // Derive canonical timelineDate from the nearest active nested market endDate
  let timelineDate = event.endDate;
  
  if (event.markets && event.markets.length > 0) {
    const validMarketDates = event.markets
      .filter(m => m.active !== false && !m.closed && m.endDate)
      .map(m => new Date(m.endDate).getTime())
      .filter(t => !isNaN(t) && t > Date.now() - 60 * 60 * 1000);
      
    if (validMarketDates.length > 0) {
      const nearestMarketEnd = Math.min(...validMarketDates);
      timelineDate = new Date(nearestMarketEnd).toISOString();
    }
  }

  return {
    id: event.id,
    title: event.title,
    slug: event.slug,
    category,
    timelineDate,
    volume: Number(event.volume || 0),
    probability,
    image: event.image || event.icon || 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=500&auto=format&fit=crop&q=60',
    description: event.description || '',
    active: event.active !== false,
    closed: event.closed === true,
    markets: event.markets || [],
  };
}

/**
 * Normalizes a Polymarket Market to the clean NormalizedEvent structure required by the UI.
 */
export function normalizeMarket(market: PolymarketMarket): NormalizedEvent {
  // Extract category or tags
  const category = (market as any).category || 'General';

  // Discard nested contract objects, unused metadata, and extract the probability
  let probability = 50; // Default fallback
  
  let prices: number[] = [];
  try {
    if (typeof market.outcomePrices === 'string') {
      prices = JSON.parse(market.outcomePrices).map((p: string) => parseFloat(p));
    } else if (Array.isArray(market.outcomePrices as any)) {
      prices = (market.outcomePrices as any).map((p: any) => parseFloat(p));
    }
  } catch (e) {}

  let outcomesArr: string[] = [];
  try {
    if (typeof market.outcomes === 'string') {
      outcomesArr = JSON.parse(market.outcomes);
    } else if (Array.isArray(market.outcomes as any)) {
      outcomesArr = market.outcomes as any;
    }
  } catch (e) {}

  // Find the price of the 'Yes' outcome, if it exists
  const yesIndex = outcomesArr.findIndex(o => o?.toLowerCase() === 'yes');
  if (yesIndex !== -1 && prices[yesIndex] !== undefined) {
    probability = Math.round(prices[yesIndex] * 100);
  } else if (prices[0] !== undefined) {
    probability = Math.round(prices[0] * 100);
  } else if (market.lastTradePrice !== undefined) {
    probability = Math.round(market.lastTradePrice * 100);
  }

  // Gracefully clamp/format probability values
  if (probability > 99) probability = 99;
  if (probability < 1) probability = 1;

  // Fallback category visual assets
  const fallbackImages: { [key: string]: string } = {
    politics: 'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=500&auto=format&fit=crop&q=60',
    sports: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=500&auto=format&fit=crop&q=60',
    crypto: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=500&auto=format&fit=crop&q=60',
    pop: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=60',
    science: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=500&auto=format&fit=crop&q=60',
    business: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=500&auto=format&fit=crop&q=60',
  };

  const catLower = category.toLowerCase();
  const matchedKey = Object.keys(fallbackImages).find(k => catLower.includes(k));
  const image = (market as any).image || (market as any).icon || (matchedKey ? fallbackImages[matchedKey] : 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=500&auto=format&fit=crop&q=60');

  return {
    id: market.id,
    title: market.question,
    slug: market.slug,
    category,
    timelineDate: market.endDate,
    volume: Number(market.volume || 0),
    probability,
    image,
    description: market.description || '',
    active: market.active !== false,
    closed: market.closed === true,
    eventId: (market as any).eventId || undefined,
  };
}

/**
 * Safely normalizes nested search markets inside parent event wrappers.
 */
export function normalizeSearchResult(market: any, parentEvent: any): NormalizedEvent {
  // Extract category or tag from parent or market tags
  let category = 'General';
  if (parentEvent && Array.isArray(parentEvent.tags) && parentEvent.tags.length > 0) {
    category = parentEvent.tags[0].label || 'General';
  } else if (parentEvent && parentEvent.category) {
    category = parentEvent.category;
  } else if (market.category) {
    category = market.category;
  }

  // Extract probability safely
  let probability = 50;
  let prices: number[] = [];
  try {
    const rawPrices = market.outcomePrices;
    if (typeof rawPrices === 'string') {
      prices = JSON.parse(rawPrices).map((p: string) => parseFloat(p));
    } else if (Array.isArray(rawPrices)) {
      prices = rawPrices.map((p: any) => parseFloat(p));
    }
  } catch (e) {}

  let outcomesArr: string[] = [];
  try {
    const rawOutcomes = market.outcomes;
    if (typeof rawOutcomes === 'string') {
      outcomesArr = JSON.parse(rawOutcomes);
    } else if (Array.isArray(rawOutcomes)) {
      outcomesArr = rawOutcomes;
    }
  } catch (e) {}

  const yesIndex = outcomesArr.findIndex(o => o?.toLowerCase() === 'yes');
  if (yesIndex !== -1 && prices[yesIndex] !== undefined) {
    probability = Math.round(prices[yesIndex] * 100);
  } else if (prices[0] !== undefined) {
    probability = Math.round(prices[0] * 100);
  } else if (market.lastTradePrice !== undefined) {
    probability = Math.round(market.lastTradePrice * 100);
  }

  if (probability > 99) probability = 99;
  if (probability < 1) probability = 1;

  // Fallback category visual assets
  const fallbackImages: { [key: string]: string } = {
    politics: 'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=500&auto=format&fit=crop&q=60',
    sports: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=500&auto=format&fit=crop&q=60',
    crypto: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=500&auto=format&fit=crop&q=60',
    pop: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=60',
    science: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=500&auto=format&fit=crop&q=60',
    business: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=500&auto=format&fit=crop&q=60',
  };

  const catLower = category.toLowerCase();
  const matchedKey = Object.keys(fallbackImages).find(k => catLower.includes(k));
  
  const image = market.image || market.icon || 
                (parentEvent && (parentEvent.image || parentEvent.icon)) || 
                (matchedKey ? fallbackImages[matchedKey] : 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=500&auto=format&fit=crop&q=60');

  // Build the clean unified structure, strictly using endDate as timelineDate
  return {
    id: market.id,
    title: market.question || '',
    slug: market.slug || '',
    category,
    timelineDate: market.endDate || '',
    volume: Number(market.volume || 0),
    probability,
    image,
    description: market.description || '',
    active: market.active !== false,
    closed: market.closed === true,
    eventId: parentEvent?.id || undefined,
  };
}

/**
 * Pipeline A: Imminent Timeline Fetch (Resolving soonest).
 * Fetches Page 1 (offset=0, limit=100) and Page 2 (offset=100, limit=100) of canonical active markets.
 * Normalizes immediately to free memory, filters using 1h tolerance, and sorts chronologically.
 */
export async function getTimelineEvents(): Promise<NormalizedEvent[]> {
  try {
    const urls = [
      `${GAMMA_API_URL}/markets?active=true&closed=false&order=end_date&ascending=true&limit=100&offset=0`,
      `${GAMMA_API_URL}/markets?active=true&closed=false&order=end_date&ascending=true&limit=100&offset=100`
    ];

    const datasets = await Promise.all(
      urls.map(async (url, idx) => {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) {
          console.error(`[PolyCalendar Debug] Timeline page ${idx} failed:`, res.statusText);
          return [];
        }
        try {
          const rawMarkets = await res.json() as PolymarketMarket[];
          // Normalize immediately to clear raw nested objects from memory
          return rawMarkets.map(normalizeMarket);
        } catch (e) {
          console.error(`[PolyCalendar Debug] Failed to parse page ${idx} JSON:`, e);
          return [];
        }
      })
    );

    // Merge and de-duplicate normalized events by ID
    const mergedNormalized = datasets.flat();
    const uniqueMap = new Map<string, NormalizedEvent>();
    mergedNormalized.forEach(e => {
      if (e && e.id) uniqueMap.set(e.id, e);
    });

    const uniqueNormalized = Array.from(uniqueMap.values());

    // Extremely tolerant timestamp comparison (markets ending after 1 hour ago)
    const toleranceTime = Date.now() - 60 * 60 * 1000;
    const filtered = uniqueNormalized.filter(event => {
      const end = new Date(event.timelineDate).getTime();
      return (
        event.active === true &&
        !event.closed &&
        !isNaN(end) &&
        end > toleranceTime
      );
    });

    // Dynamic strict local sorting: nearest resolution first
    return filtered.sort((a, b) => new Date(a.timelineDate).getTime() - new Date(b.timelineDate).getTime());
  } catch (error) {
    console.error('Error fetching timeline events:', error);
    console.warn('[PolyCalendar] Polymarket API cluster unreachable. Falling back to dynamic High-Fidelity Mock Timeline Events.');
    return generateMockEvents().sort((a, b) => new Date(a.timelineDate).getTime() - new Date(b.timelineDate).getTime());
  }
}

/**
 * Pipeline B: Separate Hot/Trending Markets Fetch.
 * Fetches only the top 50 active events (offset=0, limit=50) sorted by 24h volume.
 * Disables file-caching to eliminate Next.js data-cache size issues.
 */
export async function getHotEvents(): Promise<NormalizedEvent[]> {
  try {
    const url = `${GAMMA_API_URL}/events?active=true&closed=false&order=volume_24hr&ascending=false&limit=50&offset=0`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      console.error('[PolyCalendar Debug] Hot events fetch failed:', res.statusText);
      return [];
    }
    
    const rawEvents = await res.json() as PolymarketEvent[];
    const normalized = rawEvents.map(normalizeEvent);
    
    const toleranceTime = Date.now() - 60 * 60 * 1000;
    const filtered = normalized.filter(event => {
      const end = new Date(event.timelineDate).getTime();
      return (
        event.active === true &&
        !event.closed &&
        !isNaN(end) &&
        end > toleranceTime
      );
    });

    // Sort by volume descending for Trending list
    return filtered.sort((a, b) => b.volume - a.volume);
  } catch (error) {
    console.error('Error fetching hot events:', error);
    console.warn('[PolyCalendar] Polymarket API cluster unreachable. Falling back to dynamic High-Fidelity Mock Trending Events.');
    return generateMockEvents().sort((a, b) => b.volume - a.volume);
  }
}

/**
 * Global Search: Queries the official Polymarket Search Endpoint directly.
 * Disables caching to optimize deep search execution speed.
 */
export async function searchEvents(query: string): Promise<NormalizedEvent[]> {
  if (!query.trim()) return [];
  try {
    const url = `${GAMMA_API_URL}/public-search?q=${encodeURIComponent(query)}&limit_per_type=100`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Polymarket public-search API failed: ${res.statusText}`);

    const data = await res.json();
    
    // Extract nested markets from the search events containers
    const rawEvents = (data.events || []) as any[];
    
    // Debugging step requested by user: Log the full structure of the first raw search result
    if (rawEvents.length > 0) {
      console.log("[PolyCalendar Search Debug] Raw public-search Event payload:", JSON.stringify(rawEvents[0], null, 2));
    }

    const normalized: NormalizedEvent[] = [];
    rawEvents.forEach(evt => {
      if (evt && Array.isArray(evt.markets)) {
        evt.markets.forEach((m: any) => {
          normalized.push(normalizeSearchResult(m, evt));
        });
      }
    });

    // Apply basic active status and 1-hour timezone grace tolerance buffer
    const toleranceTime = Date.now() - 60 * 60 * 1000;
    const filtered = normalized.filter(m => {
      const end = new Date(m.timelineDate).getTime();
      return (
        m.active === true &&
        !m.closed &&
        !isNaN(end) &&
        end > toleranceTime
      );
    });

    // Deduplicate results by ID just in case the API returned duplicates
    const uniqueMap = new Map<string, NormalizedEvent>();
    filtered.forEach(item => {
      if (item && item.id) uniqueMap.set(item.id, item);
    });
    const deduplicated = Array.from(uniqueMap.values());

    // Lightly sort by timelineDate to prioritize chronological urgency while fully respecting API's relevance ranking
    return deduplicated.sort((a, b) => {
      // Prioritize sooner-ending deadlines if they share high relevance
      const aTime = new Date(a.timelineDate).getTime();
      const bTime = new Date(b.timelineDate).getTime();
      if (!isNaN(aTime) && !isNaN(bTime) && Math.abs(aTime - bTime) > 0) {
        return aTime - bTime;
      }
      return b.volume - a.volume;
    });
  } catch (error) {
    console.error('Error searching markets via public-search:', error);
    console.warn('[PolyCalendar] Polymarket API cluster unreachable. Searching local High-Fidelity Mock Events.');
    const mocks = generateMockEvents();
    const lower = query.toLowerCase();
    return mocks.filter(m => m.title.toLowerCase().includes(lower) || m.category.toLowerCase().includes(lower));
  }
}

export async function getEventBySlug(slug: string): Promise<NormalizedEvent | null> {
  try {
    // 1. Try to fetch as a direct market first (market-native routing)
    const marketRes = await fetch(
      `${GAMMA_API_URL}/markets?slug=${encodeURIComponent(slug)}`,
      { cache: 'no-store' }
    );
    
    if (marketRes.ok) {
      const marketData = await marketRes.json() as any[];
      if (marketData && marketData.length > 0) {
        const marketObj = marketData[0];
        
        // If the market is associated with a parent event container, resolve it to show the full event timeline page
        if (marketObj.events && marketObj.events.length > 0) {
          const parentEvent = marketObj.events[0];
          const eventRes = await fetch(
            `${GAMMA_API_URL}/events?slug=${encodeURIComponent(parentEvent.slug)}`,
            { cache: 'no-store' }
          );
          if (eventRes.ok) {
            const eventData = await eventRes.json();
            if (eventData && eventData.length > 0) {
              return normalizeEvent(eventData[0]);
            }
          }
        }
        // Fallback: Normalize the market directly if no event container exists
        return normalizeMarket(marketObj);
      }
    }

    // 2. Direct fallback to fetching as an event container slug
    const res = await fetch(
      `${GAMMA_API_URL}/events?slug=${encodeURIComponent(slug)}`,
      { cache: 'no-store' }
    );
    if (!res.ok) throw new Error(`Failed to fetch event with slug: ${slug}`);
    const data: PolymarketEvent[] = await res.json();
    
    if (!data || data.length === 0) return null;
    return normalizeEvent(data[0]);
  } catch (error) {
    console.error(`Error fetching event or market by slug ${slug}:`, error);
    console.warn('[PolyCalendar] Polymarket API cluster unreachable. Attempting to resolve via local High-Fidelity Mock Events.');
    const mocks = generateMockEvents();
    const found = mocks.find(m => m.slug === slug);
    return found || null;
  }
}

/**
 * Custom countdown formatting rules:
 * - Under 30 days: "4d 12h"
 * - Between 30–365 days: "Jun 2026"
 * - Over 365 days: "Resolves Nov 2028"
 */
export function formatCountdown(timelineDateStr: string): string {
  const end = new Date(timelineDateStr);
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();

  if (diffMs <= 0) {
    return 'Resolving...';
  }

  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 30) {
    const days = Math.floor(diffDays);
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days}d ${hours}h`;
  } else if (diffDays <= 365) {
    return end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } else {
    return `Resolves ${end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
  }
}

/**
 * Generates highly realistic, dynamic mock data when the Polymarket API is unreachable (ConnectTimeoutError/blocked).
 * Calculates absolute dates relative to local system time so they never expire or look stale.
 */
export function generateMockEvents(): NormalizedEvent[] {
  const now = new Date();
  
  // Dynamic day calculators
  const getRelativeTime = (hoursOffset: number) => new Date(Date.now() + hoursOffset * 60 * 60 * 1000).toISOString();
  
  // Saturday calculator
  const satOffset = (6 - now.getDay() + 7) % 7;
  const satDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (satOffset === 0 ? 7 : satOffset), 19, 0, 0);
  
  // Sunday calculator
  const sunOffset = (0 - now.getDay() + 7) % 7;
  const sunDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (sunOffset === 0 ? 7 : sunOffset), 15, 30, 0);

  return [
    {
      id: "900001",
      title: "Will Ken Paxton win the 2026 Texas Republican Primary?",
      slug: "will-ken-paxton-win-2026-texas-primary",
      category: "Politics",
      timelineDate: getRelativeTime(96), // 4 days out
      volume: 4765610,
      probability: 95,
      image: "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=500&auto=format&fit=crop&q=60",
      description: "Resolves to Yes if Ken Paxton wins the Republican nomination in the 2026 Texas gubernatorial primary election.",
      active: true,
      closed: false,
      isDemo: true
    },
    {
      id: "900002",
      title: "Will SpaceX Starship launch successfully on Flight 5?",
      slug: "spacex-starship-flight-5-launch",
      category: "Science",
      timelineDate: getRelativeTime(2), // 2 hours from now (highly imminent!)
      volume: 385000,
      probability: 78,
      image: "https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=500&auto=format&fit=crop&q=60",
      description: "Resolves to Yes if Starship Flight 5 completes its target test flight metrics.",
      active: true,
      closed: false,
      isDemo: true
    },
    {
      id: "900003",
      title: "Will Bitcoin cross $95,000 today?",
      slug: "bitcoin-cross-95k-today",
      category: "Crypto",
      timelineDate: getRelativeTime(4), // 4 hours from now
      volume: 1240000,
      probability: 42,
      image: "https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=500&auto=format&fit=crop&q=60",
      description: "Resolves to Yes if BTC hits $95,000.00 at any point before midnight UTC today.",
      active: true,
      closed: false,
      isDemo: true
    },
    {
      id: "900004",
      title: "Will Chennai Super Kings win their next IPL Match?",
      slug: "csk-win-next-ipl-match-today",
      category: "Sports",
      timelineDate: getRelativeTime(6), // 6 hours from now (IPL game same-day!)
      volume: 580000,
      probability: 65,
      image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=500&auto=format&fit=crop&q=60",
      description: "Resolves to Yes if CSK wins their scheduled IPL match today.",
      active: true,
      closed: false,
      isDemo: true
    },
    {
      id: "900005",
      title: "Will OpenAI announce GPT-5 today?",
      slug: "openai-announcement-gpt5-today",
      category: "Tech",
      timelineDate: getRelativeTime(8), // 8 hours from now
      volume: 950000,
      probability: 18,
      image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60",
      description: "Resolves to Yes if OpenAI releases GPT-5 or announces its official launch today.",
      active: true,
      closed: false,
      isDemo: true
    },
    {
      id: "900006",
      title: "Will the S&P 500 close green today?",
      slug: "sp500-close-green-today",
      category: "Business",
      // Set to 6:00 PM local time today
      timelineDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0).toISOString(),
      volume: 1520000,
      probability: 68,
      image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=500&auto=format&fit=crop&q=60",
      description: "Resolves to Yes if the S&P 500 index closes above the previous day's close.",
      active: true,
      closed: false,
      isDemo: true
    },
    {
      id: "900007",
      title: "Will Donald Trump post on X before midnight local time?",
      slug: "trump-post-on-x-before-midnight",
      category: "Politics",
      // Set to 11:30 PM local time today
      timelineDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 30, 0).toISOString(),
      volume: 820000,
      probability: 35,
      image: "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=500&auto=format&fit=crop&q=60",
      description: "Resolves to Yes if Donald Trump makes a post on X (formerly Twitter) between now and midnight local time.",
      active: true,
      closed: false,
      isDemo: true
    },
    {
      id: "900008",
      title: "Will Real Madrid win their Champions League match this weekend?",
      slug: "real-madrid-win-cl-match-weekend",
      category: "Sports",
      timelineDate: satDate.toISOString(), // Saturday evening
      volume: 2450000,
      probability: 72,
      image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=500&auto=format&fit=crop&q=60",
      description: "Resolves to Yes if Real Madrid wins their scheduled European match this Saturday.",
      active: true,
      closed: false,
      isDemo: true
    },
    {
      id: "900009",
      title: "Will the US Senate pass the Crypto Regulation Bill this weekend?",
      slug: "us-senate-pass-crypto-bill-weekend",
      category: "Politics",
      timelineDate: sunDate.toISOString(), // Sunday afternoon
      volume: 980000,
      probability: 22,
      image: "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=500&auto=format&fit=crop&q=60",
      description: "Resolves to Yes if the US Senate passes the crypto framework legislation before Monday morning.",
      active: true,
      closed: false,
      isDemo: true
    },
    {
      id: "900010",
      title: "Will 'Deadpool 3' top the weekend box office?",
      slug: "deadpool-3-top-weekend-box-office",
      category: "Pop Culture",
      timelineDate: sunDate.toISOString(),
      volume: 310000,
      probability: 88,
      image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=60",
      description: "Resolves to Yes if Deadpool 3 is the #1 grossing movie in the US weekend box office chart.",
      active: true,
      closed: false,
      isDemo: true
    },
    {
      id: "900011",
      title: "Will Taylor Swift announce a new album in her next show?",
      slug: "taylor-swift-new-album-announcement",
      category: "Pop Culture",
      timelineDate: getRelativeTime(120), // 5 days out
      volume: 2100000,
      probability: 52,
      image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=60",
      description: "Resolves to Yes if Taylor Swift officially announces a new studio album at her next Eras Tour concert.",
      active: true,
      closed: false,
      isDemo: true
    },
    {
      id: "900012",
      title: "Will Bitcoin hit $100,000 by next Tuesday?",
      slug: "bitcoin-hit-100k-next-tuesday",
      category: "Crypto",
      timelineDate: getRelativeTime(144), // 6 days out
      volume: 12450000,
      probability: 14,
      image: "https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=500&auto=format&fit=crop&q=60",
      description: "Resolves to Yes if BTC reaches $100,000.00 at any point before next Tuesday.",
      active: true,
      closed: false,
      isDemo: true
    },
    {
      id: "900013",
      title: "Who will win the 2028 US Presidential Election?",
      slug: "who-will-win-2028-us-presidential-election",
      category: "Politics",
      timelineDate: new Date(2028, 10, 5, 23, 59, 59).toISOString(),
      volume: 85200000,
      probability: 48,
      image: "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=500&auto=format&fit=crop&q=60",
      description: "Resolves to the winner of the 2028 United States presidential election.",
      active: true,
      closed: false,
      isDemo: true
    },
    {
      id: "900014",
      title: "Will humans land on Mars before 2030?",
      slug: "human-mars-landing-before-2030",
      category: "Science",
      timelineDate: new Date(2029, 11, 31, 23, 59, 59).toISOString(),
      volume: 120000,
      probability: 8,
      image: "https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=500&auto=format&fit=crop&q=60",
      description: "Resolves to Yes if any spaceflight crew lands safely on Mars surface before Dec 31, 2029.",
      active: true,
      closed: false,
      isDemo: true
    },
    {
      id: "900015",
      title: "Will Apple announce an AR headset at WWDC 2027?",
      slug: "apple-ar-headset-wwdc-2027",
      category: "Tech",
      timelineDate: new Date(2027, 5, 7, 10, 0, 0).toISOString(),
      volume: 1400000,
      probability: 64,
      image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60",
      description: "Resolves to Yes if Apple officially presents a new AR/VR headset during the WWDC 2027 keynote.",
      active: true,
      closed: false,
      isDemo: true
    }
  ];
}

