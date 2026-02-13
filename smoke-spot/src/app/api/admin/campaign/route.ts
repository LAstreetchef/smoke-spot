import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = 'kammiceli@gmail.com'

export async function POST(request: NextRequest) {
  // Verify admin
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Create admin client inside function for proper env access
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { campaignId, action } = await request.json()

  if (!campaignId || !action) {
    return NextResponse.json({ error: 'Missing campaignId or action' }, { status: 400 })
  }

  let newStatus: string
  switch (action) {
    case 'pause':
      newStatus = 'paused'
      break
    case 'activate':
      newStatus = 'active'
      break
    case 'draft':
      newStatus = 'draft'
      break
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const { data, error } = await adminSupabase
    .from('ad_campaigns')
    .update({ status: newStatus })
    .eq('id', campaignId)
    .select()

  if (error) {
    console.error('Admin campaign update error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log('Campaign updated:', campaignId, 'to', newStatus, data)
  return NextResponse.json({ success: true, status: newStatus })
}
