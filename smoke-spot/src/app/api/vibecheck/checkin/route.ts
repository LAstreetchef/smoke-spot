import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/vibecheck/checkin - Check in a player to a vibe session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { spot_id, name, vibe_key, vibe_name, vibe_emoji, lat, lng } = body

    if (!spot_id || !name || !vibe_key || !vibe_name || !vibe_emoji || lat == null || lng == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Generate session_code: first 6 alphanumeric chars of spot_id, uppercased
    const session_code = spot_id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()

    const supabase = await createClient()
    const now = new Date().toISOString()

    // Insert the player
    const { data: player, error: insertError } = await supabase
      .from('vc_players')
      .insert({
        name,
        vibe_key,
        vibe_name,
        vibe_emoji,
        lat,
        lng,
        spot_id,
        session_code,
        last_seen: now,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Error inserting player:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Query other active players at this spot (last_seen within 30 minutes)
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()

    const { data: nearbyPlayers, error: queryError } = await supabase
      .from('vc_players')
      .select('id')
      .eq('spot_id', spot_id)
      .gt('last_seen', thirtyMinAgo)
      .neq('id', player.id)

    if (queryError) {
      console.error('Error querying nearby players:', queryError)
      return NextResponse.json({ error: queryError.message }, { status: 500 })
    }

    return NextResponse.json({
      player_id: player.id,
      session_code,
      nearby_count: nearbyPlayers?.length ?? 0,
    })
  } catch (error) {
    console.error('Vibecheck checkin error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
