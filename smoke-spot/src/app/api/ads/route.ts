import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/ads - Get ads for a location
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const latStr = searchParams.get('lat')
    const lngStr = searchParams.get('lng')
    const lat = latStr !== null ? parseFloat(latStr) : NaN
    const lng = lngStr !== null ? parseFloat(lngStr) : NaN

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ error: 'Missing or invalid lat/lng' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get active campaigns with a bounding-box pre-filter to reduce rows scanned.
    // A 1-degree latitude ~= 111km, 1-degree longitude varies by latitude.
    // We use a generous bounding box (max target_radius_km assumed <= 200km).
    const BOX_DEGREES = 2 // ~222km in latitude
    const { data: campaigns, error } = await supabase
      .from('ad_campaigns')
      .select(`
        *,
        advertiser:advertisers(
          business_name,
          logo_url
        )
      `)
      .eq('status', 'active')
      .gte('end_date', new Date().toISOString())
      .lte('start_date', new Date().toISOString())
      .gte('target_center_lat', lat - BOX_DEGREES)
      .lte('target_center_lat', lat + BOX_DEGREES)
      .gte('target_center_lng', lng - BOX_DEGREES)
      .lte('target_center_lng', lng + BOX_DEGREES)

    if (error) {
      console.error('Error fetching ads:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Filter by distance (simple Haversine approximation)
    const filteredCampaigns = (campaigns || []).filter(campaign => {
      const distance = getDistanceKm(
        lat, lng,
        campaign.target_center_lat,
        campaign.target_center_lng
      )
      return distance <= campaign.target_radius_km
    })

    // Sort by CPM (higher paying ads first)
    filteredCampaigns.sort((a, b) => b.cpm_cents - a.cpm_cents)

    // Separate by ad type
    const ads = {
      sponsored_pins: filteredCampaigns
        .filter(c => c.ad_type === 'sponsored_pin')
        .slice(0, 5)
        .map(c => ({
          id: c.id,
          name: c.advertiser?.business_name || 'Sponsored',
          logo_url: c.advertiser?.logo_url,
          click_url: c.click_url,
          latitude: c.target_center_lat,
          longitude: c.target_center_lng,
        })),
      featured_spots: filteredCampaigns
        .filter(c => c.ad_type === 'featured_spot')
        .slice(0, 3),
      banners: filteredCampaigns
        .filter(c => c.ad_type === 'banner')
        .slice(0, 5)  // Return up to 5 banners for rotation
        .map(c => ({
          id: c.id,
          creative_url: c.creative_url,
          click_url: c.click_url,
          name: c.advertiser?.business_name,
        })),
      // Fire Sales - time-limited flash deals (show only the most relevant one)
      fire_sale: filteredCampaigns
        .filter(c => c.ad_type === 'fire_sale')
        .slice(0, 1)  // Only show one fire sale at a time
        .map(c => ({
          id: c.id,
          name: c.name,
          deal_text: (c as any).deal_text || c.name,
          creative_url: c.creative_url,
          click_url: c.click_url,
          end_date: c.end_date,
          advertiser: c.advertiser,
        }))[0] || null,
    }

    return NextResponse.json(ads)
  } catch (error) {
    console.error('Ads API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/ads - Log impression or click
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { campaign_id, event_type, latitude, longitude } = body

    if (!campaign_id || !event_type) {
      return NextResponse.json({ error: 'Missing campaign_id or event_type' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Log the event
    const { error } = await supabase.from('ad_events').insert({
      campaign_id,
      event_type,
      user_id: user?.id || null,
      latitude: latitude || null,
      longitude: longitude || null,
    })

    if (error) {
      console.error('Error logging ad event:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Update campaign spent amount if impression — use atomic increment
    // to prevent race conditions under concurrent requests.
    if (event_type === 'impression') {
      const { data: campaign } = await supabase
        .from('ad_campaigns')
        .select('cpm_cents, budget_cents, spent_cents')
        .eq('id', campaign_id)
        .single()

      if (campaign) {
        const incrementCents = Math.ceil(campaign.cpm_cents / 1000)
        const newSpent = (campaign.spent_cents || 0) + incrementCents

        // Use conditional update: match current spent_cents to prevent lost updates.
        // If another request updated spent_cents between our read and write,
        // no rows match and we accept the slight under-count (better than over-spend).
        const updateData: Record<string, unknown> = { spent_cents: newSpent }
        if (newSpent >= campaign.budget_cents) {
          updateData.status = 'completed'
        }

        await supabase
          .from('ad_campaigns')
          .update(updateData)
          .eq('id', campaign_id)
          .eq('spent_cents', campaign.spent_cents || 0)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Ad event error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Haversine formula for distance
function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}
