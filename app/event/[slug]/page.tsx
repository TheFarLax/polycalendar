import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Compass } from 'lucide-react';
import { getEventBySlug, getHotEvents } from '../../../services/polymarket';
import EventDetail from '../../../components/EventDetail';

export const dynamic = 'force-dynamic';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  
  if (!event) {
    return {
      title: 'Event Not Found | PolyCalendar',
      description: 'The requested prediction market event could not be found or has resolved.',
    };
  }

  return {
    title: `${event.title} | PolyCalendar`,
    description: `Track the live countdown, resolution rules, and probability consensus (${event.probability}%) for "${event.title}". Organized chronologically on PolyCalendar.`,
    openGraph: {
      title: `${event.title} | PolyCalendar`,
      description: `Track the live countdown, resolution rules, and probability consensus (${event.probability}%) for "${event.title}". Organized chronologically on PolyCalendar.`,
      images: [{ url: event.image }],
    },
  };
}

export default async function Page({ params }: { params: Params }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  // If the event does not exist, show a premium editorial 404 page
  if (!event) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-md w-full bg-white border border-slate-100 rounded-2xl p-8 shadow-sm space-y-6">
          <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto">
            <Compass className="w-6 h-6 text-rose-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-slate-800">Event Not Found</h1>
            <p className="text-slate-400 text-xs leading-relaxed">
              We couldn't retrieve the prediction event details for this slug. It may have expired, resolved, or is temporarily unavailable.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

  // Fetch related events for the sidebar
  const relatedEvents = await getHotEvents();

  return (
    <EventDetail 
      event={event} 
      relatedEvents={relatedEvents} 
    />
  );
}
