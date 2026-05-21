export interface PolymarketMarket {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  description: string;
  outcomes: string; // JSON string of outcomes, e.g. '["Yes", "No"]'
  outcomePrices: string; // JSON string of prices, e.g. '["0.52", "0.48"]'
  volume: string;
  active: boolean;
  closed: boolean;
  endDate: string;
  liquidity: string;
  lastTradePrice?: number;
  bestBid?: number;
  bestAsk?: number;
  clobTokenIds?: string;
}

export interface PolymarketTag {
  id: string;
  label: string;
  slug: string;
}

export interface PolymarketEvent {
  id: string;
  title: string;
  ticker: string;
  slug: string;
  description: string;
  image: string;
  icon: string;
  active: boolean;
  closed: boolean;
  endDate: string;
  volume: number;
  markets: PolymarketMarket[];
  tags?: PolymarketTag[];
}

export interface NormalizedEvent {
  id: string;
  title: string;
  slug: string;
  category: string;
  timelineDate: string;
  volume: number;
  probability: number; // 0 to 100 percentage
  image: string;
  description: string;
  active: boolean;
  closed: boolean;
  eventId?: string;
  markets?: PolymarketMarket[];
  isDemo?: boolean;
}
