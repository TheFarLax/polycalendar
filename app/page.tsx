import React from 'react';
import { Metadata } from 'next';
import { getTimelineEvents, getHotEvents } from '../services/polymarket';
import Dashboard from '../components/Dashboard';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'PolyCalendar | Prediction Markets, Organized by Time',
  description: 'Follow curated, high-signal prediction market resolutions on Polymarket. Track upcoming events, ending timelines, hot volumes, and long-term highlights with simple chronological clarity.',
  openGraph: {
    title: 'PolyCalendar | Prediction Markets, Organized by Time',
    description: 'Follow curated, high-signal prediction market resolutions on Polymarket. Track upcoming events, ending timelines, hot volumes, and long-term highlights with simple chronological clarity.',
    type: 'website',
  },
};

export default async function Page() {
  // Fetch high-signal curated event pipelines on the server
  const [timelineEvents, hotEvents] = await Promise.all([
    getTimelineEvents(),
    getHotEvents(),
  ]);

  return (
    <Dashboard 
      initialTimelineEvents={timelineEvents} 
      initialHotEvents={hotEvents} 
    />
  );
}
