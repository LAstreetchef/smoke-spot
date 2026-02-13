'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const searchParams = useSearchParams()
  const referralCode = searchParams.get('ref')
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('handleSignup called', { email, username, password: password.length })
    setLoading(true)
    setMessage(null)

    // Validate username
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setMessage({ type: 'error', text: 'Username must be 3-20 characters (letters, numbers, underscores)' })
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' })
      setLoading(false)
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          username,
          referred_by: referralCode || null,
        },
      },
    })

    console.log('signUp result:', { data, error })

    if (error) {
      setMessage({ type: 'error', text: error.message })
      setLoading(false)
    } else {
      // Auto-login after signup (since email confirmation is disabled)
      setMessage({ type: 'success', text: 'Account created! Logging you in...' })
      // Redirect to app after short delay
      setTimeout(() => {
        window.location.href = '/app'
      }, 1000)
    }
  }

  const handleGoogleSignup = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?signup=true${referralCode ? `&ref=${referralCode}` : ''}`,
      },
    })
    if (error) {
      setMessage({ type: 'error', text: error.message })
      setLoading(false)
    }
  }

  return (
    <>
      {referralCode && (
        <div className="bg-accent/20 text-accent p-3 rounded-lg mb-6 text-sm text-center">
          🎉 You were referred! You&apos;ll both earn rewards.
        </div>
      )}

      {message && (
        <div className={`p-4 rounded-lg mb-6 ${
          message.type === 'success' ? 'bg-success/20 text-success' : 'bg-accent/20 text-accent'
        }`}>
          {message.text}
        </div>
      )}

      {/* Google OAuth */}
      <button
        onClick={handleGoogleSignup}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-gray-800 rounded-lg font-medium hover:bg-neutral transition disabled:opacity-50"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </button>

      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-neutral/20" />
        <span className="text-neutral/50 text-sm">or</span>
        <div className="flex-1 h-px bg-neutral/20" />
      </div>

      {/* Email/Password signup */}
      <form onSubmit={handleSignup}>
        <label className="block text-neutral/70 text-sm mb-2">Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="smokey_joe"
          required
          className="w-full px-4 py-3 bg-primary border border-neutral/20 rounded-lg text-neutral placeholder:text-neutral/40 focus:outline-none focus:border-accent transition mb-4"
        />

        <label className="block text-neutral/70 text-sm mb-2">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className="w-full px-4 py-3 bg-primary border border-neutral/20 rounded-lg text-neutral placeholder:text-neutral/40 focus:outline-none focus:border-accent transition mb-4"
        />

        <label className="block text-neutral/70 text-sm mb-2">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          className="w-full px-4 py-3 bg-primary border border-neutral/20 rounded-lg text-neutral placeholder:text-neutral/40 focus:outline-none focus:border-accent transition mb-4"
        />

        <button
          type="submit"
          disabled={loading}
          onClick={() => console.log('Button clicked!')}
          className="w-full px-4 py-3 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition disabled:opacity-50"
        >
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>
      </form>

      <p className="text-neutral/50 text-xs text-center mt-4">
        By signing up, you agree to our Terms of Service and Privacy Policy
      </p>
    </>
  )
}

export default function SignupPage() {
  return (
    <main className="min-h-screen relative flex items-end sm:items-center justify-center px-4 pb-8 sm:pb-0">
      {/* Background image - guy POV perspective */}
      <div className="absolute inset-0">
        <img src="/bg-guy-v2.png" alt="" className="w-full h-full object-cover object-bottom" />
          
          
        
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/70 to-primary/40" />
      </div>
      
      <div className="relative w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center mb-4 sm:mb-8">
          <img src="/logo.png" alt="Smoke Spot" className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl shadow-lg shadow-accent/50 animate-pulse" />
        </Link>

        {/* Card */}
        <div className="bg-secondary/60 backdrop-blur-sm rounded-2xl p-5 sm:p-8 border border-neutral/10">
          <h1 className="font-display text-xl sm:text-2xl font-bold text-neutral text-center mb-1 sm:mb-2">
            Create Account
          </h1>
          <p className="text-neutral/60 text-center mb-4 sm:mb-6 text-sm sm:text-base">
            Join the community of smokers finding the best spots
          </p>

          <Suspense fallback={<div className="text-neutral/50 text-center py-4">Loading...</div>}>
            <SignupForm />
          </Suspense>
        </div>

        {/* Login link */}
        <p className="text-center text-neutral/60 mt-4 sm:mt-6 text-sm sm:text-base">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-accent hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  )
}
