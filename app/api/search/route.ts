import { NextResponse } from 'next/server';
import { searchEvents } from '../../../services/polymarket';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    
    if (!query.trim()) {
      return NextResponse.json([]);
    }
    
    const results = await searchEvents(query);
    return NextResponse.json(results);
  } catch (error) {
    console.error('[CORS Proxy Error] Search proxy query failed:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
