import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/share/[code] - Resolve a short code
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const supabase = await createClient()

    const { data: share, error } = await supabase
      .from('nfc_shares')
      .select('*')
      .eq('short_code', code)
      .single()

    if (error || !share) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 })
    }

    return NextResponse.json({ share })
  } catch (error) {
    console.error('Share resolve error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/share/[code] - Increment scan count
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('increment_share_scans', { 
      share_code: code 
    })

    // Fallback if RPC doesn't exist
    if (error?.code === '42883') {
      // Function doesn't exist, do manual update
      const { data: share } = await supabase
        .from('nfc_shares')
        .select('scans')
        .eq('short_code', code)
        .single()

      if (share) {
        await supabase
          .from('nfc_shares')
          .update({ scans: (share.scans || 0) + 1 })
          .eq('short_code', code)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Share scan error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
