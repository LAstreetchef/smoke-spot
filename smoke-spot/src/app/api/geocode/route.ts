// Server-side geocoding to avoid CORS issues
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q');
  
  if (!query) {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 });
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Maps API not configured' }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`
    );
    const data = await res.json();

    if (data.status === 'OK' && data.results?.[0]) {
      const { lat, lng } = data.results[0].geometry.location;
      const formatted = data.results[0].formatted_address;
      return NextResponse.json({ lat, lng, address: formatted });
    }

    return NextResponse.json({ error: 'Location not found' }, { status: 404 });
  } catch (err) {
    console.error('Geocoding error:', err);
    return NextResponse.json({ error: 'Geocoding failed' }, { status: 500 });
  }
}
