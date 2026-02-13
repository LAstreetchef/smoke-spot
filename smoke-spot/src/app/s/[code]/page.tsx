import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ code: string }>
}

export default async function ShareRedirectPage({ params }: PageProps) {
  const { code } = await params
  const supabase = await createClient()

  // Look up the share
  const { data: share, error } = await supabase
    .from('nfc_shares')
    .select('*')
    .eq('short_code', code)
    .single()

  if (error || !share) {
    notFound()
  }

  // Increment scan count
  await supabase
    .from('nfc_shares')
    .update({ scans: (share.scans || 0) + 1 })
    .eq('short_code', code)

  // Redirect based on share type
  if (share.share_type === 'spot') {
    redirect(`/app/spot/${share.payload_id}`)
  } else if (share.share_type === 'profile') {
    redirect(`/app/profile/${share.payload_id}`)
  } else {
    redirect('/app')
  }
}
