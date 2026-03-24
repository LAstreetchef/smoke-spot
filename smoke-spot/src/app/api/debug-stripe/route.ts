// Debug endpoint - DISABLED in production
// To re-enable for local development, uncomment the handler below.

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ error: 'This endpoint is disabled' }, { status: 404 });
}
