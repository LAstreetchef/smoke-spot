import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Generate 6-character short code
function generateShortCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// POST /api/share - Create a new share link
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { share_type, payload_id } = body

    if (!share_type || !payload_id) {
      return NextResponse.json({ error: 'Missing share_type or payload_id' }, { status: 400 })
    }

    // Generate unique short code
    let short_code = generateShortCode()
    let attempts = 0
    
    while (attempts < 5) {
      const { data: existing } = await supabase
        .from('nfc_shares')
        .select('id')
        .eq('short_code', short_code)
        .single()

      if (!existing) break
      short_code = generateShortCode()
      attempts++
    }

    // Create share record
    const { data, error } = await supabase
      .from('nfc_shares')
      .insert({
        sender_user_id: user.id,
        share_type,
        payload_id,
        short_code,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating share:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/s/${short_code}`

    return NextResponse.json({
      short_code,
      share_url: shareUrl,
      share: data,
    })
  } catch (error) {
    console.error('Share API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
