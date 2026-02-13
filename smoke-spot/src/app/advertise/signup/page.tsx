'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast'

const BUSINESS_TYPES = [
  { value: 'smoke_shop', label: 'Smoke Shop', emoji: '🚬' },
  { value: 'dispensary', label: 'Dispensary', emoji: '🌿' },
  { value: 'bar', label: 'Bar', emoji: '🍺' },
  { value: 'lounge', label: 'Lounge', emoji: '🛋️' },
  { value: 'restaurant', label: 'Restaurant', emoji: '🍽️' },
  { value: 'vape_shop', label: 'Vape Shop', emoji: '💨' },
  { value: 'brand', label: 'Brand', emoji: '™️' },
  { value: 'other', label: 'Other', emoji: '🏪' },
]

function SignupContent() {
  const router = useRouter()
  const { showToast } = useToast()
  const searchParams = useSearchParams()
  const referralCode = searchParams.get('ref')
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    business_name: '',
    business_type: 'smoke_shop',
    website_url: '',
    logo_url: '',
  })

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUser(user)
      // Check if already an advertiser
      const { data: advertisers } = await supabase
        .from('advertisers')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)

      if (advertisers && advertisers.length > 0) {
        router.push('/advertise/dashboard')
      }
    }
  }

  const handleSubmit = async () => {
    console.log('handleSubmit called', { user, formData })
    
    if (!user) {
      console.log('No user, redirecting to login')
      router.push(`/auth/login?redirect=/advertise/signup`)
      return
    }

    if (!formData.business_name) {
      showToast('Please enter your business name', 'error')
      return
    }

    console.log('Starting advertiser creation...')
    setLoading(true)

    // Use RPC function to bypass RLS issues
    console.log('Calling create_advertiser RPC...')
    const { data: advertiserId, error } = await supabase.rpc('create_advertiser', {
      p_user_id: user.id,
      p_business_name: formData.business_name,
      p_business_type: formData.business_type,
      p_logo_url: formData.logo_url || null,
      p_website_url: formData.website_url || null,
    })
    console.log('RPC result:', { advertiserId, error })

    if (error) {
      console.error('Error creating advertiser:', error)
      showToast('Failed to create advertiser account', 'error')
      setLoading(false)
      return
    }

    // Track referral if present
    if (referralCode && advertiserId) {
      // Find affiliate by referral code
      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('id')
        .eq('referral_code', referralCode)
        .single()

      if (affiliate) {
        // Create referral record
        await supabase.from('referrals').insert({
          affiliate_id: affiliate.id,
          advertiser_id: advertiserId,
          status: 'confirmed',
        })

        // Update advertiser with referral code
        await supabase
          .from('advertisers')
          .update({ referred_by_code: referralCode })
          .eq('id', advertiserId)
      }
    }

    console.log('Redirecting to dashboard...')
    router.push('/advertise/dashboard')
  }

  return (
    <main className="min-h-screen bg-primary relative">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <img src="/bg-guy.png" alt="" className="w-full h-full object-cover object-bottom opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/95 to-primary/80" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-neutral/10 px-4 py-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <Link href="/advertise" className="flex items-center gap-2">
            <span className="text-2xl">🚬</span>
            <span className="font-display text-lg font-bold text-neutral">Smoke Spot</span>
          </Link>
          {!user && (
            <Link href="/auth/login?redirect=/advertise/signup" className="text-accent text-sm hover:underline">
              Log In
            </Link>
          )}
        </div>
      </header>

      <div className="relative z-10 max-w-xl mx-auto px-4 py-12">
        <h1 className="font-display text-3xl font-bold text-neutral text-center mb-2">
          Become an Advertiser
        </h1>
        <p className="text-neutral/60 text-center mb-8">
          Start reaching smokers in your area
        </p>

        {referralCode && (
          <div className="bg-accent/20 text-accent p-3 rounded-xl mb-6 text-sm text-center">
            🎉 You were referred! The referrer will earn a commission on your ad spend.
          </div>
        )}

        {!user ? (
          <div className="bg-secondary rounded-2xl p-8 border border-neutral/10 text-center">
            <div className="text-5xl mb-4">👤</div>
            <h2 className="font-display text-xl font-bold text-neutral mb-2">
              Sign In Required
            </h2>
            <p className="text-neutral/60 mb-6">
              You need an account to become an advertiser
            </p>
            <Link
              href={`/auth/signup?redirect=/advertise/signup${referralCode ? `&ref=${referralCode}` : ''}`}
              className="inline-block px-6 py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 transition"
            >
              Create Account
            </Link>
            <p className="text-neutral/50 text-sm mt-4">
              Already have an account?{' '}
              <Link href={`/auth/login?redirect=/advertise/signup`} className="text-accent hover:underline">
                Log in
              </Link>
            </p>
          </div>
        ) : (
          <div className="bg-secondary rounded-2xl p-6 border border-neutral/10">
            {/* Business Name */}
            <div className="mb-6">
              <label className="block text-neutral/70 text-sm mb-2">Business Name *</label>
              <input
                type="text"
                value={formData.business_name}
                onChange={(e) => setFormData(prev => ({ ...prev, business_name: e.target.value }))}
                placeholder="e.g., Cloud 9 Smoke Shop"
                className="w-full px-4 py-3 bg-primary border border-neutral/20 rounded-xl text-neutral placeholder:text-neutral/40 focus:outline-none focus:border-accent"
              />
            </div>

            {/* Business Type */}
            <div className="mb-6">
              <label className="block text-neutral/70 text-sm mb-2">Business Type *</label>
              <div className="grid grid-cols-4 gap-2">
                {BUSINESS_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setFormData(prev => ({ ...prev, business_type: type.value }))}
                    className={`p-3 rounded-xl text-center transition ${
                      formData.business_type === type.value
                        ? 'bg-accent text-white'
                        : 'bg-primary/50 border border-neutral/20 text-neutral/70 hover:border-accent'
                    }`}
                  >
                    <div className="text-xl mb-1">{type.emoji}</div>
                    <div className="text-xs">{type.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Website */}
            <div className="mb-6">
              <label className="block text-neutral/70 text-sm mb-2">Website (optional)</label>
              <input
                type="url"
                value={formData.website_url}
                onChange={(e) => setFormData(prev => ({ ...prev, website_url: e.target.value }))}
                placeholder="https://your-business.com"
                className="w-full px-4 py-3 bg-primary border border-neutral/20 rounded-xl text-neutral placeholder:text-neutral/40 focus:outline-none focus:border-accent"
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={loading || !formData.business_name}
              className="w-full py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 transition disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Create Advertiser Account'}
            </button>

            <p className="text-neutral/50 text-xs text-center mt-4">
              By signing up, you agree to our Advertiser Terms of Service
            </p>
          </div>
        )}
      </div>
    </main>
  )
}


export default function AdvertiserSignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-primary flex items-center justify-center"><div className="text-neutral">Loading...</div></div>}>
      <SignupContent />
    </Suspense>
  )
}
