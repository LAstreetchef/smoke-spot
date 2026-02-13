'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function ConnectContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [status, setStatus] = useState('Reconnecting to Stripe...')

  useEffect(() => {
    handleConnect()
  }, [])

  const handleConnect = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/auth/login?redirect=/affiliate/dashboard')
      return
    }

    // If refresh=true, need to regenerate the onboarding link
    if (searchParams.get('refresh') === 'true') {
      try {
        const response = await fetch('/api/affiliate/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            email: user.email,
          }),
        })

        const data = await response.json()
        if (data.url) {
          window.location.href = data.url
        } else {
          setStatus('Error reconnecting. Redirecting to dashboard...')
          setTimeout(() => router.push('/affiliate/dashboard'), 2000)
        }
      } catch (error) {
        setStatus('Error reconnecting. Redirecting to dashboard...')
        setTimeout(() => router.push('/affiliate/dashboard'), 2000)
      }
    } else {
      router.push('/affiliate/dashboard')
    }
  }

  return (
    <div className="text-center">
      <div className="text-4xl mb-4">🔄</div>
      <p className="text-neutral/60">{status}</p>
    </div>
  )
}

export default function AffiliateConnect() {
  return (
    <main className="min-h-screen bg-primary flex items-center justify-center">
      <Suspense fallback={<div className="text-neutral/50">Loading...</div>}>
        <ConnectContent />
      </Suspense>
    </main>
  )
}
