import React from 'react';
import { Metadata } from 'next';
import { getTimelineEvents } from '../../services/polymarket';
import CalendarClient from './CalendarClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Resolution Calendar | PolyCalendar',
  description: 'Browse Polymarket prediction resolutions grouped by month and year. Stay ahead of major upcoming milestones in politics, economics, technology, and science.',
};

export default async function Page() {
  // Fetch active chronological events
  const events = await getTimelineEvents();

  return (
    <CalendarClient initialEvents={events} />
  );
}
