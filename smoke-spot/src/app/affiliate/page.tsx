'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AffiliateLanding() {
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  return (
    <main className="min-h-screen bg-primary relative">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <img src="/bg-guy-v2.png" alt="" className="w-full h-full object-cover object-top opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/40 via-primary/90 to-primary" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-neutral/10 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Smoke Spot" className="w-8 h-8 rounded-lg shadow-md shadow-accent/30 animate-pulse" />
            <span className="font-display text-xl font-bold text-neutral">Smoke Spot</span>
          </Link>
          {user ? (
            <Link href="/affiliate/dashboard" className="text-accent hover:underline">
              Dashboard →
            </Link>
          ) : (
            <Link href="/auth/login?redirect=/affiliate/dashboard" className="text-accent hover:underline">
              Log In
            </Link>
          )}
        </div>
      </header>

      {/* Hero */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="text-6xl mb-6">💰</div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-neutral mb-4">
            Earn Money Referring<br />Local Businesses
          </h1>
          <p className="text-xl text-neutral/60 max-w-2xl mx-auto mb-8">
            Know a smoke shop, dispensary, or lounge that could use more customers? 
            Refer them to advertise on Smoke Spot and earn <span className="text-success font-bold">15% commission</span> on every ad purchase.
          </p>
          <Link
            href={user ? "/affiliate/dashboard" : "/auth/signup?redirect=/affiliate/dashboard"}
            className="inline-block px-8 py-4 bg-accent text-white text-lg font-semibold rounded-full hover:bg-accent/90 transition"
          >
            {user ? "Go to Dashboard" : "Become an Affiliate"}
          </Link>
        </div>

        {/* How it works */}
        <div className="mb-16">
          <h2 className="font-display text-2xl font-bold text-neutral text-center mb-8">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                1
              </div>
              <h3 className="font-bold text-neutral mb-2">Get Your Link</h3>
              <p className="text-neutral/60">
                Sign up and get a unique referral link to share with businesses.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                2
              </div>
              <h3 className="font-bold text-neutral mb-2">Refer Businesses</h3>
              <p className="text-neutral/60">
                Share your link with local smoke shops, dispensaries, bars, and lounges.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                3
              </div>
              <h3 className="font-bold text-neutral mb-2">Get Paid</h3>
              <p className="text-neutral/60">
                Earn 15% of every ad purchase they make. Paid directly to your bank.
              </p>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="bg-secondary rounded-2xl p-8 border border-neutral/10">
          <h2 className="font-display text-2xl font-bold text-neutral mb-6">
            Why Join?
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <span className="text-success text-xl">✓</span>
              <div>
                <p className="text-neutral font-medium">15% Lifetime Commission</p>
                <p className="text-neutral/60 text-sm">Earn on every purchase your referrals make, forever.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-success text-xl">✓</span>
              <div>
                <p className="text-neutral font-medium">Instant Payouts</p>
                <p className="text-neutral/60 text-sm">Get paid directly to your bank via Stripe.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-success text-xl">✓</span>
              <div>
                <p className="text-neutral font-medium">Easy Dashboard</p>
                <p className="text-neutral/60 text-sm">Track referrals, earnings, and payouts in real-time.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-success text-xl">✓</span>
              <div>
                <p className="text-neutral font-medium">No Minimum Payout</p>
                <p className="text-neutral/60 text-sm">Withdraw your earnings anytime.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="border-t border-neutral/10 py-12">
        <div className="text-center">
          <Link
            href={user ? "/affiliate/dashboard" : "/auth/signup?redirect=/affiliate/dashboard"}
            className="inline-block px-8 py-4 bg-accent text-white text-lg font-semibold rounded-full hover:bg-accent/90 transition"
          >
            Start Earning Today
          </Link>
        </div>
      </div>
    </main>
  )
}
